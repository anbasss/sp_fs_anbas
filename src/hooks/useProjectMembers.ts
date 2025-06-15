import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) {
    throw new Error('Failed to fetch')
  }
  return res.json()
})

export interface ProjectMember {
  id: string
  createdAt: string
  userId: string
  projectId: string
  user: {
    id: string
    email: string
    createdAt: string
  }
}

export interface ProjectWithMembers {
  id: string
  name: string
  ownerId: string
  owner: {
    id: string
    email: string
  }
}

export interface MembersResponse {
  success: boolean
  project: ProjectWithMembers
  members: ProjectMember[]
}

export function useProjectMembers(projectId: string) {
  const { data, error, isLoading, mutate } = useSWR<MembersResponse>(
    projectId ? `/api/projects/${projectId}/members` : null,
    fetcher
  )

  return {
    members: data?.members || [],
    project: data?.project,
    isLoading,
    error,
    mutate
  }
}
