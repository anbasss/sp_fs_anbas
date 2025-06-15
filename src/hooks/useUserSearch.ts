import { useState, useEffect } from 'react'
import { useDebounce } from './useDebounce'

export interface SearchUser {
  id: string
  email: string
}

export interface UserSearchResponse {
  success: boolean
  users: SearchUser[]
}

export function useUserSearch() {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<SearchUser[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setUsers([])
      return
    }

    const searchUsers = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(debouncedQuery)}`)
        
        if (!response.ok) {
          throw new Error('Failed to search users')
        }
        
        const data: UserSearchResponse = await response.json()
        setUsers(data.users)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        setUsers([])
      } finally {
        setIsLoading(false)
      }
    }

    searchUsers()
  }, [debouncedQuery])

  return {
    query,
    setQuery,
    users,
    isLoading,
    error,
    clearResults: () => {
      setQuery('')
      setUsers([])
    }
  }
}
