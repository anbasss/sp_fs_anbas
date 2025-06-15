"use client"

import { useSession, signIn, signOut } from "next-auth/react"

export default function AuthExample() {
  const { data: session, status } = useSession()

  if (status === "loading") return <p>Loading...</p>

  if (session) {
    return (
      <div className="p-4 border rounded-lg">
        <h2 className="text-xl font-bold mb-4">Selamat datang!</h2>
        <p className="mb-2">Signed in as: {session.user?.email}</p>
        <p className="mb-4">User ID: {session.user?.id}</p>
        <button 
          onClick={() => signOut()}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Sign out
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 border rounded-lg">
      <h2 className="text-xl font-bold mb-4">Silakan login</h2>
      <p className="mb-4">Not signed in</p>
      <button 
        onClick={() => signIn()}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Sign in
      </button>
    </div>
  )
}
