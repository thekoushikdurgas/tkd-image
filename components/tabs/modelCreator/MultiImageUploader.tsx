import React, { useRef } from 'react';
import { fileToBase64 } from '../../../services/geminiService';
import { ImageFile } from '../../../types';

interface MultiImageUploaderProps {
  images: ImageFile[];
  setImages: React.Dispatch<React.SetStateAction<ImageFile[]>>;
  setError: (error: string | null) => void;
}

const MultiImageUploader: React.FC<MultiImageUploaderProps> = ({ images, setImages, setError }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
  
    const handleFilesSelected = async (files: FileList | null) => {
      if (!files) return;
      const filePromises = Array.from(files)
        .filter(file => file.type.startsWith('image/'))
        .map(file => fileToBase64(file));
      
      try {
        const newImages = await Promise.all(filePromises);
        setImages(prev => [...prev, ...newImages].slice(0, 10)); // Limit to 10 images
      } catch (error) {
        console.error("Error processing files:", error);
        setError("There was an error processing one or more images.");
      }
    };
  
    const removeImage = (index: number) => {
      setImages(prev => prev.filter((_, i) => i !== index));
    };
  
    return (
      <div className="space-y-4">
        <div
          className="relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer h-48 flex flex-col items-center justify-center border-border-color hover:border-primary"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            multiple
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
          <svg className="mx-auto h-12 w-12 text-gray-500" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h3 className="text-lg font-bold text-text">Upload Reference Images</h3>
          <p className="text-sm text-text-secondary">Drop files here or click to select</p>
        </div>
        {images.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {images.map((image, index) => (
              <div key={index} className="relative group aspect-square">
                <img src={`data:${image.mimeType};base64,${image.base64}`} alt={`Reference ${index + 1}`} className="w-full h-full object-cover rounded-md" />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Remove image ${index + 1}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
             <button onClick={() => setImages([])} className="h-full aspect-square text-xs bg-card-bg border border-border-color text-text-secondary rounded-md flex flex-col items-center justify-center hover:bg-border-color transition">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Clear All
            </button>
          </div>
        )}
      </div>
    );
};

export default MultiImageUploader;
