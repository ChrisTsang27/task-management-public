'use client';

import { useGlobalLucideCursor } from '@/hooks/useLucideCursor';
import { MousePointer2 } from 'lucide-react';

export default function GlobalCursor() {
  // Apply global system cursor
  useGlobalLucideCursor(MousePointer2, {
    color: '#ffffff',
    size: 24,
    strokeWidth: 3,
    hotspotX: 0,
    hotspotY: 0
  });

  return null; // This component doesn't render anything
}