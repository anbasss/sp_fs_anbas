"use client"

import { useState, useEffect } from "react"

export interface Project {
  id: string
  name: string
  ownerId: string
  createdAt: string
  updatedAt: string
  owner: {
    id: string
    email: string
  }
  members: Array<{
    id: string
    userId: string
    projectId: string
    user: {
      id: string
      email: string
    }
  }>
  tasks: Array<{
    id: string
    title: string
    status: string
  }>
  _count: {
    tasks: number
    members: number
  }
}

interface ProjectsResponse {
  success: boolean
  projects: Project[]
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/projects")
      
      if (!response.ok) {
        throw new Error("Failed to fetch projects")
      }
        const data: ProjectsResponse = await response.json()
      console.log("📊 Projects data received:", JSON.stringify(data, null, 2))
      setProjects(data.projects)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const createProject = async (name: string) => {
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create project")
      }

      // Refresh projects list
      await fetchProjects()
      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "An error occurred"
      }
    }
  }

  const deleteProject = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete project")
      }

      // Refresh projects list
      await fetchProjects()
      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "An error occurred"
      }
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  return {
    projects,
    isLoading,
    error,
    fetchProjects,
    createProject,
    deleteProject
  }
}
