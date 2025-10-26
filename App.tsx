import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './services/supabaseClient';
import { Tab, HistoryItem, ImageFile, Notification as NotificationType } from './types';

import { fileToBase64 } from './services/geminiService';
import { base64ToBlob } from './utils/fileUtils';

import Spinner from './components/common/Spinner';
import Login from './components/auth/Login';
import Header from './components/layout/Header';
import Navigation from './components/layout/Navigation';
import Notification from './components/layout/Notification';
import AnalyzeTab from './components/tabs/analyze/AnalyzeTab';
import GenerateTab from './components/tabs/generate/GenerateTab';
import ModelCreatorTab from './components/tabs/modelCreator/ModelCreatorTab';
import AIStudioTab from './components/tabs/aiStudio/AIStudioTab';
import Gallery from './components/tabs/Gallery';
import History from './components/tabs/History';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuthState, setLoadingAuthState] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Generate);

  // State shared between Analyze and Generate tabs
  const [sharedImage, setSharedImage] = useState<ImageFile | null>(null);
  const [sharedPrompt, setSharedPrompt] = useState<string>('');
  
  // Keys to trigger refresh in child components
  const [galleryKey, setGalleryKey] = useState(0);
  const [historyKey, setHistoryKey] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<NotificationType | null>(null);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      setLoadingAuthState(false);
    });

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
      setLoadingAuthState(false);
    }
    checkSession();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      console.error("Sign out error:", error.message || error);
      setError("Failed to sign out.");
    }
  };

  const handleUsePromptFromAnalyzer = (prompt: string, image: ImageFile) => {
    setSharedPrompt(prompt);
    setSharedImage(image);
    setActiveTab(Tab.Generate);
    setNotification({ message: "Prompt and image loaded! Ready to generate.", type: 'success' });
    setTimeout(() => setNotification(null), 4000);
  };
  
  const handleSaveToGallery = async (generatedResultImage: string) => {
    if (!generatedResultImage || !user) {
        setError("You must be logged in and have a generated image to save.");
        return;
    }
    setNotification({ message: "Saving to gallery...", type: 'success' });
    try {
        const base64Data = generatedResultImage.split(',')[1];
        const mimeType = generatedResultImage.split(';')[0].split(':')[1];
        const imageBlob = base64ToBlob(base64Data, mimeType);
        const fileExtension = mimeType.split('/')[1] || 'png';
        const filePath = `${user.id}/${Date.now()}.${fileExtension}`;
        
        const { error } = await supabase.storage
          .from('gallery')
          .upload(filePath, imageBlob);

        if (error) throw error;
        
        setNotification({ message: 'Image saved to gallery successfully!', type: 'success' });
        setGalleryKey(prev => prev + 1);
        setActiveTab(Tab.Gallery);
        setTimeout(() => setNotification(null), 3000);
    } catch (e: any) {
        console.error("Error saving to storage:", e.message || e);
        if (e.message.includes('Bucket not found')) {
          setError("Failed to save image. The 'gallery' storage bucket was not found in your Supabase project. Please create it in the Supabase dashboard.");
        } else {
          setError("Failed to save image to gallery. Please try again.");
        }
        setNotification(null);
    }
  };

  const handleUseHistoryItem = async (item: Pick<HistoryItem, 'imageUrl' | 'prompt'>) => {
    const originalNotification = notification;
    setNotification({ message: "Loading image from history...", type: 'success' });
    setError(null);

    try {
        const response = await fetch(item.imageUrl);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
        const blob = await response.blob();
        
        const urlParts = item.imageUrl.split('/');
        const filename = urlParts[urlParts.length - 1].split('?')[0];
        
        const file = new File([blob], filename, { type: blob.type });
        const imageFile = await fileToBase64(file);
        
        setSharedPrompt(item.prompt);
        setSharedImage(imageFile);
        setActiveTab(Tab.Generate);
        
        setNotification({ message: "Prompt and image loaded! Ready to generate.", type: 'success' });
        setTimeout(() => setNotification(null), 4000);
    } catch (e: any) {
        setError(`Failed to load image from history. Details: ${e.message}`);
        console.error("Error using history item:", e);
        setNotification(originalNotification);
    }
  };

  if (loadingAuthState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="h-12 w-12 text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }
  
  const renderActiveTab = () => {
    switch(activeTab) {
        case Tab.Analyze:
            return <AnalyzeTab 
              user={user}
              setHistoryKey={setHistoryKey}
              setError={setError}
              setNotification={setNotification}
              onUsePrompt={handleUsePromptFromAnalyzer}
            />;
        case Tab.Generate:
            return <GenerateTab
              initialPrompt={sharedPrompt}
              initialImage={sharedImage}
              clearInitialData={() => { setSharedPrompt(''); setSharedImage(null); }}
              onSaveToGallery={handleSaveToGallery}
              setError={setError}
              setNotification={setNotification}
            />;
        case Tab.ModelCreator:
            return <ModelCreatorTab user={user} setError={setError} />;
        case Tab.AIStudio:
            return <AIStudioTab user={user} setError={setError} />;
        case Tab.Gallery:
            return <Gallery user={user} galleryKey={galleryKey} />;
        case Tab.History:
            return <History 
              user={user} 
              historyKey={historyKey}
              onUseHistoryItem={handleUseHistoryItem}
              setNotification={setNotification}
              setError={setError}
            />;
        default:
            return null;
    }
  }

  return (
    <div className="min-h-screen bg-background text-text font-sans p-4 sm:p-6 lg:p-8">
      <Notification notification={notification} />
      <div className="max-w-6xl mx-auto">
        <Header user={user} onSignOut={handleSignOut} />
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

        <main>
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 p-4 mb-6 rounded-md" role="alert">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}
          {renderActiveTab()}
        </main>
      </div>
    </div>
  );
};

export default App;
