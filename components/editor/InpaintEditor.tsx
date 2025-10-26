import React, { useRef, useEffect, useState, useCallback } from 'react';
import BrushIcon from '../icons/BrushIcon';
import UndoIcon from '../icons/UndoIcon';
import Tooltip from '../common/Tooltip';

interface InpaintEditorProps {
  imageFile: { base64: string; mimeType: string };
  onMaskReady: (maskBase64: string | null) => void;
}

const InpaintEditor: React.FC<InpaintEditorProps> = ({ imageFile, onMaskReady }) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(30);
  const lastPoint = useRef<{ x: number, y: number } | null>(null);

  const getCanvasAndContext = () => {
    const canvas = canvasRef.current;
    if (!canvas) return { canvas: null, ctx: null };
    const ctx = canvas.getContext('2d');
    return { canvas, ctx };
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const { canvas } = getCanvasAndContext();
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    let clientX, clientY;
    if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) / rect.width * canvas.width,
      y: (clientY - rect.top) / rect.height * canvas.height,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const coords = getCoordinates(e);
    if (coords) {
      lastPoint.current = coords;
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { ctx } = getCanvasAndContext();
    const currentPoint = getCoordinates(e);
    if (!ctx || !currentPoint || !lastPoint.current) return;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();

    lastPoint.current = currentPoint;
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPoint.current = null;
    generateMask();
  };

  const generateMask = () => {
    const { canvas } = getCanvasAndContext();
    if (!canvas || !imageRef.current) {
        onMaskReady(null);
        return;
    };
    
    // Check if the canvas is empty
    const pixelBuffer = new Uint32Array(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
    const isEmpty = !pixelBuffer.some(color => color !== 0);

    if (isEmpty) {
        onMaskReady(null);
        return;
    }
    
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = imageRef.current.naturalWidth;
    maskCanvas.height = imageRef.current.naturalHeight;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    maskCtx.fillStyle = 'black';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    maskCtx.drawImage(canvas, 0, 0, maskCanvas.width, maskCanvas.height);
    
    maskCtx.globalCompositeOperation = 'source-in';
    maskCtx.fillStyle = 'white';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    const maskBase64 = maskCanvas.toDataURL('image/png').split(',')[1];
    onMaskReady(maskBase64);
  };
  
  const clearMask = () => {
    const { canvas, ctx } = getCanvasAndContext();
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      onMaskReady(null);
    }
  };

  const handleImageLoad = useCallback(() => {
    const img = imageRef.current;
    const { canvas } = getCanvasAndContext();
    if (img && canvas) {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      onMaskReady(null);
    }
  }, [onMaskReady]);

  useEffect(() => {
    const img = imageRef.current;
    if (img) {
      img.addEventListener('load', handleImageLoad);
      // If image is already loaded/cached
      if (img.complete) {
        handleImageLoad();
      }
      return () => img.removeEventListener('load', handleImageLoad);
    }
  }, [handleImageLoad]);


  return (
    <div className="space-y-4">
      <div 
        ref={containerRef} 
        className="relative w-full aspect-square bg-background rounded-lg overflow-hidden cursor-crosshair"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      >
        <img
          ref={imageRef}
          src={`data:${imageFile.mimeType};base64,${imageFile.base64}`}
          alt="In-painting editor"
          className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none select-none"
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full"
        />
      </div>
      <div className="flex items-center justify-between p-2 bg-background rounded-lg">
        <div className="flex items-center gap-3">
          <BrushIcon className="w-6 h-6 text-text-secondary" />
          <input
            type="range"
            min="5"
            max="100"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-40 h-2 bg-border-color rounded-lg appearance-none cursor-pointer accent-primary"
            aria-label="Brush size"
          />
        </div>
        <Tooltip text="Clear Mask">
            <button
                onClick={clearMask}
                className="p-2 bg-border-color text-text font-semibold rounded-lg hover:bg-gray-600 transition flex items-center gap-2"
            >
                <UndoIcon className="w-5 h-5" />
                <span className="text-sm">Clear</span>
            </button>
        </Tooltip>
      </div>
    </div>
  );
};

export default InpaintEditor;
