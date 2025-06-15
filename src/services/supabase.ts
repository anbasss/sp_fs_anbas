import { supabase } from '@/lib/supabase'
import { Database } from '@/types/supabase'

type Tables = Database['public']['Tables']

// Project Services
export const projectService = {
  // Get all projects for a user
  async getProjectsByUserId(userId: string) {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        tasks:tasks(*),
        memberships:memberships(
          *,
          user:users(*)
        )
      `)
      .eq('owner_id', userId)
    
    if (error) throw error
    return data
  },

  // Get single project with tasks and members
  async getProjectById(projectId: string) {
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
    return data
  },

  // Create new project
  async createProject(project: Tables['projects']['Insert']) {
    const { data, error } = await supabase
      .from('projects')
      .insert(project)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update project
  async updateProject(projectId: string, updates: Tables['projects']['Update']) {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Delete project
  async deleteProject(projectId: string) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
    
    if (error) throw error
  }
}

// Task Services
export const taskService = {
  // Get tasks by project
  async getTasksByProjectId(projectId: string) {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:users(*),
        project:projects(*)
      `)
      .eq('project_id', projectId)
    
    if (error) throw error
    return data
  },

  // Create new task
  async createTask(task: Tables['tasks']['Insert']) {
    const { data, error } = await supabase
      .from('tasks')
      .insert(task)
      .select(`
        *,
        assignee:users(*),
        project:projects(*)
      `)
      .single()
    
    if (error) throw error
    return data
  },

  // Update task
  async updateTask(taskId: string, updates: Tables['tasks']['Update']) {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select(`
        *,
        assignee:users(*),
        project:projects(*)
      `)
      .single()
    
    if (error) throw error
    return data
  },

  // Delete task
  async deleteTask(taskId: string) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
    
    if (error) throw error
  },

  // Update task status (for drag and drop)
  async updateTaskStatus(taskId: string, status: string) {
    const { data, error } = await supabase
      .from('tasks')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}

// User Services
export const userService = {
  // Get user by ID
  async getUserById(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) throw error
    return data
  },

  // Get users by project (members)
  async getUsersByProjectId(projectId: string) {
    const { data, error } = await supabase
      .from('memberships')
      .select(`
        *,
        user:users(*)
      `)
      .eq('project_id', projectId)
    
    if (error) throw error
    return data?.map(membership => membership.user) || []
  },

  // Create user
  async createUser(user: Tables['users']['Insert']) {
    const { data, error } = await supabase
      .from('users')
      .insert(user)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}

// Membership Services
export const membershipService = {
  // Add member to project
  async addMemberToProject(userId: string, projectId: string) {
    const { data, error } = await supabase
      .from('memberships')
      .insert({ user_id: userId, project_id: projectId })
      .select(`
        *,
        user:users(*),
        project:projects(*)
      `)
      .single()
    
    if (error) throw error
    return data
  },

  // Remove member from project
  async removeMemberFromProject(userId: string, projectId: string) {
    const { error } = await supabase
      .from('memberships')
      .delete()
      .eq('user_id', userId)
      .eq('project_id', projectId)
    
    if (error) throw error
  },

  // Get project memberships
  async getProjectMemberships(projectId: string) {
    const { data, error } = await supabase
      .from('memberships')
      .select(`
        *,
        user:users(*)
      `)
      .eq('project_id', projectId)
    
    if (error) throw error
    return data
  }
}
