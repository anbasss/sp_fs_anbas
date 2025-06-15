import { useEffect, useState, useCallback } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

// Hook for real-time project updates
export function useRealtimeProject(projectId: string) {
  const [project, setProject] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const fetchProject = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          tasks:tasks(*),
          memberships:memberships(
            *,
            user:users(*)
          ),
          owner:users(*)
        `)
        .eq('id', projectId)
        .single()

      if (error) throw error
      setProject(data)    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    const channel: RealtimeChannel = supabase
      .channel(`project-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${projectId}`
        },
        () => {
          fetchProject()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${projectId}`
        },
        () => {
          fetchProject()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memberships',
          filter: `project_id=eq.${projectId}`
        },
        () => {
          fetchProject()
        }
      )
      .subscribe()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }  }, [projectId, fetchProject])

  return { project, loading, error, refetch: fetchProject }
}

// Hook for real-time tasks updates
export function useRealtimeTasks(projectId: string) {
  const [tasks, setTasks] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:users(*),
          project:projects(*)
        `)
        .eq('project_id', projectId)

      if (error) throw error
      setTasks(data || [])    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    const channel: RealtimeChannel = supabase
      .channel(`tasks-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${projectId}`
        },
        () => {
          fetchTasks()
        }
      )
      .subscribe()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }  }, [projectId, fetchTasks])

  return { tasks, loading, error, refetch: fetchTasks }
}

// Hook for real-time user presence
export function useRealtimePresence(projectId: string, userId: string) {
  const [onlineUsers, setOnlineUsers] = useState<Record<string, unknown>[]>([])

  useEffect(() => {
    const channel = supabase.channel(`project-presence-${projectId}`)

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const users = Object.values(state).flat() as Record<string, unknown>[]
        setOnlineUsers(users)
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        setOnlineUsers(prev => [...prev, ...newPresences])
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        setOnlineUsers(prev => 
          prev.filter(user => 
            !leftPresences.some(leftUser => leftUser.user_id === user.user_id)
          )
        )
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString()
          })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, userId])

  return onlineUsers
}
