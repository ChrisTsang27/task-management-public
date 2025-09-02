'use client';

import { useState } from 'react';
import { lucideCursors, createLucideCursor, generateCursorCSS, getAvailableIcons } from '@/lib/cursor-utils';

export default function CursorDemoPage() {
  const [selectedIcon, setSelectedIcon] = useState('MousePointer2');
  const [color, setColor] = useState('#ffffff');
  const [size, setSize] = useState(20);
  const [strokeWidth, setStrokeWidth] = useState(2);

  const availableIcons = getAvailableIcons();
  const customCursor = createLucideCursor(selectedIcon, { color, size, strokeWidth });

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Lucide Cursor Utilities Demo</h1>
      
      {/* Predefined Cursors */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Predefined Cursors</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.entries(lucideCursors).map(([name, cursorStyle]) => (
            <div
              key={name}
              className="p-4 bg-gray-800 rounded-lg text-center hover:bg-gray-700 transition-colors"
              style={{ cursor: cursorStyle }}
            >
              <div className="font-medium capitalize">{name}</div>
              <div className="text-sm text-gray-400 mt-1">Hover to see cursor</div>
            </div>
          ))}
        </div>
      </section>

      {/* Custom Cursor Builder */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Custom Cursor Builder</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Icon</label>
              <select
                value={selectedIcon}
                onChange={(e) => setSelectedIcon(e.target.value)}
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
              >
                {availableIcons.map((icon) => (
                  <option key={icon} value={icon}>{icon}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-12 h-10 bg-gray-800 border border-gray-700 rounded"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="flex-1 p-2 bg-gray-800 border border-gray-700 rounded"
                  placeholder="#ffffff"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Size: {size}px</label>
              <input
                type="range"
                min="16"
                max="32"
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Stroke Width: {strokeWidth}</label>
              <input
                type="range"
                min="1"
                max="4"
                step="0.5"
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-4">Preview</h3>
            <div
              className="h-40 bg-gray-800 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-600"
              style={{ cursor: customCursor }}
            >
              <div className="text-center">
                <div className="text-lg font-medium">{selectedIcon}</div>
                <div className="text-sm text-gray-400">Move cursor here</div>
              </div>
            </div>
            
            <div className="mt-4">
              <h4 className="font-medium mb-2">Generated CSS:</h4>
              <pre className="bg-gray-800 p-3 rounded text-xs overflow-x-auto">
                <code>{generateCursorCSS('my-cursor', selectedIcon, { color, size, strokeWidth })}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Usage Examples */}
      <section>
        <h2 className="text-2xl font-semibold mb-6">Usage Examples</h2>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-medium mb-4">Code Examples</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-green-400 mb-2">1. Using Predefined Cursors</h4>
              <pre className="bg-gray-900 p-3 rounded text-sm overflow-x-auto">
                <code>{`import { lucideCursors } from '@/lib/cursor-utils';

// Apply to element style
element.style.cursor = lucideCursors.pointer;

// Or use in CSS-in-JS
const styles = {
  cursor: lucideCursors.ban
};`}</code>
              </pre>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-400 mb-2">2. Creating Custom Cursors</h4>
              <pre className="bg-gray-900 p-3 rounded text-sm overflow-x-auto">
                <code>{`import { createLucideCursor } from '@/lib/cursor-utils';

const customCursor = createLucideCursor('Hand', {
  color: '#ff6b6b',
  size: 24,
  strokeWidth: 2.5,
  fallback: 'pointer'
});`}</code>
              </pre>
            </div>
            
            <div>
              <h4 className="font-medium text-purple-400 mb-2">3. Generating CSS Classes</h4>
              <pre className="bg-gray-900 p-3 rounded text-sm overflow-x-auto">
                <code>{`import { generateCursorCSS } from '@/lib/cursor-utils';

const cssRule = generateCursorCSS('hover-cursor', 'MousePointerClick', {
  color: '#4ade80',
  size: 22
});

// Output: .hover-cursor { cursor: url('data:image/svg+xml...'), pointer; }`}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}