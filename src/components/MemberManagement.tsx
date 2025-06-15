'use client'

import { useState } from 'react'
import { useProjectMembers } from '@/hooks/useProjectMembers'
import { useUserSearch } from '@/hooks/useUserSearch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Users, Plus, Loader2, Mail, Trash2 } from 'lucide-react'

interface MemberManagementProps {
  projectId: string
  isOwner: boolean
}

export function MemberManagement({ projectId, isOwner }: MemberManagementProps) {
  const { members, project, mutate } = useProjectMembers(projectId)
  const { query, setQuery, users, isLoading: isSearching, clearResults } = useUserSearch()
  const [isOpen, setIsOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isRemoving, setIsRemoving] = useState<string | null>(null)

  const handleAddMember = async (email: string) => {
    setIsAdding(true)
    
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        mutate() // Refresh members list
        clearResults()
        setQuery('')
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to add member')
      }
    } catch (error) {
      console.error('Error adding member:', error)
      alert('An error occurred while adding member')
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    setIsRemoving(userId)
    
    try {
      const response = await fetch(`/api/projects/${projectId}/members/${userId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        mutate() // Refresh members list
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to remove member')
      }
    } catch (error) {
      console.error('Error removing member:', error)
      alert('An error occurred while removing member')
    } finally {
      setIsRemoving(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Users className="h-4 w-4 mr-2" />
          Kelola Member ({members.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Kelola Member Project</DialogTitle>
          <DialogDescription>
            Tambah atau hapus member dari project &quot;{project?.name}&quot;
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Add Member Section */}
          {isOwner && (
            <div className="border-b pb-4 mb-4">
              <Label className="text-sm font-medium mb-2 block">
                Tambah Member Baru
              </Label>
              <div className="space-y-2">
                <Input
                  placeholder="Cari berdasarkan email..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full"
                />
                
                {/* Search Results */}
                {query.length >= 2 && (
                  <Card className="border">
                    <CardContent className="p-2 max-h-48 overflow-y-auto">
                      {isSearching ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span className="text-sm text-gray-500">Mencari...</span>
                        </div>
                      ) : users.length > 0 ? (                        <div className="space-y-1">
                          {users.filter(user => user && user.id && user.email).map((user) => (
                            <div 
                              key={user.id}
                              className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                            >
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-gray-400" />
                                <span className="text-sm">{user.email}</span>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddMember(user.email)}
                                disabled={isAdding}
                              >
                                {isAdding ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Plus className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <span className="text-sm text-gray-500">
                            Tidak ada user ditemukan
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Current Members List */}
          <div className="flex-1 overflow-hidden">
            <Label className="text-sm font-medium mb-2 block">
              Member Saat Ini
            </Label>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {/* Owner */}
              {project?.owner && (
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <div>
                          <span className="text-sm font-medium">
                            {project.owner.email}
                          </span>
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Owner
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}              {/* Members */}
              {members
                .filter(member => member && member.id && member.user && member.userId !== project?.ownerId)
                .map((member) => (
                <Card key={member.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <div>
                          <span className="text-sm font-medium">
                            {member.user.email}
                          </span>
                          <span className="ml-2 text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                            Member
                          </span>
                        </div>
                      </div>
                      {isOwner && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveMember(member.userId)}
                          disabled={isRemoving === member.userId}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {isRemoving === member.userId ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {members.filter(member => member.userId !== project?.ownerId).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Belum ada member lain dalam project ini</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
