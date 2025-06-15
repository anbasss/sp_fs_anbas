import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"
import { createServerSupabaseClient } from "@/lib/supabase"
import { z } from "zod"

// Schema validasi untuk update project
const updateProjectSchema = z.object({
  name: z.string().min(1, "Nama project tidak boleh kosong").max(255, "Nama project terlalu panjang").optional(),
  description: z.string().optional(),
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
    }

    const supabase = createServerSupabaseClient()

    // Ambil detail project dengan relasi
    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        *,
        owner:users!projects_owner_id_fkey(id, email),
        memberships:memberships(
          *,
          user:users(id, email)
        ),
        tasks:tasks(*)
      `)
      .eq('id', projectId)
      .single()

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json(
        { error: "Project tidak ditemukan" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      project
    })

  } catch (error) {
    console.error("Error fetching project:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil detail project" },
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
    }

    const supabase = createServerSupabaseClient()

    // Cek apakah project exist dan user adalah owner
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('owner_id', userId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project tidak ditemukan atau Anda bukan owner" },
        { status: 404 }
      )
    }

    // Update project
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({
        ...validatedFields.data,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select(`
        *,
        owner:users!projects_owner_id_fkey(id, email)
      `)
      .single()

    if (updateError) {
      console.error("Supabase update error:", updateError)
      return NextResponse.json(
        { error: "Terjadi kesalahan saat mengupdate project" },
        { status: 500 }
      )
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
    const projectId = resolvedParams.id

    const supabase = createServerSupabaseClient()

    // Cek apakah project exist dan user adalah owner
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('owner_id', userId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project tidak ditemukan atau Anda bukan owner" },
        { status: 404 }
      )
    }

    // Delete project (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)

    if (deleteError) {
      console.error("Supabase delete error:", deleteError)
      return NextResponse.json(
        { error: "Terjadi kesalahan saat menghapus project" },
        { status: 500 }
      )
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
