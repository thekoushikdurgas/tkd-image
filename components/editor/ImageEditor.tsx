import React, { useState, useEffect, useRef } from 'react';
import RotateCwIcon from '../icons/RotateCwIcon';
import RotateCcwIcon from '../icons/RotateCcwIcon';
import ResetIcon from '../icons/ResetIcon';
import Tooltip from '../common/Tooltip';

// Since cropperjs is loaded via a script tag, we need to tell TypeScript about the global Cropper object.
declare global {
  interface Window {
    Cropper: any;
  }
}

interface ImageEditorProps {
  file: File;
  onSave: (imageData: { base64: string; mimeType: string }) => void;
  onCancel: () => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ file, onSave, onCancel }) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const [cropper, setCropper] = useState<any>(null);
  const [imageSrc, setImageSrc] = useState<string>('');
  
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, [file]);

  const handleImageLoad = () => {
    if (imageRef.current) {
      if (cropper) {
        cropper.destroy();
      }

      if (typeof window.Cropper !== 'function') {
        console.error("Cropper.js is not loaded or has failed to initialize.");
        // Optionally, set an error state to inform the user
        return;
      }
      
      const cropperInstance = new window.Cropper(imageRef.current, {
        aspectRatio: 0,
        viewMode: 1,
        dragMode: 'move',
        background: false,
        autoCropArea: 0.8,
        responsive: true,
        movable: true,
        zoomable: true,
      });
      setCropper(cropperInstance);
    }
  };
  
  useEffect(() => {
    // Cleanup effect to destroy cropper on component unmount
    return () => {
      cropper?.destroy();
    };
  }, [cropper]);


  const handleSave = () => {
    if (!cropper) return;
    
    const croppedCanvas = cropper.getCroppedCanvas();
    if (!croppedCanvas) return;

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = croppedCanvas.width;
    finalCanvas.height = croppedCanvas.height;
    const ctx = finalCanvas.getContext('2d');

    if (!ctx) return;
    
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    ctx.drawImage(croppedCanvas, 0, 0);

    const dataUrl = finalCanvas.toDataURL(file.type);
    const base64 = dataUrl.split(',')[1];
    
    onSave({ base64, mimeType: file.type });
  };
  
  const handleReset = () => {
    cropper?.reset();
    setBrightness(100);
    setContrast(100);
  };

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-card-bg rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <h2 className="text-2xl font-bold text-text-primary p-6 border-b border-slate-200">Edit Image</h2>
        <div className="flex-grow p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[50vh] bg-slate-100 rounded-lg overflow-hidden">
            <img 
                ref={imageRef} 
                src={imageSrc} 
                alt="Image editor"
                onLoad={handleImageLoad}
                style={{
                  filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                  display: 'block',
                  maxWidth: '100%',
                }}
             />
          </div>
          <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-3">Controls</h3>
                <div className="grid grid-cols-3 gap-2">
                    <Tooltip text="Rotate 90° left">
                        <button onClick={() => cropper?.rotate(-90)} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-md flex flex-col items-center justify-center transition w-full">
                            <RotateCcwIcon className="w-6 h-6"/>
                            <span className="text-xs mt-1">Left</span>
                        </button>
                    </Tooltip>
                    <Tooltip text="Rotate 90° right">
                        <button onClick={() => cropper?.rotate(90)} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-md flex flex-col items-center justify-center transition w-full">
                            <RotateCwIcon className="w-6 h-6"/>
                            <span className="text-xs mt-1">Right</span>
                        </button>
                    </Tooltip>
                    <Tooltip text="Reset all edits">
                        <button onClick={handleReset} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-md flex flex-col items-center justify-center transition w-full">
                            <ResetIcon className="w-6 h-6"/>
                            <span className="text-xs mt-1">Reset</span>
                        </button>
                    </Tooltip>
                </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3">Adjustments</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="brightness" className="block text-sm font-medium text-slate-700 mb-1">Brightness</label>
                  <input
                    id="brightness"
                    type="range"
                    min="50"
                    max="150"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
                <div>
                  <label htmlFor="contrast" className="block text-sm font-medium text-slate-700 mb-1">Contrast</label>
                  <input
                    id="contrast"
                    type="range"
                    min="50"
                    max="150"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end items-center gap-4 p-6 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <button onClick={onCancel} className="px-6 py-2 bg-slate-200 text-text-primary font-semibold rounded-lg hover:bg-slate-300 transition">
            Cancel
          </button>
          <button onClick={handleSave} className="px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-indigo-700 transition">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
