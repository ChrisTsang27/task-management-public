'use client';

// Cursor test playground
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLucideCursor, useDualLucideCursor } from '@/hooks/useLucideCursor';
import { 
  Pointer, 
  Hand, 
  HandGrab, 
  TextCursor, 
  Move, 
  Trash2,
  Edit,
  Copy
} from 'lucide-react';

export default function CursorTestPage() {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [items, setItems] = useState([
    { id: '1', name: 'Item 1', color: 'bg-blue-500' },
    { id: '2', name: 'Item 2', color: 'bg-green-500' },
    { id: '3', name: 'Item 3', color: 'bg-purple-500' },
  ]);

  // Cursor refs
  const buttonCursorRef = useDualLucideCursor<HTMLButtonElement>(Pointer, {
    hoverIcon: Hand,
    color: "white",
    size: 24,
    strokeWidth: 3,
    hotspotX: 12,
    hotspotY: 12
  });

  const textCursorRef = useLucideCursor<HTMLInputElement>(TextCursor, {
    color: "white",
    size: 24,
    strokeWidth: 3,
    hotspotX: 0,
    hotspotY: 0
  });



  const moveCursorRef = useDualLucideCursor<HTMLDivElement>(Move, {
    hoverIcon: HandGrab,
    color: "white",
    size: 24,
    strokeWidth: 3,
    hotspotX: 12,
    hotspotY: 12
  });

  const deleteCursorRef = useDualLucideCursor<HTMLButtonElement>(Pointer, {
    hoverIcon: Trash2,
    color: "red",
    size: 24,
    strokeWidth: 3,
    hotspotX: 12,
    hotspotY: 12
  });

  const editCursorRef = useDualLucideCursor<HTMLButtonElement>(Pointer, {
    hoverIcon: Edit,
    color: "blue",
    size: 24,
    strokeWidth: 3,
    hotspotX: 12,
    hotspotY: 12
  });

  const copyCursorRef = useDualLucideCursor<HTMLButtonElement>(Pointer, {
    hoverIcon: Copy,
    color: "green",
    size: 24,
    strokeWidth: 3,
    hotspotX: 12,
    hotspotY: 12
  });

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId);
    e.dataTransfer.setData('text/plain', itemId);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain');
    console.log('Dropped item:', itemId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const deleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const duplicateItem = (item: typeof items[0]) => {
    const newItem = {
      ...item,
      id: Date.now().toString(),
      name: `${item.name} (Copy)`
    };
    setItems([...items, newItem]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-3xl font-bold">
              🎯 Cursor Test Playground
            </CardTitle>
            <CardDescription className="text-slate-300">
              Test all the custom cursor implementations across different UI elements
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Button Cursors Section */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Button Cursors</CardTitle>
            <CardDescription className="text-slate-300">
              Hover over buttons to see pointer → hand cursor transition
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Button ref={buttonCursorRef} variant="default">
                Primary Button
              </Button>
              <Button ref={buttonCursorRef} variant="secondary">
                Secondary Button
              </Button>
              <Button ref={buttonCursorRef} variant="outline">
                Outline Button
              </Button>
              <Button ref={buttonCursorRef} variant="destructive">
                Destructive Button
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Text Input Cursors Section */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Text Input Cursors</CardTitle>
            <CardDescription className="text-slate-300">
              Click on inputs to see text cursor
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                ref={textCursorRef}
                placeholder="Type something here..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900"
              />
              <input
                ref={textCursorRef}
                placeholder="Another input field"
                className="flex h-10 w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900"
              />
            </div>
          </CardContent>
        </Card>

        {/* Drag & Drop Section */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Drag & Drop Cursors</CardTitle>
            <CardDescription className="text-slate-300">
              Drag items to see hand grab cursor. Drop them in the drop zone below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  ref={moveCursorRef}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  onDragEnd={handleDragEnd}
                  className={`${item.color} p-4 rounded-lg text-white font-semibold text-center transition-all hover:scale-105 hover:shadow-lg ${
                    draggedItem === item.id ? 'opacity-50' : ''
                  }`}
                >
                  {item.name}
                </div>
              ))}
            </div>
            
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center text-slate-400 bg-slate-700/30 hover:border-slate-500 transition-colors"
            >
              Drop items here
            </div>
          </CardContent>
        </Card>

        {/* Action Cursors Section */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Action Cursors</CardTitle>
            <CardDescription className="text-slate-300">
              Different cursor colors and icons for different actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-700 p-4 rounded-lg border border-slate-600"
                >
                  <h3 className="text-white font-semibold mb-3">{item.name}</h3>
                  <div className="flex gap-2">
                    <button
                      ref={editCursorRef}
                      className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      ref={copyCursorRef}
                      onClick={() => duplicateItem(item)}
                      className="p-2 bg-green-600 hover:bg-green-700 rounded text-white transition-colors"
                      title="Copy"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      ref={deleteCursorRef}
                      onClick={() => deleteItem(item.id)}
                      className="p-2 bg-red-600 hover:bg-red-700 rounded text-white transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cursor Legend */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Cursor Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2 text-slate-300">
                <Pointer size={16} className="text-white" />
                <span>Default Pointer</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Hand size={16} className="text-white" />
                <span>Hover Hand</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <HandGrab size={16} className="text-white" />
                <span>Drag Grab</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <TextCursor size={16} className="text-white" />
                <span>Text Input</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Edit size={16} className="text-blue-400" />
                <span>Edit (Blue)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Copy size={16} className="text-green-400" />
                <span>Copy (Green)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Trash2 size={16} className="text-red-400" />
                <span>Delete (Red)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Move size={16} className="text-white" />
                <span>Move/Drag</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}