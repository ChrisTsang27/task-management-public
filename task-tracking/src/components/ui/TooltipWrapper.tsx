"use client";

import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TooltipWrapperProps {
  children: React.ReactNode;
  content: string;
  delayDuration?: number;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  className?: string;
  asChild?: boolean;
}

export function TooltipWrapper({
  children,
  content,
  delayDuration = 300,
  side = 'top',
  align = 'center',
  className,
  asChild = true
}: TooltipWrapperProps) {
  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip>
        <TooltipTrigger asChild={asChild} className={className}>
          {children}
        </TooltipTrigger>
        <TooltipContent side={side} align={align}>
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// For components that need multiple tooltips, provide a context wrapper
export function MultiTooltipProvider({ 
  children, 
  delayDuration = 300 
}: { 
  children: React.ReactNode;
  delayDuration?: number;
}) {
  return (
    <TooltipProvider delayDuration={delayDuration}>
      {children}
    </TooltipProvider>
  );
}

// Individual tooltip without provider (for use within MultiTooltipProvider)
export function SimpleTooltip({
  children,
  content,
  side = 'top',
  align = 'center',
  className,
  asChild = true
}: Omit<TooltipWrapperProps, 'delayDuration'>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild={asChild} className={className}>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} align={align}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
}