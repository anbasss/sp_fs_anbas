import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"
import { createServerSupabaseClient } from "@/lib/supabase"

// DELETE - Menghapus member dari project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized - Silakan login terlebih dahulu" },
        { status: 401 }
      )
    }

    const currentUserId = session.user.id
    const resolvedParams = await params
    const projectId = resolvedParams.id
    const targetUserId = resolvedParams.userId
    const supabase = createServerSupabaseClient()

    // Cek apakah project ada dan ambil info owner
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

    // Cek permission: owner bisa hapus siapa saja, member hanya bisa hapus diri sendiri
    const isOwner = project.owner_id === currentUserId
    const isSelf = currentUserId === targetUserId

    if (!isOwner && !isSelf) {
      return NextResponse.json(
        { error: "Forbidden - Anda tidak memiliki permission untuk menghapus member ini" },
        { status: 403 }
      )
    }

    // Tidak bisa menghapus owner dari project
    if (targetUserId === project.owner_id) {
      return NextResponse.json(
        { error: "Owner tidak bisa dihapus dari project" },
        { status: 400 }
      )
    }

    // Cek apakah target user adalah member
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('id')
      .eq('user_id', targetUserId)
      .eq('project_id', projectId)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: "User bukan member dari project ini" },
        { status: 404 }
      )
    }

    // Re-assign tasks dari user yang akan dihapus ke owner
    const { error: taskUpdateError } = await supabase
      .from('tasks')
      .update({ assignee_id: project.owner_id })
      .eq('project_id', projectId)
      .eq('assignee_id', targetUserId)

    if (taskUpdateError) {
      console.error("Error updating tasks:", taskUpdateError)
      // Continue with deletion even if task update fails
    }

    // Hapus membership
    const { error: deleteError } = await supabase
      .from('memberships')
      .delete()
      .eq('user_id', targetUserId)
      .eq('project_id', projectId)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({
      success: true,
      message: isSelf ? "Anda berhasil keluar dari project" : "Member berhasil dihapus"
    })

  } catch (error) {
    console.error("Error removing member:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menghapus member" },
      { status: 500 }
    )
  }
}
