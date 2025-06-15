import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"
import { createServerSupabaseClient } from "@/lib/supabase"
import { z } from "zod"

// Schema validasi untuk membuat task
const createTaskSchema = z.object({
  title: z.string().min(1, "Title tidak boleh kosong").max(255, "Title terlalu panjang"),
  description: z.string().min(1, "Description tidak boleh kosong").max(1000, "Description terlalu panjang"),
  status: z.string().min(1, "Status tidak boleh kosong"),
  assigneeId: z.string().optional().nullable(), // Optional dan nullable
})

// Helper function untuk cek apakah user adalah member dari project atau owner
async function checkProjectMembership(projectId: string, userId: string) {
  const supabase = createServerSupabaseClient()
  
  // Cek apakah user adalah owner project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .single()
  
  if (!projectError && project && project.owner_id === userId) {
    return true // User adalah owner
  }
  
  // Cek apakah user adalah member
  const { data: membership, error: memberError } = await supabase
    .from('memberships')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single()
  
  return !memberError && !!membership
}

// Helper function untuk mendapatkan project info
async function getProjectInfo(projectId: string) {
  const supabase = createServerSupabaseClient()
  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      id,
      name,
      owner_id,
      owner:users!projects_owner_id_fkey(id, email)
    `)
    .eq('id', projectId)
    .single()
  
  return error ? null : project
}

// GET - Mengambil semua tasks untuk project tertentu
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized - Silakan login terlebih dahulu" },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const resolvedParams = await params
    const projectId = resolvedParams.id

    // Cek apakah project exists
    const project = await getProjectInfo(projectId)
    if (!project) {
      return NextResponse.json(
        { error: "Project tidak ditemukan" },
        { status: 404 }
      )
    }

    // Cek apakah user adalah member dari project
    const isMember = await checkProjectMembership(projectId, userId)
    if (!isMember) {
      return NextResponse.json(
        { error: "Forbidden - Anda bukan anggota dari project ini" },
        { status: 403 }
      )
    }    // Ambil semua tasks untuk project
    const supabase = createServerSupabaseClient()
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:users(id, email),
        project:projects(id, name)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (tasksError) {
      throw tasksError
    }

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        owner: project.owner
      },
      tasks
    })

  } catch (error) {
    console.error("Error fetching tasks:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil data tasks" },
      { status: 500 }
    )
  }
}

// POST - Membuat task baru dalam project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized - Silakan login terlebih dahulu" },
        { status: 401 }
      )    }    const userId = session.user.id
    const resolvedParams = await params
    const projectId = resolvedParams.id
    const body = await request.json()
    
    // Validasi input dengan Zod
    const validatedFields = createTaskSchema.safeParse(body)
    
    if (!validatedFields.success) {
      return NextResponse.json(
        { 
          error: "Validasi gagal", 
          details: validatedFields.error.flatten().fieldErrors 
        },
        { status: 400 }
      )
    }const { title, description, status, assigneeId } = validatedFields.data

    // Cek apakah project exists
    const project = await getProjectInfo(projectId)
    console.log('📝 Project info:', JSON.stringify(project, null, 2))
    
    if (!project) {
      return NextResponse.json(
        { error: "Project tidak ditemukan" },
        { status: 404 }
      )
    }    // Cek apakah user adalah member dari project
    const isMember = await checkProjectMembership(projectId, userId)
    
    if (!isMember) {
      return NextResponse.json(
        { error: "Forbidden - Anda bukan anggota dari project ini" },
        { status: 403 }
      )
    }    // Tentukan assignee: jika tidak ditentukan, assign ke user yang membuat task
    const finalAssigneeId = assigneeId || userId

    // Jika assigneeId ditentukan, pastikan assignee adalah member dari project
    if (assigneeId) {
      const assigneeIsMember = await checkProjectMembership(projectId, assigneeId)
      if (!assigneeIsMember) {
        return NextResponse.json(
          { error: "Assignee bukan anggota dari project ini" },
          { status: 400 }
        )
      }    }    const supabase = createServerSupabaseClient()    // Buat task baru
    const { data: task, error: createError } = await supabase
      .from('tasks')
      .insert({
        title,
        description,
        status,
        project_id: projectId,
        assignee_id: finalAssigneeId,
      })      .select(`
        *,
        assignee:users(id, email),
        project:projects(id, name)
      `)
      .single()

    if (createError) {
      throw createError
    }

    return NextResponse.json({
      success: true,
      message: "Task berhasil dibuat",
      task
    }, { status: 201 })

  } catch (error) {
    
    // Handle specific Supabase errors
    if (error instanceof Error) {
      if (error.message.includes("foreign key constraint")) {
        return NextResponse.json(
          { error: "Project atau assignee tidak valid" },
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      { error: "Terjadi kesalahan saat membuat task" },
      { status: 500 }
    )
  }
}
