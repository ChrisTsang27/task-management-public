'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { cursorIconMap } from '@/lib/cursor-icons';

import { useLucideCursor, useGlobalLucideCursor } from '@/hooks/useLucideCursor';

const availableIcons = {
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
  'None': null
};

export default function CursorLucideDemo() {
  const [globalCursor, setGlobalCursor] = useState<keyof typeof availableIcons>('None');
  const [cursorColor, setCursorColor] = useState('#ffffff');
  const [cursorSize, setCursorSize] = useState(20);
  const [strokeWidth, setStrokeWidth] = useState(2);

  // Apply global cursor
  useGlobalLucideCursor(availableIcons[globalCursor], {
    color: cursorColor,
    size: cursorSize,
    strokeWidth: strokeWidth,
    hotspotX: 0,
    hotspotY: 0
  });

  // Individual element cursors
  const textCursorRef = useLucideCursor<HTMLDivElement>(TextCursor, { color: '#3b82f6', size: 24 });
  const handRef = useLucideCursor<HTMLDivElement>(Hand, { color: '#ef4444', size: 24 });
  const grabRef = useLucideCursor<HTMLDivElement>(Grab, { color: '#10b981', size: 24 });
  const moveRef = useLucideCursor<HTMLDivElement>(Move, { color: '#f59e0b', size: 24 });
  const pointerRef = useLucideCursor<HTMLDivElement>(MousePointer2, { color: '#8b5cf6', size: 24 });
  const banRef = useLucideCursor<HTMLDivElement>(Ban, { color: '#dc2626', size: 24 });

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Lucide Cursor Demo</h1>
        
        {/* Global Cursor Controls */}
        <div className="bg-gray-800 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-semibold mb-4">Global Cursor Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Cursor Icon</label>
              <select 
                value={globalCursor} 
                onChange={(e) => setGlobalCursor(e.target.value as keyof typeof availableIcons)}
                className="w-full p-2 bg-gray-700 rounded border border-gray-600"
              >
                {Object.keys(availableIcons).map(iconName => (
                  <option key={iconName} value={iconName}>{iconName}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Color</label>
              <input 
                type="color" 
                value={cursorColor} 
                onChange={(e) => setCursorColor(e.target.value)}
                className="w-full h-10 bg-gray-700 rounded border border-gray-600"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Size: {cursorSize}px</label>
              <input 
                type="range" 
                min="16" 
                max="32" 
                value={cursorSize} 
                onChange={(e) => setCursorSize(Number(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Stroke Width: {strokeWidth}</label>
              <input 
                type="range" 
                min="1" 
                max="4" 
                value={strokeWidth} 
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
          
          <p className="text-sm text-gray-400">
            Current global cursor: <span className="font-mono">{globalCursor}</span>
          </p>
        </div>

        {/* Individual Element Cursors */}
        <div className="bg-gray-800 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-semibold mb-4">Individual Element Cursors</h2>
          <p className="text-gray-400 mb-4">Hover over these elements to see different cursors:</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div 
              ref={textCursorRef}
              className="bg-blue-600 p-4 rounded-lg text-center cursor-pointer hover:bg-blue-700 transition-colors"
            >
              <TextCursor className="mx-auto mb-2" size={24} />
              <p>Text Cursor (Blue)</p>
            </div>
            
            <div 
              ref={handRef}
              className="bg-red-600 p-4 rounded-lg text-center cursor-pointer hover:bg-red-700 transition-colors"
            >
              <Hand className="mx-auto mb-2" size={24} />
              <p>Hand (Red)</p>
            </div>
            
            <div 
              ref={grabRef}
              className="bg-green-600 p-4 rounded-lg text-center cursor-pointer hover:bg-green-700 transition-colors"
            >
              <Grab className="mx-auto mb-2" size={24} />
              <p>Hand Grab (Green)</p>
            </div>
            
            <div 
              ref={moveRef}
              className="bg-yellow-600 p-4 rounded-lg text-center cursor-pointer hover:bg-yellow-700 transition-colors"
            >
              <Move className="mx-auto mb-2" size={24} />
              <p>Move (Yellow)</p>
            </div>
            
            <div 
              ref={pointerRef}
              className="bg-purple-600 p-4 rounded-lg text-center cursor-pointer hover:bg-purple-700 transition-colors"
            >
              <MousePointer2 className="mx-auto mb-2" size={24} />
              <p>Mouse Pointer 2 (Purple)</p>
            </div>
            
            <div 
              ref={banRef}
              className="bg-red-800 p-4 rounded-lg text-center cursor-pointer hover:bg-red-900 transition-colors"
            >
              <Ban className="mx-auto mb-2" size={24} />
              <p>Pointer Ban (Dark Red)</p>
            </div>
          </div>
        </div>

        {/* Usage Examples */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Usage Examples</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Global Cursor Hook:</h3>
              <pre className="bg-gray-900 p-3 rounded text-sm overflow-x-auto">
                <code>{`import { MousePointer2 } from 'lucide-react';
import { useGlobalLucideCursor } from '@/hooks/useLucideCursor';

function App() {
  useGlobalLucideCursor(MousePointer2, {
    color: '#ffffff',
    size: 20,
    strokeWidth: 2
  });
  
  return <div>Your app content</div>;
}`}</code>
              </pre>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Element-specific Cursor Hook:</h3>
              <pre className="bg-gray-900 p-3 rounded text-sm overflow-x-auto">
                <code>{`import { Hand } from 'lucide-react';
import { useLucideCursor } from '@/hooks/useLucideCursor';

function Button() {
  const ref = useLucideCursor(Hand, { color: '#ef4444', size: 24 });
  
  return (
    <button ref={ref}>
      Click me!
    </button>
  );
}`}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}