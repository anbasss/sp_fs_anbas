import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"
import { createServerSupabaseClient } from "@/lib/supabase"
import { z } from "zod"

// Schema validasi untuk update task
const updateTaskSchema = z.object({
  title: z.string().min(1, "Title tidak boleh kosong").max(255, "Title terlalu panjang").optional(),
  description: z.string().min(1, "Description tidak boleh kosong").max(1000, "Description terlalu panjang").optional(),
  status: z.string().min(1, "Status tidak boleh kosong").optional(),
  assigneeId: z.string().optional(),
})

// Helper function untuk cek apakah user adalah member dari project
async function checkProjectMembership(projectId: string, userId: string) {
  const supabase = createServerSupabaseClient()
  const { data: membership, error } = await supabase
    .from('memberships')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single()
  
  return !error && !!membership
}

// Helper function untuk cek apakah user bisa edit task
async function canEditTask(taskId: string, userId: string) {
  const supabase = createServerSupabaseClient()
  const { data: task, error } = await supabase
    .from('tasks')
    .select(`
      *,
      project:projects(owner_id)
    `)    .eq('id', taskId)
    .single()

  if (error || !task) return { canEdit: false, task: null }

  // User bisa edit jika: owner project atau assignee task
  const isOwner = task.project.owner_id === userId
  const isAssignee = task.assignee_id === userId

  return { canEdit: isOwner || isAssignee, task }
}

// GET - Mengambil detail task berdasarkan ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
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
    const { id: projectId, taskId } = resolvedParams

    // Cek apakah user adalah member dari project
    const isMember = await checkProjectMembership(projectId, userId)
    if (!isMember) {
      return NextResponse.json(
        { error: "Forbidden - Anda bukan anggota dari project ini" },
        { status: 403 }
      )
    }    // Ambil detail task
    const supabase = createServerSupabaseClient()
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:users(id, email),
        project:projects(
          id, 
          name,
          owner:users!projects_owner_id_fkey(id, email)
        )
      `)
      .eq('id', taskId)
      .eq('project_id', projectId)
      .single()

    if (taskError || !task) {
      return NextResponse.json(
        { error: "Task tidak ditemukan" },        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      task
    })

  } catch (error) {
    console.error("Error fetching task:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil data task" },
      { status: 500 }
    )
  }
}

// PUT - Update task
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
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
    const { id: projectId, taskId } = resolvedParams
    const body = await request.json()

    // Validasi input
    const validatedFields = updateTaskSchema.safeParse(body)
    
    if (!validatedFields.success) {
      return NextResponse.json(
        { 
          error: "Validasi gagal", 
          details: validatedFields.error.flatten().fieldErrors 
        },
        { status: 400 }
      )
    }    // Cek apakah user bisa edit task
    const { canEdit, task } = await canEditTask(taskId, userId)
      if (!canEdit) {
      return NextResponse.json(
        { error: "Forbidden - Anda tidak memiliki permission untuk mengupdate task ini" },
        { status: 403 }
      )
    }

    if (!task || task.project_id !== projectId) {
      return NextResponse.json(
        { error: "Task tidak ditemukan dalam project ini" },
        { status: 404 }
      )
    }

    const updateData = validatedFields.data    // Jika assigneeId diubah, pastikan assignee adalah member dari project
    if (updateData.assigneeId) {
      const assigneeIsMember = await checkProjectMembership(projectId, updateData.assigneeId)
      if (!assigneeIsMember) {
        return NextResponse.json(
          { error: "Assignee bukan anggota dari project ini" },
          { status: 400 }
        )
      }
    }    // Update task
    const supabase = createServerSupabaseClient()    // Prepare update data, only include fields that are provided
    const updateFields: Record<string, unknown> = {}
    if (updateData.title !== undefined) updateFields.title = updateData.title
    if (updateData.description !== undefined) updateFields.description = updateData.description
    if (updateData.status !== undefined) updateFields.status = updateData.status
    if (updateData.assigneeId !== undefined) updateFields.assignee_id = updateData.assigneeId
    
    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update(updateFields)
      .eq('id', taskId)
      .eq('project_id', projectId) // Additional safety check
      .select(`
        *,
        assignee:users(id, email),
        project:projects(
          id,
          name,
          owner:users!projects_owner_id_fkey(id, email)
        )
      `)      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      message: "Task berhasil diupdate",
      task: updatedTask
    })

  } catch (error) {
    console.error("Error updating task:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengupdate task" },
      { status: 500 }
    )
  }
}

// DELETE - Hapus task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
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
    const { id: projectId, taskId } = resolvedParams

    // Cek apakah user bisa edit task (owner project atau assignee)
    const { canEdit, task } = await canEditTask(taskId, userId)
    
    if (!canEdit) {
      return NextResponse.json(
        { error: "Forbidden - Anda tidak memiliki permission untuk menghapus task ini" },
        { status: 403 }
      )
    }    if (!task || task.project_id !== projectId) {
      return NextResponse.json(
        { error: "Task tidak ditemukan dalam project ini" },
        { status: 404 }
      )
    }

    // Hapus task
    const supabase = createServerSupabaseClient()
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({
      success: true,
      message: "Task berhasil dihapus"
    })

  } catch (error) {
    console.error("Error deleting task:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menghapus task" },
      { status: 500 }
    )
  }
}
