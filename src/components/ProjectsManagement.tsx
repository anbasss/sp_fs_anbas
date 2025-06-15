"use client"

import { useState } from "react"
import { useProjects } from "@/hooks/useProjects"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Users, CheckSquare, Calendar, Trash2 } from "lucide-react"
import { useSession } from "next-auth/react"

type Project = {
  id: string
  name: string
  description?: string
  ownerId: string
  createdAt: string
  _count: {
    tasks: number
    members: number
  }
}

export default function ProjectsManagement() {
  const { data: session } = useSession()
  const { projects, isLoading, error, createProject, deleteProject } = useProjects()
  const [isCreating, setIsCreating] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const [createError, setCreateError] = useState("")

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim()) return

    setIsCreating(true)
    setCreateError("")

    const result = await createProject(newProjectName.trim())
    
    if (result.success) {
      setNewProjectName("")
      setIsCreating(false)
    } else {
      setCreateError(result.error || "Gagal membuat project")
      setIsCreating(false)
    }
  }

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus project "${projectName}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return
    }

    const result = await deleteProject(projectId)
    if (!result.success) {
      alert(result.error || "Gagal menghapus project")
    }
  }

  const isOwner = (project: Project) => {
    return session?.user?.id === project.ownerId
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Memuat projects...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Create Project Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Buat Project Baru
          </CardTitle>
          <CardDescription>
            Buat project baru untuk mengorganisir tugas dan kolaborasi tim
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div>
              <Label htmlFor="projectName">Nama Project</Label>
              <Input
                id="projectName"
                type="text"
                placeholder="Masukkan nama project"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                disabled={isCreating}
              />
            </div>
            {createError && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {createError}
              </div>
            )}
            <Button type="submit" disabled={isCreating || !newProjectName.trim()}>
              {isCreating ? "Membuat..." : "Buat Project"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Projects List */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Projects Anda</h2>
        {projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <div className="text-gray-400 mb-4">
                <CheckSquare className="h-12 w-12" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada project</h3>
              <p className="text-gray-500 text-center">
                Buat project pertama Anda untuk mulai mengorganisir tugas dan kolaborasi tim.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <CardDescription>
                        {isOwner(project) ? "Owner" : "Member"} • {project.owner.email}
                      </CardDescription>
                    </div>
                    {isOwner(project) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteProject(project.id, project.name)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                      <span>{project._count.tasks} tugas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-green-600" />
                      <span>{project._count.members} anggota</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    <span>Dibuat {new Date(project.createdAt).toLocaleDateString('id-ID')}</span>
                  </div>
                  <div className="mt-4">
                    <Button variant="outline" className="w-full" asChild>
                      <a href={`/projects/${project.id}`}>
                        Lihat Detail
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
