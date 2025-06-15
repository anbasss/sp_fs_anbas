import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth-config"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function Home() {
  const session = await getServerSession(authOptions)

  // Jika user sudah login, redirect ke dashboard
  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            SP FS ANBAS
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Sistem Manajemen Proyek Modern
          </p>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Kelola proyek, tugas, dan tim Anda dengan mudah. 
            Tingkatkan produktivitas dan kolaborasi dalam satu platform.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📊 Manajemen Proyek
              </CardTitle>
              <CardDescription>
                Organisir dan lacak semua proyek Anda dalam satu tempat
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                ✅ Manajemen Tugas
              </CardTitle>
              <CardDescription>
                Buat, tugaskan, dan pantau progress tugas dengan mudah
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                👥 Kolaborasi Tim
              </CardTitle>
              <CardDescription>
                Bekerja sama dengan anggota tim secara real-time
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="text-center">
          <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
            <Button asChild size="lg">
              <Link href="/register">
                Daftar Sekarang
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">
                Masuk
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Gratis untuk memulai • Tidak perlu kartu kredit
          </p>
        </div>
      </div>
    </div>
  )
}
