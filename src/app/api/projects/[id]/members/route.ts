import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"
import { createServerSupabaseClient } from "@/lib/supabase"
import { z } from "zod"

// Schema validasi untuk menambah member
const addMemberSchema = z.object({
  email: z.string().email("Format email tidak valid"),
})

// Helper function untuk cek apakah user adalah owner project
async function checkProjectOwner(projectId: string, userId: string) {
  const supabase = createServerSupabaseClient()
  const { data: project, error } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .single()
  
  return !error && project?.owner_id === userId
}

// POST - Menambah member ke project
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
      )
    }

    const userId = session.user.id
    const resolvedParams = await params
    const projectId = resolvedParams.id
    const body = await request.json()

    // Validasi input
    const validatedFields = addMemberSchema.safeParse(body)
    
    if (!validatedFields.success) {
      return NextResponse.json(
        { 
          error: "Validasi gagal", 
          details: validatedFields.error.flatten().fieldErrors 
        },
        { status: 400 }
      )
    }

    const { email } = validatedFields.data

    // Cek apakah user adalah owner project
    const isOwner = await checkProjectOwner(projectId, userId)
    
    if (!isOwner) {
      return NextResponse.json(
        { error: "Forbidden - Hanya owner yang bisa menambah member" },
        { status: 403 }
      )    }

    // Cari user berdasarkan email
    const supabase = createServerSupabaseClient()
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single()

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: "User dengan email tersebut tidak ditemukan" },
        { status: 404 }
      )
    }

    // Cek apakah user sudah menjadi member
    const { data: existingMembership, error: membershipError } = await supabase
      .from('memberships')
      .select('id')
      .eq('user_id', targetUser.id)
      .eq('project_id', projectId)
      .single()

    if (existingMembership && !membershipError) {
      return NextResponse.json(
        { error: "User sudah menjadi member dari project ini" },
        { status: 409 }
      )
    }    // Tambahkan member baru
    const { data: membership, error: createError } = await supabase
      .from('memberships')
      .insert({
        user_id: targetUser.id,
        project_id: projectId
      })
      .select(`
        *,
        user:users(id, email)
      `)
      .single()

    if (createError) {
      throw createError
    }

    return NextResponse.json({
      success: true,
      message: "Member berhasil ditambahkan",
      membership
    }, { status: 201 })

  } catch (error) {
    console.error("Error adding member:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menambah member" },
      { status: 500 }
    )
  }
}

// GET - Mengambil daftar member project
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
    }    const userId = session.user.id
    const resolvedParams = await params
    const projectId = resolvedParams.id
    const supabase = createServerSupabaseClient()

    // Cek apakah user memiliki akses ke project
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: "Forbidden - Anda tidak memiliki akses ke project ini" },
        { status: 403 }
      )
    }

    // Ambil daftar member
    const { data: members, error: membersError } = await supabase
      .from('memberships')
      .select(`
        *,
        user:users(id, email, created_at)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (membersError) {
      throw membersError
    }    // Ambil info project dan owner
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        owner_id,
        owner:users!projects_owner_id_fkey(id, email)
      `)
      .eq('id', projectId)
      .single()

    if (projectError) {
      throw projectError
    }

    return NextResponse.json({
      success: true,
      project,
      members
    })

  } catch (error) {
    console.error("Error fetching members:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil data member" },
      { status: 500 }
    )
  }
}
