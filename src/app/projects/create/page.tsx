'use client'

import { useState } from 'react'
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"

export default function CreateProjectPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: formData.name }),
      })

      if (response.ok) {
        const data = await response.json()
        router.push(`/projects/${data.project.id}`)
      } else {
        const errorData = await response.json()
        alert('Error: ' + errorData.error)
      }
    } catch (error) {
      console.error('Error creating project:', error)
      alert('Terjadi kesalahan saat membuat project')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali ke Dashboard
              </Link>
            </Button>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900">Buat Project Baru</h1>
          <p className="text-gray-600">
            Buat project baru untuk mengorganisir tasks dan kolaborasi dengan tim
          </p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Project</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Project *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Masukkan nama project..."
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi (Opsional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Masukkan deskripsi project..."
                  rows={4}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" asChild>
                  <Link href="/dashboard">
                    Batal
                  </Link>
                </Button>
                <Button type="submit" disabled={isLoading || !formData.name.trim()}>
                  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Buat Project
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
