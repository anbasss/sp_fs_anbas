import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"
import { createServerSupabaseClient } from "@/lib/supabase"

// GET - Search users by email (for autocomplete)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized - Silakan login terlebih dahulu" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "Query harus minimal 2 karakter" },
        { status: 400 }
      )
    }

    // Search users by email with limit, exclude current user
    const supabase = createServerSupabaseClient()
    const { data: users, error: supabaseError } = await supabase
      .from('users')
      .select('id, email')
      .ilike('email', `%${query}%`)
      .neq('id', session.user.id)
      .order('email', { ascending: true })
      .limit(10)

    if (supabaseError) {
      return NextResponse.json(
        { error: "Terjadi kesalahan saat mencari user" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      users
    })

  } catch {
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mencari user" },
      { status: 500 }
    )
  }
}
