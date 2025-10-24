import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { storage } from '../services/firebase';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import Spinner from './Spinner';

interface GalleryProps {
  user: User;
  galleryKey: number;
}

const Gallery: React.FC<GalleryProps> = ({ user, galleryKey }) => {
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchImages = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const imagesRef = ref(storage, `images/${user.uid}`);
      const result = await listAll(imagesRef);
      const urlPromises = result.items.map((imageRef) => getDownloadURL(imageRef));
      const urls = await Promise.all(urlPromises);
      setImages(urls.reverse()); // Show newest first
    } catch (e: any) {
      console.error("Error fetching images:", e.message || e);
      if (e.code === 'storage/retry-limit-exceeded') {
        setError("Could not connect to the server to load your gallery. Please check your internet connection and try again.");
      } else {
        setError("An unexpected error occurred while loading your gallery. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages, galleryKey]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center space-y-4">
          <Spinner className="w-12 h-12 text-primary mx-auto" />
          <p className="text-lg font-semibold text-slate-600">Loading your gallery...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-md text-center" role="alert">
            <p className="font-bold">Error Loading Gallery</p>
            <p className="mt-2">{error}</p>
            <button
                onClick={fetchImages}
                className="mt-4 px-5 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition"
            >
                Retry
            </button>
        </div>
    );
  }

  return (
    <div className="bg-card-bg p-6 rounded-xl shadow-md animate-fade-in">
        <h2 className="text-3xl font-bold text-text-primary mb-6">My Gallery</h2>
        {images.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {images.map((url, index) => (
                    <div key={index} className="aspect-square bg-slate-200 rounded-lg overflow-hidden group relative">
                        <img src={url} alt={`Generated image ${index + 1}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                        <a href={url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100" aria-label="View full image">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 0h-4m4 0l-5-5" />
                           </svg>
                        </a>
                    </div>
                ))}
            </div>
        ) : (
            <div className="text-center py-16 px-6 border-2 border-dashed border-slate-300 rounded-xl">
                 <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-text-primary">Your gallery is empty</h3>
                <p className="mt-1 text-sm text-slate-500">
                    Go to the 'Generate & Edit' tab to create images and save them here.
                </p>
            </div>
        )}
    </div>
  );
};

export default Gallery;