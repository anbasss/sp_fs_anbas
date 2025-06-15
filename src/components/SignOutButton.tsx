"use client"

import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"

export default function SignOutButton() {
  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" })
  }

  return (
    <Button 
      onClick={handleSignOut}
      variant="destructive"
    >
      Keluar
    </Button>
  )
}
