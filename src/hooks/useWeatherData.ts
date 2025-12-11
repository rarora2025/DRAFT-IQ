'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { City, CITIES } from '@/lib/cities'

interface WeatherData {
  currentTemp: number
  dailyHigh: number
  dailyLow: number
  projectedHigh: number
  forecastHigh: number
  projectionHistory: { time: string; temp: number }[]
  lastUpdated: Date
}

interface CityWeatherState {
  [cityId: string]: WeatherData
}

function calculateLiveProjection(
  forecastHigh: number,
  currentTemp: number,
  currentHour: number,
  previousProjection: number
): number {
  const peakHour = 15
  const hoursUntilPeak = Math.max(0, peakHour - currentHour)
  const peakWeight = 1 - (hoursUntilPeak / 15)
  
  const overshoot = Math.max(0, currentTemp - forecastHigh)
  
  let baseProjection = forecastHigh + (overshoot * peakWeight)
  
  if (currentHour >= peakHour && currentTemp > forecastHigh) {
    baseProjection = Math.max(baseProjection, currentTemp)
  }
  
  const marketNoise = (Math.random() - 0.5) * 0.3
  baseProjection += marketNoise
  
  if (previousProjection > 0) {
    baseProjection = previousProjection * 0.85 + baseProjection * 0.15
  }
  
  return Math.round(baseProjection * 100) / 100
}

async function fetchWeatherForCity(city: City): Promise<WeatherData | null> {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&current=temperature_2m&hourly=temperature_2m&daily=temperature_2m_max,temperature_2m_min&timezone=${encodeURIComponent(city.timezone)}&forecast_days=1&temperature_unit=fahrenheit`
    )
    
    if (!response.ok) return null
    
    const data = await response.json()
    
    const currentTemp = data.current?.temperature_2m ?? 50
    const dailyHigh = data.daily?.temperature_2m_max?.[0] ?? currentTemp + 5
    const dailyLow = data.daily?.temperature_2m_min?.[0] ?? currentTemp - 5
    const forecastHigh = dailyHigh
    
    const currentHour = new Date().getHours()
    const initialProjection = calculateLiveProjection(forecastHigh, currentTemp, currentHour, 0)
    
    const now = new Date()
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })

    return {
      currentTemp,
      dailyHigh,
      dailyLow,
      forecastHigh,
      projectedHigh: initialProjection,
      projectionHistory: [{ time: timeStr, temp: initialProjection }],
      lastUpdated: new Date(),
    }
  } catch {
    return null
  }
}

export function useWeatherData(cityId: string) {
  const [weatherData, setWeatherData] = useState<CityWeatherState>({})
  const [loading, setLoading] = useState(true)
  const [selectedCity, setSelectedCity] = useState<City>(
    CITIES.find(c => c.id === cityId) ?? CITIES[0]
  )
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const simulationRef = useRef<NodeJS.Timeout | null>(null)

  const fetchAllCities = useCallback(async () => {
    const results: CityWeatherState = {}
    
    await Promise.all(
      CITIES.map(async (city) => {
        const data = await fetchWeatherForCity(city)
        if (data) {
          results[city.id] = data
        }
      })
    )
    
    setWeatherData(results)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAllCities()
    
    intervalRef.current = setInterval(fetchAllCities, 5 * 60 * 1000)
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchAllCities])

  useEffect(() => {
    simulationRef.current = setInterval(() => {
      setWeatherData(prev => {
        const updated = { ...prev }
        Object.keys(updated).forEach(cityId => {
          const cityData = updated[cityId]
          if (cityData) {
            const currentHour = new Date().getHours()
            
            const newProjection = calculateLiveProjection(
              cityData.forecastHigh,
              cityData.currentTemp,
              currentHour,
              cityData.projectedHigh
            )
            
            const now = new Date()
            const timeStr = now.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })
            
            const newHistory = [
              ...cityData.projectionHistory.slice(-29),
              { time: timeStr, temp: newProjection },
            ]
            
            updated[cityId] = {
              ...cityData,
              projectedHigh: newProjection,
              projectionHistory: newHistory,
            }
          }
        })
        return updated
      })
    }, 5000)
    
    return () => {
      if (simulationRef.current) clearInterval(simulationRef.current)
    }
  }, [])

  const currentData = weatherData[selectedCity.id]

  const changeCity = useCallback((newCityId: string) => {
    const city = CITIES.find(c => c.id === newCityId)
    if (city) setSelectedCity(city)
  }, [])

  return {
    city: selectedCity,
    cities: CITIES,
    temperature: currentData?.currentTemp ?? 50,
    dailyHigh: currentData?.dailyHigh ?? 55,
    dailyLow: currentData?.dailyLow ?? 45,
    projectedHigh: currentData?.projectedHigh ?? 55,
    forecastHigh: currentData?.forecastHigh ?? 55,
    history: currentData?.projectionHistory ?? [],
    loading,
    changeCity,
    allCitiesData: weatherData,
  }
}