import {
  Type,
  TextCursor,
  Hand,
  Grab,
  Loader,
  MousePointer2,
  Ban,
  MousePointer,
  Move,
  MoveUpRight,
  MoveUpLeft,
  MoveHorizontal,
  MoveVertical,
  Pointer,
  PointerOff,
  LucideIcon
} from 'lucide-react';
import React from 'react';

// Mapping of cursor names to Lucide icons
export const cursorIconMap: Record<string, LucideIcon> = {
  'text-cursor': TextCursor,
  'hand': Hand,
  'hand-grab': Grab,
  'loader': Loader,
  'mouse-pointer-2': MousePointer2,
  'mouse-pointer-ban': Ban,
  'mouse-pointer-click': MousePointer,
  'move': Move,
  'move-diagonal': MoveUpRight,
  'move-diagonal-2': MoveUpLeft,
  'move-horizontal': MoveHorizontal,
  'move-vertical': MoveVertical,
  'pointer': Pointer,
  'pointer-off': PointerOff,
};

// Type for cursor names
export type CursorName = keyof typeof cursorIconMap;

// Helper function to get icon by name
export function getCursorIcon(name: CursorName): LucideIcon {
  return cursorIconMap[name];
}

// Get all available cursor names
export function getAvailableCursorNames(): CursorName[] {
  return Object.keys(cursorIconMap) as CursorName[];
}

// Predefined cursor configurations
export const cursorConfigs = {
  'text-cursor': {
    icon: TextCursor,
    color: '#ffffff',
    size: 24,
    strokeWidth: 3,
    hotspotX: 12,
    hotspotY: 12,
    description: 'Text editing cursor (I-beam)'
  },
  'hand': {
    icon: Hand,
    color: '#ffffff',
    size: 24,
    strokeWidth: 3,
    hotspotX: 12,
    hotspotY: 6,
    description: 'Hand pointer for interactive elements'
  },
  'hand-grab': {
    icon: Grab,
    color: '#ffffff',
    size: 24,
    strokeWidth: 3,
    hotspotX: 12,
    hotspotY: 12,
    description: 'Grabbing cursor for draggable elements'
  },
  'loader': {
    icon: Loader,
    color: '#ffffff',
    size: 24,
    strokeWidth: 3,
    hotspotX: 12,
    hotspotY: 12,
    description: 'Loading cursor'
  },
  'mouse-pointer-2': {
    icon: MousePointer2,
    color: '#ffffff',
    size: 24,
    strokeWidth: 3,
    hotspotX: 0,
    hotspotY: 0,
    description: 'Standard mouse pointer'
  },
  'mouse-pointer-ban': {
    icon: Ban,
    color: '#ffffff',
    size: 24,
    strokeWidth: 3,
    hotspotX: 12,
    hotspotY: 12,
    description: 'Forbidden/disabled cursor'
  },
  'mouse-pointer-click': {
    icon: MousePointer,
    color: '#ffffff',
    size: 24,
    strokeWidth: 3,
    hotspotX: 0,
    hotspotY: 0,
    description: 'Clickable element cursor'
  },
  'move': {
    icon: Move,
    color: '#ffffff',
    size: 24,
    strokeWidth: 3,
    hotspotX: 12,
    hotspotY: 12,
    description: 'Move cursor for draggable elements'
  },
  'move-diagonal': {
    icon: MoveUpRight,
    color: '#ffffff',
    size: 24,
    strokeWidth: 3,
    hotspotX: 12,
    hotspotY: 12,
    description: 'Diagonal resize cursor'
  },
  'move-diagonal-2': {
    icon: MoveUpLeft,
    color: '#ffffff',
    size: 24,
    strokeWidth: 3,
    hotspotX: 12,
    hotspotY: 12,
    description: 'Diagonal resize cursor (opposite direction)'
  },
  'move-horizontal': {
    icon: MoveHorizontal,
    color: '#ffffff',
    size: 24,
    strokeWidth: 3,
    hotspotX: 12,
    hotspotY: 12,
    description: 'Horizontal resize cursor'
  },
  'move-vertical': {
    icon: MoveVertical,
    color: '#ffffff',
    size: 24,
    strokeWidth: 3,
    hotspotX: 12,
    hotspotY: 12,
    description: 'Vertical resize cursor'
  },
  'pointer': {
    icon: Pointer,
    color: '#ffffff',
    size: 24,
    strokeWidth: 3,
    hotspotX: 0,
    hotspotY: 0,
    description: 'Pointer cursor'
  },
  'pointer-off': {
    icon: PointerOff,
    color: '#ffffff',
    size: 24,
    strokeWidth: 3,
    hotspotX: 0,
    hotspotY: 0,
    description: 'Disabled pointer cursor'
  },
} as const;

export type CursorConfig = typeof cursorConfigs[keyof typeof cursorConfigs];