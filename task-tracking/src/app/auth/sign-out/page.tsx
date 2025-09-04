'use client'

import supabase from '@/lib/supabaseBrowserClient'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignOutPage() {
  const [, setIsLoading] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const router = useRouter()

  const handleSignOut = useCallback(async () => {
    console.log('Starting sign out process...')
    setIsLoading(true)
    try {
      console.log('Calling supabase.auth.signOut()')
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Supabase sign out error:', error)
        throw error
      }
      console.log('Sign out successful, setting isDone to true')
      setIsDone(true)
      // Redirect to sign-in page after successful logout
      setTimeout(() => {
        console.log('Redirecting to sign-in page')
        router.push('/auth/sign-in')
      }, 1000)
    } catch (error) {
      console.error('Error signing out:', error)
      setIsLoading(false)
    }
  }, [router, setIsLoading])

  // Auto sign out if user navigates directly to this page
  useEffect(() => {
    handleSignOut()
  }, [handleSignOut])

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