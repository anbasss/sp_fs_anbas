"use client"

import { useState, useEffect, useCallback } from "react"

export interface Task {
  id: string
  title: string
  description: string
  status: string
  projectId: string
  assigneeId: string
  createdAt: string
  updatedAt: string
  assignee: {
    id: string
    email: string
  }
  project: {
    id: string
    name: string
    owner?: {
      id: string
      email: string
    }
  }
}

interface TasksResponse {
  success: boolean
  project: {
    id: string
    name: string
    owner: {
      id: string
      email: string
    }
  }
  tasks: Task[]
}

interface CreateTaskData {
  title: string
  description: string
  status: string
  assigneeId?: string
}

interface UpdateTaskData {
  title?: string
  description?: string
  status?: string
  assigneeId?: string
}

export function useTasks(projectId: string) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [project, setProject] = useState<TasksResponse['project'] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchTasks = useCallback(async () => {
    if (!projectId) return
    
    try {
      setIsLoading(true)
      const response = await fetch(`/api/projects/${projectId}/tasks`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch tasks")
      }
      
      const data: TasksResponse = await response.json()
      setTasks(data.tasks)
      setProject(data.project)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  const createTask = async (taskData: CreateTaskData) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(taskData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create task")
      }

      // Refresh tasks list
      await fetchTasks()
      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "An error occurred"
      }
    }
  }

  const updateTask = async (taskId: string, taskData: UpdateTaskData) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(taskData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update task")
      }

      // Refresh tasks list
      await fetchTasks()
      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "An error occurred"
      }
    }
  }

  const deleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete task")
      }

      // Refresh tasks list
      await fetchTasks()
      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "An error occurred"
      }
    }
  }

  const getTaskById = async (taskId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch task")
      }
      
      const data = await response.json()
      return { success: true, task: data.task }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "An error occurred"
      }
    }
  }
  useEffect(() => {
    fetchTasks()
  }, [projectId, fetchTasks])

  return {
    tasks,
    project,
    isLoading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    getTaskById
  }
}
