import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"
import { hashPassword } from "@/lib/auth-utils"
import { z } from "zod"

// Schema validasi input
const registerSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
})

export async function POST(request: NextRequest) {
  try {
    // Check if Supabase environment variables are set
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase environment variables")
      return NextResponse.json(
        { error: "Server configuration error - Supabase not configured" },
        { status: 500 }
      )
    }

    const body = await request.json()
    
    // Validasi input dengan Zod
    const validatedFields = registerSchema.safeParse(body)
    
    if (!validatedFields.success) {
      return NextResponse.json(
        { 
          error: "Validasi gagal", 
          details: validatedFields.error.flatten().fieldErrors 
        },
        { status: 400 }
      )
    }

    const { email, password } = validatedFields.data
    const supabase = createServerSupabaseClient()

    // Cek apakah email sudah ada
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser && !checkError) {
      return NextResponse.json(
        { error: "Email sudah terdaftar" },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Buat user baru
    const { data: user, error: createError } = await supabase
      .from('users')
      .insert({
        email,
        password: hashedPassword,
      })
      .select('id, email, created_at')
      .single()

    if (createError) {
      throw createError
    }

    return NextResponse.json({
      success: true,
      message: "User berhasil dibuat",
      user
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating user:", error)
    
    // More detailed error logging for debugging
    if (error instanceof Error) {
      console.error("Error message:", error.message)
      console.error("Error stack:", error.stack)
    }
    
    return NextResponse.json(
      { 
        error: "Terjadi kesalahan server",
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  }
}
