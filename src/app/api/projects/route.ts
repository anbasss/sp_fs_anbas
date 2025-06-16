import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"
import { createServerSupabaseClient } from "@/lib/supabase"
import { z } from "zod"

// Schema validasi untuk membuat project
const createProjectSchema = z.object({
  name: z.string().min(1, "Nama project tidak boleh kosong").max(255, "Nama project terlalu panjang"),
})

// GET - Mengambil daftar project yang user bisa akses
export async function GET() {
  try {
    // Cek apakah user sudah login
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized - Silakan login terlebih dahulu" },
        { status: 401 }
      )    }    const userId = session.user.id
    const supabase = createServerSupabaseClient()
    
    // Query projects yang user bisa akses - baik sebagai owner maupun member
    // Pertama, ambil project IDs dari memberships
    const { data: membershipIds, error: membershipError } = await supabase
      .from('memberships')
      .select('project_id')
      .eq('user_id', userId)

    if (membershipError) {
      return NextResponse.json(
        { 
          error: "Terjadi kesalahan saat mengambil data membership",
          details: membershipError.message 
        },
        { status: 500 }
      )
    }    const projectIds = membershipIds?.map(m => m.project_id) || []
    
    // Ambil projects yang user miliki sebagai owner ATAU sebagai member
    let projectsQuery = supabase
      .from('projects')
      .select(`
        id,
        name,
        description,
        owner_id,
        created_at,
        updated_at,
        owner:users!projects_owner_id_fkey(id, email)
      `)

    // Jika ada memberships, tambahkan ke query
    if (projectIds.length > 0) {
      projectsQuery = projectsQuery.or(`owner_id.eq.${userId},id.in.(${projectIds.join(',')})`)
    } else {
      // Jika tidak ada memberships, hanya ambil project milik sendiri
      projectsQuery = projectsQuery.eq('owner_id', userId)
    }

    const { data: projects, error } = await projectsQuery.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { 
          error: "Terjadi kesalahan saat mengambil data project",
          details: error.message 
        },
        { status: 500 }
      )
    }    // Transform data ke format yang diharapkan frontend
    const transformedProjects = await Promise.all((projects || []).map(async (project) => {
      // Hitung jumlah members untuk setiap project
      const { count: memberCount } = await supabase
        .from('memberships')
        .select('*', { count: 'exact' })
        .eq('project_id', project.id)

      return {
        ...project,
        ownerId: project.owner_id, // Transform snake_case to camelCase
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        _count: {
          tasks: 0, // Akan diisi nanti dengan query terpisah jika diperlukan
          members: memberCount || 0
        }
      }
    }))

    return NextResponse.json({
      success: true,
      projects: transformedProjects
    })

  } catch (error) {
    console.error("💥 Error fetching projects:", error)
    return NextResponse.json(
      { 
        error: "Terjadi kesalahan saat mengambil data project",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

// POST - Membuat project baru
export async function POST(request: NextRequest) {
  try {
    // Cek apakah user sudah login
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized - Silakan login terlebih dahulu" },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const body = await request.json()

    // Validasi input dengan Zod
    const validatedFields = createProjectSchema.safeParse(body)
    
    if (!validatedFields.success) {
      return NextResponse.json(
        { 
          error: "Validasi gagal", 
          details: validatedFields.error.flatten().fieldErrors 
        },
        { status: 400 }
      )
    }

    const { name } = validatedFields.data
    const supabase = createServerSupabaseClient()

    // Buat project baru
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name,
        owner_id: userId,
      })
      .select(`
        *,
        owner:users!projects_owner_id_fkey(id, email)
      `)
      .single()

    if (projectError) {
      console.error("Supabase project creation error:", projectError)
      return NextResponse.json(
        { error: "Terjadi kesalahan saat membuat project" },
        { status: 500 }
      )
    }

    // Buat membership entry untuk owner
    const { error: membershipError } = await supabase
      .from('memberships')
      .insert({
        user_id: userId,
        project_id: project.id,
      })

    if (membershipError) {
      console.error("Supabase membership creation error:", membershipError)
      // Rollback project creation if membership fails
      await supabase.from('projects').delete().eq('id', project.id)
      return NextResponse.json(
        { error: "Terjadi kesalahan saat membuat project" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Project berhasil dibuat",
      project: project
    }, { status: 201 })

  } catch (error) {
    console.error("Error creating project:", error)
    
    return NextResponse.json(
      { error: "Terjadi kesalahan saat membuat project" },
      { status: 500 }
    )
  }
}
