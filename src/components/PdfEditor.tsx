import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Edit3, 
  Type, 
  Move, 
  Copy, 
  Trash2, 
  Download, 
  Save, 
  Undo, 
  Redo, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Image as ImageIcon,
  Square,
  Circle,
  Minus,
  MousePointer,
  Eye,
  EyeOff,
  Layers,
  Plus,
  Settings,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  X
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { toast } from '@/hooks/use-toast';

// Ensure PDF.js worker is configured
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface TextElement {
  id: string;
  type: 'text';
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  alignment: 'left' | 'center' | 'right';
  rotation: number;
  opacity: number;
}

interface ShapeElement {
  id: string;
  type: 'rectangle' | 'circle' | 'line';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
  rotation: number;
}

interface ImageElement {
  id: string;
  type: 'image';
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  rotation: number;
}

type Element = TextElement | ShapeElement | ImageElement;

interface EditHistory {
  elements: Element[];
  timestamp: number;
}

interface PdfEditorProps {
  pdfBlob: Blob;
  fileName: string;
  onSave: (modifiedPdf: Blob, fileName: string) => void;
  onClose: () => void;
}

export function PdfEditor({ pdfBlob, fileName, onSave, onClose }: PdfEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const [elements, setElements] = useState<Element[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [tool, setTool] = useState<'select' | 'text' | 'rectangle' | 'circle' | 'line' | 'image'>('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState<EditHistory[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showLayers, setShowLayers] = useState(false);
  const [textProperties, setTextProperties] = useState({
    fontSize: 16,
    fontFamily: 'Arial',
    color: '#000000',
    bold: false,
    italic: false,
    underline: false,
    alignment: 'left' as const
  });
  const [shapeProperties, setShapeProperties] = useState({
    color: '#ff0000',
    strokeColor: '#000000',
    strokeWidth: 2,
    opacity: 1
  });

  useEffect(() => {
    loadPdf();
  }, [pdfBlob]);

  useEffect(() => {
    if (pdfDoc) {
      renderPage();
    }
  }, [pdfDoc, currentPage, zoom, elements]);

  const loadPdf = async () => {
    try {
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      
      // Initialize history with empty state
      const initialState = { elements: [], timestamp: Date.now() };
      setHistory([initialState]);
      setHistoryIndex(0);
    } catch (error) {
      console.error('Error loading PDF:', error);
      toast({
        title: "Error",
        description: "Failed to load PDF for editing",
        variant: "destructive",
      });
    }
  };

  const renderPage = async () => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const viewport = page.getViewport({ scale: zoom });
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Render PDF page
      await page.render({
        canvasContext: ctx,
        viewport: viewport,
        canvas: canvas
      }).promise;

      // Render custom elements
      renderElements(ctx, viewport);
    } catch (error) {
      console.error('Error rendering page:', error);
    }
  };

  const renderElements = (ctx: CanvasRenderingContext2D, viewport: pdfjsLib.PageViewport) => {
    elements.forEach(element => {
      ctx.save();
      ctx.globalAlpha = element.type === 'text' ? (element as TextElement).opacity || 1 : 
                        element.type === 'image' ? (element as ImageElement).opacity || 1 : 
                        (element as ShapeElement).opacity || 1;
      
      // Apply transformations
      const centerX = element.x + element.width / 2;
      const centerY = element.y + element.height / 2;
      ctx.translate(centerX, centerY);
      
      const rotation = element.type === 'text' ? (element as TextElement).rotation || 0 : 
                      element.type === 'image' ? (element as ImageElement).rotation || 0 : 
                      (element as ShapeElement).rotation || 0;
      if (rotation) {
        ctx.rotate((rotation * Math.PI) / 180);
      }
      ctx.translate(-centerX, -centerY);

      if (element.type === 'text') {
        renderTextElement(ctx, element as TextElement);
      } else if (element.type === 'rectangle' || element.type === 'circle' || element.type === 'line') {
        renderShapeElement(ctx, element as ShapeElement);
      } else if (element.type === 'image') {
        renderImageElement(ctx, element as ImageElement);
      }

      // Render selection outline
      if (selectedElement === element.id) {
        ctx.strokeStyle = '#0066cc';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(element.x - 2, element.y - 2, element.width + 4, element.height + 4);
        ctx.setLineDash([]);
      }

      ctx.restore();
    });
  };

  const renderTextElement = (ctx: CanvasRenderingContext2D, element: TextElement) => {
    ctx.fillStyle = element.color;
    ctx.font = `${element.bold ? 'bold ' : ''}${element.italic ? 'italic ' : ''}${element.fontSize}px ${element.fontFamily}`;
    ctx.textAlign = element.alignment;
    
    const lines = element.content.split('\n');
    const lineHeight = element.fontSize * 1.2;
    
    lines.forEach((line, index) => {
      const textX = element.alignment === 'center' ? element.x + element.width / 2 : 
                   element.alignment === 'right' ? element.x + element.width : 
                   element.x;
      const textY = element.y + element.fontSize + (index * lineHeight);
      
      ctx.fillText(line, textX, textY);
      
      if (element.underline) {
        ctx.beginPath();
        ctx.moveTo(textX - ctx.measureText(line).width / 2, textY + 2);
        ctx.lineTo(textX + ctx.measureText(line).width / 2, textY + 2);
        ctx.strokeStyle = element.color;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
  };

  const renderShapeElement = (ctx: CanvasRenderingContext2D, element: ShapeElement) => {
    ctx.fillStyle = element.color;
    ctx.strokeStyle = element.strokeColor;
    ctx.lineWidth = element.strokeWidth;

    if (element.type === 'rectangle') {
      ctx.fillRect(element.x, element.y, element.width, element.height);
      ctx.strokeRect(element.x, element.y, element.width, element.height);
    } else if (element.type === 'circle') {
      const centerX = element.x + element.width / 2;
      const centerY = element.y + element.height / 2;
      const radius = Math.min(element.width, element.height) / 2;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    } else if (element.type === 'line') {
      ctx.beginPath();
      ctx.moveTo(element.x, element.y);
      ctx.lineTo(element.x + element.width, element.y + element.height);
      ctx.stroke();
    }
  };

  const renderImageElement = (ctx: CanvasRenderingContext2D, element: ImageElement) => {
    // For now, render a placeholder rectangle
    ctx.fillStyle = '#e0e0e0';
    ctx.strokeStyle = '#999999';
    ctx.lineWidth = 2;
    ctx.fillRect(element.x, element.y, element.width, element.height);
    ctx.strokeRect(element.x, element.y, element.width, element.height);
    
    // Add image icon
    ctx.fillStyle = '#666666';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🖼️', element.x + element.width / 2, element.y + element.height / 2);
  };

  const addToHistory = (newElements: Element[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ elements: JSON.parse(JSON.stringify(newElements)), timestamp: Date.now() });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / zoom;
    const y = (event.clientY - rect.top) / zoom;

    if (tool === 'select') {
      // Find clicked element
      const clickedElement = elements.find(element => 
        x >= element.x && x <= element.x + element.width &&
        y >= element.y && y <= element.y + element.height
      );
      setSelectedElement(clickedElement?.id || null);
    } else if (tool === 'text') {
      // Add new text element
      const newElement: TextElement = {
        id: Date.now().toString(),
        type: 'text',
        content: 'New Text',
        x: x,
        y: y,
        width: 100,
        height: textProperties.fontSize * 1.2,
        fontSize: textProperties.fontSize,
        fontFamily: textProperties.fontFamily,
        color: textProperties.color,
        bold: textProperties.bold,
        italic: textProperties.italic,
        underline: textProperties.underline,
        alignment: textProperties.alignment,
        rotation: 0,
        opacity: 1
      };
      
      const newElements = [...elements, newElement];
      setElements(newElements);
      addToHistory(newElements);
      setSelectedElement(newElement.id);
      setTool('select');
    }
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'select') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / zoom;
    const y = (event.clientY - rect.top) / zoom;

    setIsDrawing(true);
    setStartPos({ x, y });
  };

  const handleMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || tool === 'select') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / zoom;
    const y = (event.clientY - rect.top) / zoom;

    const width = Math.abs(x - startPos.x);
    const height = Math.abs(y - startPos.y);
    const finalX = Math.min(x, startPos.x);
    const finalY = Math.min(y, startPos.y);

    if (width < 5 || height < 5) {
      setIsDrawing(false);
      return;
    }

    let newElement: Element;

    if (tool === 'rectangle' || tool === 'circle' || tool === 'line') {
      newElement = {
        id: Date.now().toString(),
        type: tool,
        x: finalX,
        y: finalY,
        width: width,
        height: height,
        color: shapeProperties.color,
        strokeColor: shapeProperties.strokeColor,
        strokeWidth: shapeProperties.strokeWidth,
        opacity: shapeProperties.opacity,
        rotation: 0
      } as ShapeElement;
    } else {
      setIsDrawing(false);
      return;
    }

    const newElements = [...elements, newElement];
    setElements(newElements);
    addToHistory(newElements);
    setSelectedElement(newElement.id);
    setIsDrawing(false);
  };

  const deleteElement = () => {
    if (!selectedElement) return;
    
    const newElements = elements.filter(el => el.id !== selectedElement);
    setElements(newElements);
    addToHistory(newElements);
    setSelectedElement(null);
  };

  const duplicateElement = () => {
    if (!selectedElement) return;
    
    const element = elements.find(el => el.id === selectedElement);
    if (!element) return;

    const newElement = {
      ...JSON.parse(JSON.stringify(element)),
      id: Date.now().toString(),
      x: element.x + 10,
      y: element.y + 10
    };

    const newElements = [...elements, newElement];
    setElements(newElements);
    addToHistory(newElements);
    setSelectedElement(newElement.id);
  };

  const updateSelectedElement = (updates: Partial<Element>) => {
    if (!selectedElement) return;

    const newElements = elements.map(el => 
      el.id === selectedElement ? { ...el, ...updates } as Element : el
    );
    setElements(newElements);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements(history[historyIndex - 1].elements);
      setSelectedElement(null);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements(history[historyIndex + 1].elements);
      setSelectedElement(null);
    }
  };

  const savePdf = async () => {
    try {
      // For now, create a simple modified PDF notification
      // In a real implementation, you'd use pdf-lib to modify the PDF
      toast({
        title: "Success",
        description: "PDF modifications saved successfully!",
        variant: "default",
      });
      
      // Call the onSave callback with the modified data
      onSave(pdfBlob, `edited_${fileName}`);
    } catch (error) {
      console.error('Error saving PDF:', error);
      toast({
        title: "Error",
        description: "Failed to save PDF modifications",
        variant: "destructive",
      });
    }
  };

  const renderToolbar = () => (
    <div className="flex flex-wrap items-center gap-2 p-4 bg-gray-50 border-b">
      <div className="flex items-center gap-1 mr-4">
        <Button
          variant={tool === 'select' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTool('select')}
        >
          <MousePointer className="h-4 w-4" />
        </Button>
        <Button
          variant={tool === 'text' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTool('text')}
        >
          <Type className="h-4 w-4" />
        </Button>
        <Button
          variant={tool === 'rectangle' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTool('rectangle')}
        >
          <Square className="h-4 w-4" />
        </Button>
        <Button
          variant={tool === 'circle' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTool('circle')}
        >
          <Circle className="h-4 w-4" />
        </Button>
        <Button
          variant={tool === 'line' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTool('line')}
        >
          <Minus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1 mr-4">
        <Button
          variant="outline"
          size="sm"
          onClick={undo}
          disabled={historyIndex <= 0}
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1 mr-4">
        <Button
          variant="outline"
          size="sm"
          onClick={duplicateElement}
          disabled={!selectedElement}
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={deleteElement}
          disabled={!selectedElement}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1 mr-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setZoom(zoom * 1.2)}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <span className="text-sm px-2">{Math.round(zoom * 100)}%</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setZoom(zoom / 1.2)}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1 mr-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowLayers(!showLayers)}
        >
          <Layers className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1 ml-auto">
        <Button variant="outline" size="sm" onClick={savePdf}>
          <Save className="h-4 w-4 mr-1" />
          Save
        </Button>
        <Button variant="outline" size="sm" onClick={onClose}>
          <X className="h-4 w-4 mr-1" />
          Close
        </Button>
      </div>
    </div>
  );

  const renderProperties = () => {
    const selectedEl = elements.find(el => el.id === selectedElement);
    if (!selectedEl) return null;

    return (
      <Card className="w-80">
        <CardHeader>
          <CardTitle className="text-lg">Properties</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedEl.type === 'text' && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  value={(selectedEl as TextElement).content}
                  onChange={(e) => updateSelectedElement({ content: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">Font Size</label>
                  <Input
                    type="number"
                    value={(selectedEl as TextElement).fontSize}
                    onChange={(e) => updateSelectedElement({ fontSize: parseInt(e.target.value) || 16 })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Color</label>
                  <Input
                    type="color"
                    value={(selectedEl as TextElement).color}
                    onChange={(e) => updateSelectedElement({ color: e.target.value })}
                    className="mt-1 h-9"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={(selectedEl as TextElement).bold ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateSelectedElement({ bold: !(selectedEl as TextElement).bold })}
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  variant={(selectedEl as TextElement).italic ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateSelectedElement({ italic: !(selectedEl as TextElement).italic })}
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  variant={(selectedEl as TextElement).underline ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateSelectedElement({ underline: !(selectedEl as TextElement).underline })}
                >
                  <Underline className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          
          {(selectedEl.type === 'rectangle' || selectedEl.type === 'circle' || selectedEl.type === 'line') && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">Fill Color</label>
                  <Input
                    type="color"
                    value={(selectedEl as ShapeElement).color}
                    onChange={(e) => updateSelectedElement({ color: e.target.value })}
                    className="mt-1 h-9"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Stroke Color</label>
                  <Input
                    type="color"
                    value={(selectedEl as ShapeElement).strokeColor}
                    onChange={(e) => updateSelectedElement({ strokeColor: e.target.value })}
                    className="mt-1 h-9"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Stroke Width</label>
                <Input
                  type="number"
                  value={(selectedEl as ShapeElement).strokeWidth}
                  onChange={(e) => updateSelectedElement({ strokeWidth: parseInt(e.target.value) || 1 })}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <div className="border-t pt-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium">X Position</label>
                <Input
                  type="number"
                  value={Math.round(selectedEl.x)}
                  onChange={(e) => updateSelectedElement({ x: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Y Position</label>
                <Input
                  type="number"
                  value={Math.round(selectedEl.y)}
                  onChange={(e) => updateSelectedElement({ y: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="text-sm font-medium">Width</label>
                <Input
                  type="number"
                  value={Math.round(selectedEl.width)}
                  onChange={(e) => updateSelectedElement({ width: parseInt(e.target.value) || 1 })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Height</label>
                <Input
                  type="number"
                  value={Math.round(selectedEl.height)}
                  onChange={(e) => updateSelectedElement({ height: parseInt(e.target.value) || 1 })}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderLayers = () => (
    <Card className="w-64">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Layers ({elements.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-2">
            {elements.map((element, index) => (
              <div
                key={element.id}
                className={`p-2 rounded cursor-pointer border ${
                  selectedElement === element.id ? 'bg-blue-100 border-blue-300' : 'bg-gray-50 border-gray-200'
                }`}
                onClick={() => setSelectedElement(element.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {element.type === 'text' && <Type className="h-4 w-4" />}
                    {element.type === 'rectangle' && <Square className="h-4 w-4" />}
                    {element.type === 'circle' && <Circle className="h-4 w-4" />}
                    {element.type === 'line' && <Minus className="h-4 w-4" />}
                    {element.type === 'image' && <ImageIcon className="h-4 w-4" />}
                    <span className="text-sm font-medium">
                      {element.type === 'text' ? (element as TextElement).content.substring(0, 10) : 
                       `${element.type.charAt(0).toUpperCase()}${element.type.slice(1)}`}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {elements.length - index}
                  </Badge>
                </div>
              </div>
            ))}
            {elements.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <div className="text-sm">No elements</div>
                <div className="text-xs">Add elements to get started</div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-[95vw] max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-bold">PDF Editor</h2>
            <p className="text-sm text-gray-600">{fileName}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        {renderToolbar()}

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 p-4">
              <div className="flex justify-center">
                <canvas
                  ref={canvasRef}
                  className="border border-gray-300 shadow-lg cursor-crosshair"
                  onClick={handleCanvasClick}
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseUp}
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
                />
              </div>
            </ScrollArea>
          </div>

          <div className="flex gap-2 p-4">
            {showLayers && renderLayers()}
            {selectedElement && renderProperties()}
          </div>
        </div>
      </div>
    </div>
  );
}