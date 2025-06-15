import useSWR from 'swr'

interface Task {
  id: string
  title: string
  description: string
  status: string
  assigneeId: string | null
  projectId: string
  createdAt: string
  updatedAt: string
  assignee: {
    id: string
    email: string
  } | null
  project: {
    id: string
    name: string
  }
}

interface ProjectTasksResponse {
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

const fetcher = async (url: string): Promise<ProjectTasksResponse> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch tasks')
  }
  return response.json()
}

export function useProjectTasks(projectId: string) {
  // Don't fetch if projectId is empty, 'create', or not a valid UUID format
  const isValidProjectId = projectId && 
    projectId.trim() !== '' &&
    projectId !== 'create' && 
    projectId.length > 10 &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)
  
  const { data, error, isLoading, mutate } = useSWR<ProjectTasksResponse>(
    isValidProjectId ? `/api/projects/${projectId}/tasks` : null,
    fetcher,
    {
      refreshInterval: 0, // Disable auto-refresh
      revalidateOnFocus: false, // Disable revalidation on focus
    }
  )

  return {
    data,
    tasks: data?.tasks || [],
    project: data?.project,
    isLoading,
    error,
    mutate
  }
}

export type { Task, ProjectTasksResponse }
