'use client'

import React, { createContext, useContext, useState, useEffect, Suspense } from 'react'
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
  debouncedQuery: string
  setQuery: (query: string) => void
  results: SearchResult[]
  isSearching: boolean
}

const SearchContext = createContext<SearchContextType | undefined>(undefined)

function SearchProviderInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  
  const [query, setQueryState] = useState(searchParams.get('q') || '')
  const [debouncedQuery, setDebouncedQuery] = useState(query)
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const setQuery = (newQuery: string) => {
    setQueryState(newQuery)
  }

  // Sync debouncedQuery with query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 800) // Wait 800ms after last keystroke
    return () => clearTimeout(timer)
  }, [query])

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

  return (
    <SearchContext.Provider value={{ query, debouncedQuery, setQuery, results, isSearching }}>
      {children}
    </SearchContext.Provider>
  )
}

export function SearchProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <SearchProviderInner>
        {children}
      </SearchProviderInner>
    </Suspense>
  )
}


export function useSearch() {
  const context = useContext(SearchContext)
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider')
  }
  return context
}
