import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    
    // Test basic connection
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true })
    
    if (error) {
      console.error("Supabase connection error:", error)
      return NextResponse.json({
        success: false,
        error: error.message,
        hint: "Make sure your Supabase tables are created"
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: "Supabase connection successful",
      userCount: data
    })
    
  } catch (error) {
    console.error("Test error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
