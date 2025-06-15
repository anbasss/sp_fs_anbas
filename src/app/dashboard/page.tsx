"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import SignOutButton from "@/components/SignOutButton"
import { useProjects } from "@/hooks/useProjects"
import { useAlert } from "@/hooks/useAlert"
import { AlertDialog } from "@/components/AlertDialog"
import { Loader2, Plus, Users, Calendar, AlertCircle, Trash2 } from "lucide-react"

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { projects, isLoading, error, fetchProjects, deleteProject } = useProjects()
  const { showAlert, alertState, handleConfirm, handleCancel } = useAlert()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  if (status === "loading") {
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

  const handleProjectClick = (projectId: string) => {
    router.push(`/projects/${projectId}`)
  }

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    const confirmed = await showAlert({
      title: "Hapus Project",
      description: `Apakah Anda yakin ingin menghapus project "${projectName}"? Semua tasks dan data terkait akan terhapus permanen.`,
      confirmText: "Hapus",
      cancelText: "Batal"
    })

    if (confirmed) {
      const result = await deleteProject(projectId)
      if (!result.success) {
        await showAlert({
          title: "Error",
          description: `Gagal menghapus project: ${result.error}`,
          confirmText: "OK",
          cancelText: ""
        })
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Selamat datang, {session.user?.email}</p>
          </div>
          <SignOutButton />
        </div>

        {/* Overview Cards */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Profil Pengguna</CardTitle>
              <CardDescription>Informasi akun Anda</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><span className="font-medium">Email:</span> {session.user?.email}</p>
                <p><span className="font-medium">User ID:</span> {session.user?.id}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Projects</CardTitle>
              <CardDescription>Jumlah project yang Anda miliki</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  projects.length
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Tasks</CardTitle>
              <CardDescription>Jumlah task di semua project</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  projects.reduce((total, project) => total + (project._count?.tasks || 0), 0)
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Projects</h2>
            <Button onClick={() => router.push("/projects/create")}>
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center items-center py-12">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-gray-600">Loading projects...</span>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <span className="text-red-700">Error loading projects: {error}</span>
                </div>
                <Button 
                  onClick={fetchProjects}
                  variant="outline" 
                  className="mt-4"
                >
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Projects List */}
          {!isLoading && !error && (
            <>
              {projects.length === 0 ? (
                <Card className="border-dashed border-2">
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No projects yet
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Get started by creating your first project
                      </p>
                      <Button onClick={() => router.push("/projects/create")}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Project
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">                  {projects.filter(project => project && project.id).map((project) => (
                    <Card 
                      key={project.id}
                      className="hover:shadow-lg transition-shadow"
                    >
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span 
                            className="truncate cursor-pointer hover:text-blue-600"
                            onClick={() => handleProjectClick(project.id)}
                          >
                            {project.name}
                          </span>
                          <div className="flex items-center gap-2">
                            {project.ownerId === session.user?.id && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                Owner
                              </span>
                            )}                            {project.ownerId === session.user?.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteProject(project.id, project.name)
                                }}
                                className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 h-auto"
                                title="Hapus project"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </CardTitle>
                        <CardDescription>
                          Created {new Date(project.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent 
                        className="cursor-pointer"
                        onClick={() => handleProjectClick(project.id)}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-1" />
                              {project._count?.members || 0} members
                            </div>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {project._count?.tasks || 0} tasks
                            </div>
                          </div>
                            <div className="text-xs text-gray-500">
                            Owner: {project.owner?.email || 'Unknown'}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}        </div>
      </div>
      
      {/* Alert Dialog */}
      {alertState.isOpen && alertState.options && (
        <AlertDialog
          isOpen={alertState.isOpen}
          title={alertState.options.title}
          description={alertState.options.description}
          confirmText={alertState.options.confirmText}
          cancelText={alertState.options.cancelText}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}
