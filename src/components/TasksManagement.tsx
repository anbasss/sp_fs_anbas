"use client"

import { useState } from "react"
import { useTasks } from "@/hooks/useTasks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Calendar, User, Trash2, Edit, CheckSquare } from "lucide-react"
import { useSession } from "next-auth/react"

interface TasksManagementProps {
  projectId: string
  projectMembers?: Array<{
    user: {
      id: string
      email: string
    }
  }>
}

const statusOptions = [
  { value: "pending", label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  { value: "in_progress", label: "In Progress", color: "bg-blue-100 text-blue-800" },
  { value: "completed", label: "Completed", color: "bg-green-100 text-green-800" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-800" },
]

export default function TasksManagement({ projectId, projectMembers = [] }: TasksManagementProps) {
  const { data: session } = useSession()
  const { tasks, project, isLoading, error, createTask, updateTask, deleteTask } = useTasks(projectId)
  
  const [isCreating, setIsCreating] = useState(false)
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [createError, setCreateError] = useState("")
  
  // Form states untuk create task
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    status: "pending",
    assigneeId: ""
  })

  // Form states untuk edit task
  const [editTask, setEditTask] = useState({
    title: "",
    description: "",
    status: "",
    assigneeId: ""
  })

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTask.title.trim() || !newTask.description.trim()) return

    setIsCreating(true)
    setCreateError("")

    const taskData = {
      ...newTask,
      assigneeId: newTask.assigneeId || undefined
    }

    const result = await createTask(taskData)
    
    if (result.success) {
      setNewTask({
        title: "",
        description: "",
        status: "pending",
        assigneeId: ""
      })
      setIsCreating(false)
    } else {
      setCreateError(result.error || "Gagal membuat task")
      setIsCreating(false)
    }
  }

  const handleEditTask = async (taskId: string) => {
    const result = await updateTask(taskId, editTask)
    
    if (result.success) {
      setEditingTask(null)
      setEditTask({ title: "", description: "", status: "", assigneeId: "" })
    } else {
      alert(result.error || "Gagal mengupdate task")
    }
  }

  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus task "${taskTitle}"?`)) {
      return
    }

    const result = await deleteTask(taskId)
    if (!result.success) {
      alert(result.error || "Gagal menghapus task")
    }
  }
  const startEdit = (task: import("@/hooks/useTasks").Task) => {
    setEditingTask(task.id)
    setEditTask({
      title: task.title,
      description: task.description,
      status: task.status,
      assigneeId: task.assigneeId
    })
  }

  const canEditTask = (task: import("@/hooks/useTasks").Task) => {
    return session?.user?.id === project?.owner.id || session?.user?.id === task.assigneeId
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = statusOptions.find(s => s.value === status)
    return (
      <Badge className={statusConfig?.color || "bg-gray-100 text-gray-800"}>
        {statusConfig?.label || status}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Memuat tasks...</p>
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
      {/* Project Info */}
      {project && (
        <Card>
          <CardHeader>
            <CardTitle>Tasks - {project.name}</CardTitle>
            <CardDescription>
              Owner: {project.owner.email}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Create Task Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Buat Task Baru
          </CardTitle>
          <CardDescription>
            Tambahkan task baru untuk project ini
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Judul Task</Label>
                <Input
                  id="title"
                  type="text"
                  placeholder="Masukkan judul task"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  disabled={isCreating}
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={newTask.status} 
                  onValueChange={(value) => setNewTask({ ...newTask, status: value })}
                  disabled={isCreating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                placeholder="Masukkan deskripsi task"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                disabled={isCreating}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="assignee">Assign ke (opsional)</Label>
              <Select 
                value={newTask.assigneeId} 
                onValueChange={(value) => setNewTask({ ...newTask, assigneeId: value })}
                disabled={isCreating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih assignee (default: Anda)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Saya sendiri</SelectItem>
                  {projectMembers.map((member) => (
                    <SelectItem key={member.user.id} value={member.user.id}>
                      {member.user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {createError && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {createError}
              </div>
            )}

            <Button type="submit" disabled={isCreating || !newTask.title.trim() || !newTask.description.trim()}>
              {isCreating ? "Membuat..." : "Buat Task"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Daftar Tasks</h2>
        {tasks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <div className="text-gray-400 mb-4">
                <CheckSquare className="h-12 w-12" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada task</h3>
              <p className="text-gray-500 text-center">
                Buat task pertama untuk project ini.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {tasks.map((task) => (
              <Card key={task.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {editingTask === task.id ? (
                        <div className="space-y-2">
                          <Input
                            value={editTask.title}
                            onChange={(e) => setEditTask({ ...editTask, title: e.target.value })}
                            className="font-semibold"
                          />
                          <Textarea
                            value={editTask.description}
                            onChange={(e) => setEditTask({ ...editTask, description: e.target.value })}
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <Select 
                              value={editTask.status} 
                              onValueChange={(value) => setEditTask({ ...editTask, status: value })}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {statusOptions.map((status) => (
                                  <SelectItem key={status.value} value={status.value}>
                                    {status.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button size="sm" onClick={() => handleEditTask(task.id)}>
                              Simpan
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingTask(null)}>
                              Batal
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <CardTitle className="text-lg">{task.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {task.description}
                          </CardDescription>
                          <div className="flex items-center gap-4 mt-2">
                            {getStatusBadge(task.status)}
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <User className="h-3 w-3" />
                              <span>{task.assignee.email}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(task.createdAt).toLocaleDateString('id-ID')}</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    {canEditTask(task) && editingTask !== task.id && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(task)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTask(task.id, task.title)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
