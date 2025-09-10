'use client'

import { useState, useEffect } from 'react'

import { Users, CheckCircle, Clock, BarChart3, ExternalLink } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

  const totalTasks = teamStats.reduce((sum, team) => sum + team.total, 0)
  const completedTasks = teamStats.reduce((sum, team) => sum + team.done, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden rounded-3xl">
      {/* Enhanced animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orbs */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-500/15 to-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-500/15 to-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-cyan-500/8 to-blue-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
        
        {/* Geometric patterns */}
        <div className="absolute top-20 right-20 w-32 h-32 border border-blue-500/20 rotate-45 animate-spin" style={{animationDuration: '20s'}}></div>
        <div className="absolute bottom-32 left-32 w-24 h-24 border border-purple-500/20 rotate-12 animate-spin" style={{animationDuration: '15s', animationDirection: 'reverse'}}></div>
        
        {/* Floating dots */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-400/40 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
        <div className="absolute top-3/4 right-1/4 w-1.5 h-1.5 bg-purple-400/40 rounded-full animate-bounce" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-3/4 w-1 h-1 bg-cyan-400/40 rounded-full animate-bounce" style={{animationDelay: '2s'}}></div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}></div>
        
        {/* Radial gradient mesh */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-blue-500/[0.01] to-transparent"></div>
      </div>

      {/* Enhanced Header with stats summary */}
      <div className="relative bg-gradient-to-br from-blue-800/50 via-indigo-700/45 to-purple-800/50 backdrop-blur-xl border-b border-blue-400/20 shadow-2xl overflow-hidden">
        {/* Header background pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/15 via-purple-400/20 to-indigo-400/15"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.08) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.08) 0%, transparent 50%)`
        }}></div>
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header Title Section */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl blur-lg opacity-50 animate-pulse"></div>
                <div className="relative p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
              </div>
              <div>
              <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                Team Overview
              </h1>
              <p className="text-slate-400 text-lg mt-1 mb-4">Monitor team progress and task distribution</p>
              
              {/* Team Statistics Pills */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700/50">
                  <div className="w-3 h-3 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-slate-300">Active Teams: {teamStats.length}</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700/50">
                  <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-slate-300">Total Tasks: {totalTasks}</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700/50">
                  <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-slate-300">Completed: {completedTasks}</span>
                </div>
              </div>
            </div>
            </div>
            
            {/* Overall Progress Indicator */}
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-3xl font-bold text-white">{totalTasks}</div>
                <div className="text-sm text-slate-400 uppercase tracking-wide">Total Tasks</div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-white">{completedTasks}</div>
                <div className="text-sm text-slate-400 uppercase tracking-wide">Completed</div>
              </div>
            </div>
          </div>
          
          {/* Enhanced Stats Summary Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="group relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-xl hover:shadow-2xl transition-shadow duration-300 p-5">
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-white/90">Awaiting Approval</span>
                </div>
                <div className="text-3xl font-bold text-white mb-1">{teamStats.reduce((sum, team) => sum + team.awaiting_approval, 0)}</div>
                <div className="w-full bg-white/10 rounded-full h-1.5">
                  <div 
                    className="bg-gradient-to-r from-amber-500 to-orange-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${totalTasks > 0 ? (teamStats.reduce((sum, team) => sum + team.awaiting_approval, 0) / totalTasks) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="group relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-xl hover:shadow-2xl transition-shadow duration-300 p-5">
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-white/90">In Progress</span>
                </div>
                <div className="text-3xl font-bold text-white mb-1">{teamStats.reduce((sum, team) => sum + team.in_progress, 0)}</div>
                <div className="w-full bg-white/10 rounded-full h-1.5">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${totalTasks > 0 ? (teamStats.reduce((sum, team) => sum + team.in_progress, 0) / totalTasks) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="group relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-xl hover:shadow-2xl transition-shadow duration-300 p-5">
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl shadow-lg">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-white/90">Completed</span>
                </div>
                <div className="text-3xl font-bold text-white mb-1">{teamStats.reduce((sum, team) => sum + team.done, 0)}</div>
                <div className="w-full bg-white/10 rounded-full h-1.5">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-green-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${totalTasks > 0 ? (teamStats.reduce((sum, team) => sum + team.done, 0) / totalTasks) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="group relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-xl hover:shadow-2xl transition-shadow duration-300 p-5">
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-white/90">Pending Review</span>
                </div>
                <div className="text-3xl font-bold text-white mb-1">{teamStats.reduce((sum, team) => sum + team.pending_review, 0)}</div>
                <div className="w-full bg-white/10 rounded-full h-1.5">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${totalTasks > 0 ? (teamStats.reduce((sum, team) => sum + team.pending_review, 0) / totalTasks) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="group relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-xl hover:shadow-2xl transition-shadow duration-300 p-5">
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl shadow-lg">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-white/90">Approved</span>
                </div>
                <div className="text-3xl font-bold text-white mb-1">{teamStats.reduce((sum, team) => sum + team.approved, 0)}</div>
                <div className="w-full bg-white/10 rounded-full h-1.5">
                  <div 
                    className="bg-gradient-to-r from-teal-500 to-cyan-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${totalTasks > 0 ? (teamStats.reduce((sum, team) => sum + team.approved, 0) / totalTasks) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative bg-gradient-to-br from-blue-600/15 via-indigo-500/10 to-purple-600/15 min-h-screen">
        <div className="relative max-w-7xl mx-auto px-6 py-10">




        {/* Enhanced Team Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {teamStats.map((team) => {
            const activeTasksCount = team.awaiting_approval + team.in_progress + team.pending_review
            
            return (
              <Card 
                key={team.id} 
                className="group relative overflow-hidden cursor-pointer bg-gradient-to-br from-slate-800/60 via-slate-800/40 to-slate-900/60 backdrop-blur-2xl border border-slate-700/50 shadow-xl hover:shadow-2xl transition-shadow duration-300"
                onClick={() => onTeamSelect(team.id)}
              >
                
                <CardHeader className="relative pb-6">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="relative p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                          <Users className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div>
                        <span className="text-xl font-bold text-white">{team.name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="text-sm text-slate-400">{activeTasksCount} active</div>
                          <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
                          <div className="text-sm text-emerald-400">{team.done} completed</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Total Tasks Display */}
                     <div className="text-right">
                       <div className="text-2xl font-bold text-white">{team.total}</div>
                       <div className="text-xs text-slate-400 uppercase tracking-wide">Total Tasks</div>
                     </div>
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="relative space-y-4">
                  {/* Task Status Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Awaiting Approval */}
                    <div className="group/item relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:shadow-lg transition-shadow duration-300 p-3">
                      <div className="relative">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg">
                            <Clock className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-xs font-medium text-white/90">Awaiting</span>
                        </div>
                        <div className="text-lg font-bold text-white">{team.awaiting_approval}</div>
                      </div>
                    </div>
                    
                    {/* In Progress */}
                    <div className="group/item relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:shadow-lg transition-shadow duration-300 p-3">
                      <div className="relative">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
                            <Clock className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-xs font-medium text-white/90">Progress</span>
                        </div>
                        <div className="text-lg font-bold text-white">{team.in_progress}</div>
                      </div>
                    </div>
                    
                    {/* Pending Review */}
                    <div className="group/item relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:shadow-lg transition-shadow duration-300 p-3">
                      <div className="relative">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                            <Clock className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-xs font-medium text-white/90">Review</span>
                        </div>
                        <div className="text-lg font-bold text-white">{team.pending_review}</div>
                      </div>
                    </div>
                    
                    {/* Completed */}
                    <div className="group/item relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:shadow-lg transition-shadow duration-300 p-3">
                      <div className="relative">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg">
                            <CheckCircle className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-xs font-medium text-white/90">Done</span>
                        </div>
                        <div className="text-lg font-bold text-white">{team.done}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  <Button 
                    className="w-full mt-6 bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 hover:from-blue-700 hover:via-purple-700 hover:to-cyan-700 text-white font-semibold py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 group/btn border-0 relative overflow-hidden"
                    onClick={(e) => {
                      e.stopPropagation()
                      onTeamSelect(team.id)
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center justify-center gap-2">
                      <ExternalLink className="h-4 w-4 group-hover/btn:translate-x-1 group-hover/btn:scale-110 transition-all duration-300" />
                      <span>View Team Board</span>
                    </div>
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
    </div>
  )
}