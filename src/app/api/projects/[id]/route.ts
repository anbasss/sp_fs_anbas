import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"
import { createServerSupabaseClient } from "@/lib/supabase"
import { z } from "zod"

// Schema validasi untuk update project
const updateProjectSchema = z.object({
  name: z.string().min(1, "Nama project tidak boleh kosong").max(255, "Nama project terlalu panjang").optional(),
})

// Helper function untuk cek akses user ke project
async function checkProjectAccess(projectId: string, userId: string) {
  const supabase = createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('memberships')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single()
    
  return !error && !!data
}

// GET - Mengambil detail project berdasarkan ID
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

    // Cek apakah user memiliki akses ke project
    const hasAccess = await checkProjectAccess(projectId, userId)
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Forbidden - Anda tidak memiliki akses ke project ini" },
        { status: 403 }
      )
    }    // Ambil detail project dengan Supabase
    const supabase = createServerSupabaseClient()
    
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        owner:users!projects_owner_id_fkey(id, email)
      `)
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project tidak ditemukan" },
        { status: 404 }
      )
    }    // Ambil members dari project
    const { data: memberships } = await supabase
      .from('memberships')
      .select(`
        *,
        user:users(id, email)
      `)
      .eq('project_id', projectId)

    // Ambil tasks dari project
    const { data: tasks } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:users(id, email)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })    // Transform data ke format yang diharapkan
    const transformedProject = {
      ...project,
      ownerId: project.owner_id,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      members: memberships || [],
      tasks: tasks || [],
      _count: {
        members: (memberships || []).length,
        tasks: (tasks || []).length
      }
    }

    return NextResponse.json({
      success: true,
      project: transformedProject
    })

  } catch (error) {
    console.error("Error fetching project:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil data project" },
      { status: 500 }
    )
  }
}

// PUT - Update project
export async function PUT(
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
    const body = await request.json()

    // Validasi input
    const validatedFields = updateProjectSchema.safeParse(body)
    
    if (!validatedFields.success) {
      return NextResponse.json(
        { 
          error: "Validasi gagal", 
          details: validatedFields.error.flatten().fieldErrors 
        },
        { status: 400 }
      )
    }    // Cek apakah user adalah owner project
    const supabase = createServerSupabaseClient()
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('owner_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project tidak ditemukan" },
        { status: 404 }
      )
    }

    if (project.owner_id !== userId) {
      return NextResponse.json(
        { error: "Forbidden - Hanya owner yang bisa mengupdate project" },
        { status: 403 }
      )
    }

    // Update project
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update(validatedFields.data)
      .eq('id', projectId)
      .select(`
        *,
        owner:users!projects_owner_id_fkey(id, email)
      `)
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      message: "Project berhasil diupdate",
      project: updatedProject
    })

  } catch (error) {
    console.error("Error updating project:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengupdate project" },
      { status: 500 }
    )
  }
}

// DELETE - Hapus project
export async function DELETE(
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
    const projectId = resolvedParams.id    // Cek apakah user adalah owner project
    const supabase = createServerSupabaseClient()
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('owner_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project tidak ditemukan" },
        { status: 404 }
      )
    }

    if (project.owner_id !== userId) {
      return NextResponse.json(
        { error: "Forbidden - Hanya owner yang bisa menghapus project" },
        { status: 403 }
      )
    }

    // Hapus project (Supabase akan cascade delete tasks dan memberships berdasarkan foreign key constraints)
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({
      success: true,
      message: "Project berhasil dihapus"
    })

  } catch (error) {
    console.error("Error deleting project:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menghapus project" },
      { status: 500 }
    )
  }
}
