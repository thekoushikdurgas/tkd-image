import React, { useState, useRef, useEffect } from 'react';
import { fileToBase64 } from '../../services/geminiService';

interface ImageUploaderProps {
  onImageUpload: (fileData: { base64: string; mimeType: string }) => void;
  title: string;
  description: string;
  initialImage?: { base64: string; mimeType: string } | null;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, title, description, initialImage }) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialImage) {
      const dataUrl = `data:${initialImage.mimeType};base64,${initialImage.base64}`;
      setImagePreview(dataUrl);
    } else {
      setImagePreview(null);
    }
  }, [initialImage]);

  const handleFileSelected = async (file: File | null) => {
    if (file && file.type.startsWith('image/')) {
      try {
        const { base64, mimeType } = await fileToBase64(file);
        const dataUrl = `data:${mimeType};base64,${base64}`;
        setImagePreview(dataUrl);
        onImageUpload({ base64, mimeType });
      } catch (error: any) {
        console.error("Error processing file:", error.message || error);
        // You could add user-facing error handling here
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer h-full flex flex-col items-center justify-center ${
          isDragging ? 'border-primary bg-primary/20' : 'border-border-color hover:border-primary'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={(e) => handleFileSelected(e.target.files ? e.target.files[0] : null)}
          // By setting value to '', we ensure the onChange event fires even if the same file is selected again.
          value=""
        />
        {imagePreview ? (
          <img src={imagePreview} alt="Preview" className="max-h-64 rounded-lg object-contain" />
        ) : (
          <div className="space-y-2">
            <svg className="mx-auto h-12 w-12 text-gray-500" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h3 className="text-lg font-bold text-text">{title}</h3>
            <p className="text-sm text-text-secondary">{description}</p>
          </div>
        )}
      </div>
    </>
  );
};

export default ImageUploader;
