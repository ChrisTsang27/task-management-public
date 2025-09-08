"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, RefreshCw, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIPriorityToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  onRecalculate?: () => void;
  isRecalculating?: boolean;
  className?: string;
}

export function AIPriorityToggle({
  enabled,
  onToggle,
  onRecalculate,
  isRecalculating = false,
  className = ''
}: AIPriorityToggleProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* AI Priority Toggle */}
      <Button
        variant={enabled ? 'default' : 'outline'}
        size="sm"
        onClick={() => onToggle(!enabled)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'relative overflow-hidden transition-all duration-300 ease-out',
          enabled
            ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-purple-500/50'
            : 'border-slate-600/50 text-slate-300 hover:border-purple-500/50 hover:text-purple-300 bg-slate-800/50'
        )}
      >
        {/* Animated Background */}
        <div className={cn(
          'absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 transition-opacity duration-300',
          enabled && isHovered ? 'opacity-100' : 'opacity-0'
        )} />
        
        {/* Content */}
        <div className="relative flex items-center gap-2">
          <Brain className={cn(
            'w-4 h-4 transition-all duration-300',
            enabled ? 'text-white' : 'text-slate-400',
            isHovered && 'scale-110'
          )} />
          <span className="font-medium">
            AI Priority
          </span>
          {enabled && (
            <Sparkles className="w-3 h-3 text-yellow-300 animate-pulse" />
          )}
        </div>
      </Button>

      {/* Status Badge */}
      {enabled && (
        <Badge 
          variant="secondary" 
          className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 text-purple-200 border-purple-700/50 animate-fade-in"
        >
          <TrendingUp className="w-3 h-3 mr-1" />
          Active
        </Badge>
      )}

      {/* Recalculate Button */}
      {enabled && onRecalculate && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRecalculate}
          disabled={isRecalculating}
          className="border-slate-600/50 text-slate-300 hover:border-blue-500/50 hover:text-blue-300 bg-slate-800/50 transition-all duration-300"
        >
          <RefreshCw className={cn(
            'w-4 h-4 mr-2',
            isRecalculating && 'animate-spin'
          )} />
          {isRecalculating ? 'Calculating...' : 'Recalculate'}
        </Button>
      )}
    </div>
  );
}

export default AIPriorityToggle;