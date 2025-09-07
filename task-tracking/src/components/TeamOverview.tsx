'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, CheckCircle, Clock, BarChart3, ExternalLink } from 'lucide-react'
import supabase from '@/lib/supabaseBrowserClient'

interface TeamStats {
  id: string
  name: string
  total: number
  todo: number
  in_progress: number
  done: number
  awaiting_approval: number
  pending_review: number
  approved: number
}

interface TeamOverviewProps {
  onTeamSelect: (teamId: string) => void
}

export default function TeamOverview({ onTeamSelect }: TeamOverviewProps) {
  const [teamStats, setTeamStats] = useState<TeamStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTeamStats()
  }, [])

  const fetchTeamStats = async () => {
    try {
      setLoading(true)
      
      // Get session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }
      
      const response = await fetch('/api/teams/stats', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch team stats')
      }
      
      const data = await response.json()
      setTeamStats(data)
    } catch (err) {
      console.error('Error fetching team stats:', err)
      setError(err instanceof Error ? err.message : 'Failed to load team stats')
    } finally {
      setLoading(false)
    }
  }



  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchTeamStats} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header with stats summary */}
      <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm border-b border-slate-600/30 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Team Overview</h1>
          </div>
          
          {/* Stats Summary Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-gray-700">Awaiting Approval</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{teamStats.reduce((sum, team) => sum + team.awaiting_approval, 0)}</div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">In Progress</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{teamStats.reduce((sum, team) => sum + team.in_progress, 0)}</div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium text-gray-700">Done</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{teamStats.reduce((sum, team) => sum + team.done, 0)}</div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">Pending Review</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{teamStats.reduce((sum, team) => sum + team.pending_review, 0)}</div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-teal-600" />
                <span className="text-sm font-medium text-gray-700">Approved</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{teamStats.reduce((sum, team) => sum + team.approved, 0)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Team Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {teamStats.map((team) => {
            return (
              <Card 
                key={team.id} 
                className="group hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 shadow-lg hover:shadow-blue-500/20"
                onClick={() => onTeamSelect(team.id)}
              >
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-xl font-semibold text-white">{team.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">{team.total}</div>
                      <div className="text-xs text-slate-400 uppercase tracking-wide">Total Tasks</div>
                    </div>
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                       <div className="flex items-center gap-3">
                         <div className="p-1.5 bg-amber-50 rounded-full">
                           <Clock className="h-4 w-4 text-amber-600" />
                         </div>
                         <span className="font-medium text-gray-700">Awaiting Approval</span>
                       </div>
                       <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200 font-semibold">
                         {team.awaiting_approval}
                       </Badge>
                     </div>
                     
                     <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                       <div className="flex items-center gap-3">
                         <div className="p-1.5 bg-blue-50 rounded-full">
                           <Clock className="h-4 w-4 text-blue-600" />
                         </div>
                         <span className="font-medium text-gray-700">In Progress</span>
                       </div>
                       <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200 font-semibold">
                         {team.in_progress}
                       </Badge>
                     </div>
                     
                     <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                       <div className="flex items-center gap-3">
                         <div className="p-1.5 bg-emerald-50 rounded-full">
                           <CheckCircle className="h-4 w-4 text-emerald-600" />
                         </div>
                         <span className="font-medium text-gray-700">Done</span>
                       </div>
                       <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200 font-semibold">
                         {team.done}
                       </Badge>
                     </div>
                     
                     {team.pending_review > 0 && (
                       <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                         <div className="flex items-center gap-3">
                           <div className="p-1.5 bg-purple-50 rounded-full">
                             <Clock className="h-4 w-4 text-purple-600" />
                           </div>
                           <span className="font-medium text-gray-700">Pending Review</span>
                         </div>
                         <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200 font-semibold">
                           {team.pending_review}
                         </Badge>
                       </div>
                     )}
                     
                     {team.approved > 0 && (
                       <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                         <div className="flex items-center gap-3">
                           <div className="p-1.5 bg-teal-50 rounded-full">
                             <CheckCircle className="h-4 w-4 text-teal-600" />
                           </div>
                           <span className="font-medium text-gray-700">Approved</span>
                         </div>
                         <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-200 border-teal-200 font-semibold">
                           {team.approved}
                         </Badge>
                       </div>
                     )}
                  </div>
                  
                  <Button 
                    className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 group border border-blue-500/30"
                    onClick={(e) => {
                      e.stopPropagation()
                      onTeamSelect(team.id)
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2 group-hover:translate-x-0.5 transition-transform" />
                    View Team Board
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
        
        {teamStats.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Teams Found</h3>
            <p className="text-slate-400">There are no teams configured in the system.</p>
          </div>
        )}
      </div>
    </div>
  )
}