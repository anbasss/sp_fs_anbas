'use client'

import { use } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useProjectTasks } from "@/hooks/useProjectTasks"
import { useProjectMembers } from "@/hooks/useProjectMembers"
import { useUpdateTaskStatus } from "@/hooks/useUpdateTaskStatus"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { ArrowLeft, Plus, Loader2, AlertCircle, User, GripVertical, Trash2 } from "lucide-react"
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { MemberManagement } from "@/components/MemberManagement"
import { AlertDialog } from "@/components/AlertDialog"
import { useAlert } from "@/hooks/useAlert"
import type { Task } from "@/hooks/useProjectTasks"

interface ProjectPageProps {
  params: Promise<{
    id: string
  }>
}

// Komponen untuk menampilkan task card
function TaskCard({ 
  task, 
  index, 
  onDelete, 
  canDelete 
}: { 
  task: Task; 
  index: number; 
  onDelete: (taskId: string, taskTitle: string) => void;
  canDelete: boolean;
}) {
  return (
    <Draggable draggableId={task.id || `task-${index}`} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`mb-3 transition-all duration-200 ${
            snapshot.isDragging 
              ? 'shadow-lg rotate-2 scale-105 z-50' 
              : 'hover:shadow-md'
          }`}
        >
          <Card className="cursor-move">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <div className="flex items-center gap-2" {...provided.dragHandleProps}>
                  <GripVertical className="h-4 w-4 text-gray-400" />
                  <span>{task.title}</span>
                </div>                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(task.id, task.title)
                    }}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 h-6 w-6"
                    title="Hapus task"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>            <CardContent className="pt-0">
              <p className="text-xs text-gray-600 mb-2 line-clamp-2">{task.description}</p>
              <div className="flex items-center justify-between">
                {task.assignee && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <User className="h-3 w-3" />
                    <span>{task.assignee.email}</span>
                  </div>
                )}
                {canDelete && (
                  <span className="text-xs text-red-500 opacity-60">
                    Can delete
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  )
}

// Komponen untuk kolom kanban
function KanbanColumn({ 
  title, 
  tasks, 
  bgColor, 
  status,
  onDeleteTask,
  canDeleteTask
}: { 
  title: string; 
  tasks: Task[]; 
  bgColor: string; 
  status: string;
  onDeleteTask: (taskId: string, taskTitle: string) => void;
  canDeleteTask: (task: Task) => boolean;
}) {
  return (
    <div className="flex-1 min-h-[500px]">
      <div className={`${bgColor} p-3 rounded-t-lg`}>
        <h3 className="font-semibold text-white text-center">{title} ({tasks.length})</h3>
      </div>
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`bg-gray-50 p-3 rounded-b-lg min-h-[450px] transition-colors ${
              snapshot.isDraggingOver ? 'bg-blue-50 border-2 border-blue-300 border-dashed' : ''
            }`}
          >
            {tasks.filter(task => task && task.id).map((task, index) => (
              <TaskCard 
                key={`task-${task.id}-${index}`} 
                task={task} 
                index={index} 
                onDelete={onDeleteTask}
                canDelete={canDeleteTask(task)}
              />
            ))}            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}

