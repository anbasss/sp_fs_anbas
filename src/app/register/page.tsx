"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

interface RegisterResponse {
  success?: boolean
  message?: string
  error?: string
  details?: Record<string, string[]>
}

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    // Validasi konfirmasi password
    if (password !== confirmPassword) {
      setError("Password dan konfirmasi password tidak sama")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })

      const data: RegisterResponse = await response.json()

      if (response.ok && data.success) {
        setSuccess("Akun berhasil dibuat! Redirecting to login...")
        setTimeout(() => {
          router.push("/login")
        }, 2000)
      } else {
        if (data.details) {
          // Handle validation errors from Zod
          const errorMessages = Object.values(data.details).flat()
          setError(errorMessages.join(", "))
        } else {
          setError(data.error || "Terjadi kesalahan saat mendaftar")
        }
      }    } catch {
      setError("Terjadi kesalahan jaringan")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Buat Akun Baru
          </CardTitle>
          <CardDescription className="text-center">
            Daftar untuk memulai menggunakan aplikasi
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Ulangi password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            {error && (
              <div className="text-sm text-red-600 text-center bg-red-50 p-3 rounded">
                {error}
              </div>
            )}
            {success && (
              <div className="text-sm text-green-600 text-center bg-green-50 p-3 rounded">
                {success}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Mendaftar..." : "Daftar"}
            </Button>
            <div className="text-center text-sm">
              Sudah punya akun?{" "}
              <Link href="/login" className="text-blue-600 hover:text-blue-500 font-medium">
                Masuk di sini
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
