import { useState } from 'react'

interface UpdateTaskStatusOptions {
  taskId: string
  projectId: string
  newStatus: string
  onSuccess?: () => void
  onError?: (error: string) => void
}

export function useUpdateTaskStatus() {
  const [isUpdating, setIsUpdating] = useState(false)

  const updateTaskStatus = async ({ 
    taskId, 
    projectId, 
    newStatus, 
    onSuccess, 
    onError 
  }: UpdateTaskStatusOptions) => {
    setIsUpdating(true)
    
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update task status')
      }

      onSuccess?.()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      onError?.(errorMessage)
    } finally {
      setIsUpdating(false)
    }
  }

  return {
    updateTaskStatus,
    isUpdating
  }
}