// Komponen untuk modal create task
function CreateTaskModal({ 
  projectId, 
  onTaskCreated, 
  projectMembers 
}: { 
  projectId: string; 
  onTaskCreated: () => void;
  projectMembers?: Array<{ id: string; email: string }>;
}) {
  console.log('📝 CreateTaskModal - projectMembers:', projectMembers)
  
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    assigneeId: 'none'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          status: formData.status,
          assigneeId: formData.assigneeId === 'none' ? null : formData.assigneeId        }),
      })

      if (response.ok) {
        setOpen(false)
        setFormData({ title: '', description: '', status: 'todo', assigneeId: 'none' })
        onTaskCreated()
      } else {
        const errorData = await response.json()
        console.error('Failed to create task:', errorData)
        // You could show a toast notification here
      }
    } catch (error) {
      console.error('Error creating task:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Buat Task Baru</DialogTitle>
            <DialogDescription>
              Buat task baru untuk project ini. Task akan ditambahkan ke kolom yang sesuai.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Judul Task</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Masukkan judul task..."
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Masukkan deskripsi task..."
                required
              />
            </div>            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">Todo</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="assignee">Assign to</Label>
              <Select value={formData.assigneeId} onValueChange={(value) => setFormData({ ...formData, assigneeId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih assignee (opsional)" />
                </SelectTrigger>                <SelectContent>
                  <SelectItem value="none">Tidak ada assignee</SelectItem>
                  {projectMembers?.filter(member => member && member.id && member.email).map((member, index) => (
                    <SelectItem key={`member-${member.id}-${index}`} value={member.id}>
                      {member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Buat Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const resolvedParams = use(params)
  const projectId = resolvedParams.id
  const { updateTaskStatus, isUpdating } = useUpdateTaskStatus()
  const { showAlert, alertState, handleConfirm, handleCancel } = useAlert()
  
  // Redirect if trying to access /projects/create through dynamic route
  useEffect(() => {
    if (projectId === 'create') {
      router.replace('/projects/create')
      return
    }
  }, [projectId, router])
    // Pass null or empty string for create route to prevent API calls
  const { tasks, project, isLoading, error, mutate } = useProjectTasks(
    projectId === 'create' ? '' : projectId
  )
    // Get project members for assignee selection
  const { members: projectMembers } = useProjectMembers(
    projectId === 'create' ? '' : projectId
  )
  // Function to delete a task
  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
    const confirmed = await showAlert({
      title: "Hapus Task",
      description: `Apakah Anda yakin ingin menghapus task "${taskTitle}"?`,
      confirmText: "Hapus",
      cancelText: "Batal"
    })

    if (confirmed) {
      try {
        const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          mutate() // Refresh tasks data
        } else {
          const errorData = await response.json()
          await showAlert({
            title: "Error",
            description: `Gagal menghapus task: ${errorData.error}`,
            confirmText: "OK",
            cancelText: ""
          })
        }      } catch {
        await showAlert({
          title: "Error", 
          description: "Terjadi kesalahan saat menghapus task",
          confirmText: "OK",
          cancelText: ""
        })
      }
    }
  }
  // Function to check if user can delete a task
  const canDeleteTask = (task: Task): boolean => {
    if (!session?.user?.id) return false
    
    // User can delete if they are:
    // 1. Project owner
    // 2. Task assignee
    const isProjectOwner = project?.owner?.id === session.user.id
    const isTaskAssignee = task.assignee?.id === session.user.id
    
    return isProjectOwner || isTaskAssignee
  }

  console.log('🔐 Current user permissions:', {
    userId: session?.user?.id,
    projectOwnerId: project?.owner?.id,
    isProjectOwner: project?.owner?.id === session?.user?.id
  })

  // Redirect jika tidak authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])
  
  // Don't render anything if redirecting to create page
  if (projectId === 'create') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Redirecting...</p>
        </div>
      </div>
    )
  }

  // Jika masih loading session
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  // Jika tidak authenticated
  if (!session) {
    return null
  }

  // Jika error loading project/tasks
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
              <p className="text-gray-600 mb-6">
                {error.message || "Terjadi kesalahan saat memuat data project"}
              </p>
              <Button asChild>
                <Link href="/dashboard">
                  Kembali ke Dashboard
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Jika loading data
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Memuat data project...</p>
        </div>
      </div>
    )
  }  // Organisir tasks berdasarkan status
  const todoTasks = tasks.filter(task => task.status === 'todo')
  const inProgressTasks = tasks.filter(task => task.status === 'in-progress')
  const doneTasks = tasks.filter(task => task.status === 'done')

  // Debug: Log tasks to check for duplicate IDs
  console.log('📋 Tasks data:', tasks.map(t => ({ id: t.id, title: t.title })))
  
  const handleTaskCreated = () => {
    mutate() // Refresh data setelah task dibuat
  }

  // Handle drag end
  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result

    // Jika tidak ada destination (drop di luar area yang valid)
    if (!destination) {
      return
    }

    // Jika drop di tempat yang sama
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return
    }

    // Mapping status dari droppable ID
    const statusMap: { [key: string]: string } = {
      'todo': 'todo',
      'in-progress': 'in-progress', 
      'done': 'done'
    }

    const newStatus = statusMap[destination.droppableId]
    if (!newStatus) {
      console.error('Invalid destination status:', destination.droppableId)
      return
    }

    // Update task status
    updateTaskStatus({
      taskId: draggableId,
      projectId: projectId,
      newStatus: newStatus,
      onSuccess: () => {
        mutate() // Refresh data
      },
      onError: (error) => {
        console.error('Failed to update task status:', error)
        // Bisa ditambahkan toast notification di sini
      }
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali ke Dashboard
              </Link>
            </Button>
          </div>
            <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{project?.name || 'Project Board'}</h1>
              <p className="text-gray-600">
                Kelola tasks dalam project ini menggunakan kanban board
              </p>
            </div>
              <div className="flex items-center gap-3">
              <MemberManagement 
                projectId={projectId} 
                isOwner={project?.owner?.id === session?.user?.id} 
              />              <CreateTaskModal 
                projectId={projectId} 
                onTaskCreated={handleTaskCreated}
                projectMembers={[
                  // Add project owner if available
                  ...(project?.owner ? [{ 
                    id: project.owner.id, 
                    email: project.owner.email 
                  }] : []),
                  // Add project members, filter out invalid entries and avoid duplicates
                  ...projectMembers
                    .filter(member => 
                      member.user && 
                      member.userId && 
                      member.user.email && 
                      member.userId !== project?.owner?.id
                    )
                    .map(member => ({ 
                      id: member.userId, 
                      email: member.user.email 
                    }))
                ].filter((member, index, array) => 
                  // Remove duplicates based on id
                  array.findIndex(m => m.id === member.id) === index
                )}
              />
            </div>
          </div>
        </div>        {/* Kanban Board */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KanbanColumn 
              title="Todo" 
              tasks={todoTasks} 
              bgColor="bg-red-500"
              status="todo"
              onDeleteTask={handleDeleteTask}
              canDeleteTask={canDeleteTask}
            />
            <KanbanColumn 
              title="In Progress" 
              tasks={inProgressTasks} 
              bgColor="bg-yellow-500"
              status="in-progress"
              onDeleteTask={handleDeleteTask}
              canDeleteTask={canDeleteTask}
            />
            <KanbanColumn 
              title="Done" 
              tasks={doneTasks} 
              bgColor="bg-green-500"
              status="done"
              onDeleteTask={handleDeleteTask}
              canDeleteTask={canDeleteTask}
            />
          </div>
        </DragDropContext>

        {/* Loading indicator untuk drag and drop */}
        {isUpdating && (
          <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Updating task...</span>
          </div>
        )}

        {/* Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{tasks.length}</div>
                <div className="text-sm text-gray-600">Total Tasks</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{todoTasks.length}</div>
                <div className="text-sm text-gray-600">Todo</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{inProgressTasks.length}</div>
                <div className="text-sm text-gray-600">In Progress</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{doneTasks.length}</div>
                <div className="text-sm text-gray-600">Done</div>
              </div>
            </CardContent>
          </Card>        </div>
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
