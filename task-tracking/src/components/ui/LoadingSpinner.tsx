"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8'
};

export function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      <div 
        className={cn(
          'border-2 border-gray-300 border-t-transparent rounded-full animate-spin',
          sizeClasses[size],
          className
        )}
      />
      {text && (
        <span className="text-sm text-gray-600">{text}</span>
      )}
    </div>
  );
}

export function LoadingCard({ title, description }: { title?: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <LoadingSpinner size="lg" />
      {title && <h3 className="text-lg font-medium">{title}</h3>}
      {description && <p className="text-sm text-gray-500 text-center">{description}</p>}
    </div>
  );
}

export function LoadingState({ children, isLoading, fallback }: {
  children: React.ReactNode;
  isLoading: boolean;
  fallback?: React.ReactNode;
}) {
  if (isLoading) {
    return fallback || <LoadingSpinner />;
  }
  return <>{children}</>;
}