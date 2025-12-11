export interface City {
  id: string
  name: string
  shortName: string
  latitude: number
  longitude: number
  timezone: string
}

export const CITIES: City[] = [
  {
    id: 'nyc',
    name: 'New York City',
    shortName: 'NYC',
    latitude: 40.7128,
    longitude: -74.006,
    timezone: 'America/New_York',
  },
  {
    id: 'la',
    name: 'Los Angeles',
    shortName: 'LA',
    latitude: 34.0522,
    longitude: -118.2437,
    timezone: 'America/Los_Angeles',
  },
  {
    id: 'chicago',
    name: 'Chicago',
    shortName: 'CHI',
    latitude: 41.8781,
    longitude: -87.6298,
    timezone: 'America/Chicago',
  },
  {
    id: 'miami',
    name: 'Miami',
    shortName: 'MIA',
    latitude: 25.7617,
    longitude: -80.1918,
    timezone: 'America/New_York',
  },
  {
    id: 'denver',
    name: 'Denver',
    shortName: 'DEN',
    latitude: 39.7392,
    longitude: -104.9903,
    timezone: 'America/Denver',
  },
]
