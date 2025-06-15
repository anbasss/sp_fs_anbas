import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')
    const projectId = searchParams.get('projectId')

    if (!taskId || !projectId) {
      return NextResponse.json({
        error: "Missing taskId or projectId parameters"
      }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    
    // Get task details
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select(`
        *,
        project:projects(*)
      `)
      .eq('id', taskId)
      .single()

    console.log('DEBUG - taskId:', taskId)
    console.log('DEBUG - projectId from params:', projectId)
    console.log('DEBUG - task:', JSON.stringify(task, null, 2))
    console.log('DEBUG - taskError:', taskError)

    return NextResponse.json({
      debug: {
        taskId,
        projectId,
        task,
        taskError,
        projectIdFromTask: task?.project_id,
        projectIdMatch: task?.project_id === projectId,
        projectIdTypes: {
          fromParams: typeof projectId,
          fromTask: typeof task?.project_id
        }
      }
    })

  } catch (error) {
    console.error("Debug error:", error)
    return NextResponse.json(
      { error: "Debug error", details: error },
      { status: 500 }
    )
  }
}
