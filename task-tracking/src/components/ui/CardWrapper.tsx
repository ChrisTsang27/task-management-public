"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from './LoadingSpinner';

interface CardWrapperProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  isLoading?: boolean;
  loadingText?: string;
  actions?: React.ReactNode;
}

export function CardWrapper({
  title,
  description,
  children,
  className,
  headerClassName,
  contentClassName,
  isLoading = false,
  loadingText,
  actions
}: CardWrapperProps) {
  return (
    <Card className={cn('w-full', className)}>
      {(title || description || actions) && (
        <CardHeader className={cn('flex flex-row items-center justify-between space-y-0 pb-2', headerClassName)}>
          <div className="space-y-1">
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {actions && (
            <div className="flex items-center space-x-2">
              {actions}
            </div>
          )}
        </CardHeader>
      )}
      <CardContent className={cn('pt-6', contentClassName)}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner text={loadingText} />
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

// Specialized card for stats/metrics
export function StatsCard({
  title,
  value,
  description,
  icon,
  trend,
  className,
  isLoading = false
}: {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  className?: string;
  isLoading?: boolean;
}) {
  return (
    <Card className={cn('p-6', className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {isLoading ? (
            <LoadingSpinner size="sm" />
          ) : (
            <>
              <p className="text-2xl font-bold">{value}</p>
              {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
              {trend && (
                <div className={cn(
                  'flex items-center text-xs',
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                )}>
                  <span>{trend.isPositive ? '+' : ''}{trend.value}%</span>
                  <span className="ml-1 text-muted-foreground">{trend.label}</span>
                </div>
              )}
            </>
          )}
        </div>
        {icon && (
          <div className="text-muted-foreground">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

// Error state card
export function ErrorCard({
  title = 'Error',
  message,
  retry,
  className
}: {
  title?: string;
  message: string;
  retry?: () => void;
  className?: string;
}) {
  return (
    <Card className={cn('border-red-200 bg-red-50', className)}>
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          <div className="text-red-600">
            <h3 className="font-medium">{title}</h3>
            <p className="text-sm mt-1">{message}</p>
          </div>
          {retry && (
            <button
              onClick={retry}
              className="text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}