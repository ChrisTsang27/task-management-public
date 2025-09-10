'use client'

import { useState, useEffect } from 'react'

import { useRouter } from 'next/navigation'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import supabase from '@/lib/supabaseBrowserClient'


export default function SignOutPage() {
  const [isDone, setIsDone] = useState(false)
  const router = useRouter()

  // Auto sign out if user navigates directly to this page
  useEffect(() => {
    const signOut = async () => {
      try {
        const { error } = await supabase.auth.signOut({
          scope: 'local'
        })
        
        if (error) {
          console.error('Sign out error:', error)
        } else {
          setIsDone(true)
          
          setTimeout(() => {
            router.push('/auth/sign-in')
          }, 1500)
        }
      } catch (error) {
        console.error('Unexpected error during sign out:', error)
      }
    }

    signOut()
  }, [router])

  if (isDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Signed Out</CardTitle>
            <CardDescription>
              You have been successfully signed out. Redirecting to sign-in page...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Signing Out</CardTitle>
          <CardDescription>
            Please wait while we sign you out...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}