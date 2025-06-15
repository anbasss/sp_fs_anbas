import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"

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
    }    // Search users by email with limit
    const users = await prisma.user.findMany({
      where: {
        email: {
          contains: query
        },
        // Exclude current user from search results
        NOT: {
          id: session.user.id
        }
      },
      select: {
        id: true,
        email: true
      },
      take: 10, // Limit to 10 results
      orderBy: {
        email: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      users
    })

  } catch (error) {
    console.error("Error searching users:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mencari user" },
      { status: 500 }
    )
  }
}
