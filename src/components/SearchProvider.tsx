'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

  interface SearchResult {
    type: 'game' | 'player'
    id: string
    title: string
    subtitle: string
    image?: string
    status?: string
    href: string
  }
  
  interface SearchContextType {
    query: string
    setQuery: (query: string) => void
    results: SearchResult[]
    isSearching: boolean
  }
  
  const SearchContext = createContext<SearchContextType | undefined>(undefined)
  
  export function SearchProvider({ children }: { children: React.ReactNode }) {
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()
    
    const [query, setQueryState] = useState(searchParams.get('q') || '')
    const [results, setResults] = useState<SearchResult[]>([])
    const [isSearching, setIsSearching] = useState(false)
  
    const setQuery = (newQuery: string) => {
      setQueryState(newQuery)
    }

    // Debounce URL update to prevent focus loss and performance issues
    useEffect(() => {
      const timer = setTimeout(() => {
        const params = new URLSearchParams(searchParams)
        if (query) {
          params.set('q', query)
        } else {
          params.delete('q')
        }
        
        if (pathname === '/markets' && params.toString() !== searchParams.toString()) {
          router.replace(`${pathname}?${params.toString()}`, { scroll: false })
        }
      }, 500)
      return () => clearTimeout(timer)
    }, [query, pathname, router, searchParams])

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await response.json()
        setResults(data.results || [])
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  // Sync state with URL when it changes externally (e.g. back button)
  useEffect(() => {
    const q = searchParams.get('q') || ''
    if (q !== query) {
      setQueryState(q)
    }
  }, [searchParams])

  return (
    <SearchContext.Provider value={{ query, setQuery, results, isSearching }}>
      {children}
    </SearchContext.Provider>
  )
}

export function useSearch() {
  const context = useContext(SearchContext)
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider')
  }
  return context
}
