import React, { useState, useRef } from 'react';
import { fileToBase64 } from '../services/geminiService';

interface MediaUploaderProps {
  onMediaUpload: (fileData: { base64: string; mimeType: string }) => void;
  title: string;
  description: string;
}

const MediaUploader: React.FC<MediaUploaderProps> = ({ onMediaUpload, title, description }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = async (file: File | null) => {
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      try {
        const { base64, mimeType } = await fileToBase64(file);
        const dataUrl = `data:${mimeType};base64,${base64}`;
        setPreview(dataUrl);
        setMediaType(file.type.startsWith('image/') ? 'image' : 'video');
        onMediaUpload({ base64, mimeType });
      } catch (error: any) {
        console.error("Error processing file:", error.message || error);
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

  const clearMedia = () => {
    setPreview(null);
    setMediaType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    // You might want to notify the parent component that the media has been cleared
    // onMediaUpload(null); 
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
        onClick={!preview ? handleClick : undefined}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*,video/*"
          onChange={(e) => handleFileSelected(e.target.files ? e.target.files[0] : null)}
          value=""
        />
        {preview ? (
            <div className="relative w-full h-full">
                {mediaType === 'image' && (
                    <img src={preview} alt="Preview" className="max-h-64 rounded-lg object-contain mx-auto" />
                )}
                {mediaType === 'video' && (
                    <video src={preview} controls className="max-h-64 rounded-lg mx-auto" />
                )}
                 <button 
                    onClick={clearMedia}
                    className="absolute top-0 right-0 m-2 bg-red-600 text-white rounded-full p-1.5 hover:bg-red-700 transition-all z-10"
                    aria-label="Remove media"
                >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
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

export default MediaUploader;
