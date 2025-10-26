import React, { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './services/supabaseClient';
import { Tab, HistoryItem } from './types';
import TabButton from './components/TabButton';
import ImageUploader from './components/ImageUploader';
import Spinner from './components/Spinner';
import AnalyzeIcon from './components/icons/AnalyzeIcon';
import GenerateIcon from './components/icons/GenerateIcon';
import { analyzeImageForPrompt, generateImage, inpaintImage, fileToBase64, analyzeForModel, generateImageFromText, editImage, runStudioQuery } from './services/geminiService';
import Tooltip from './components/Tooltip';
import PasteIcon from './components/icons/PasteIcon';
import Login from './components/Login';
import Gallery from './components/Gallery';
import GalleryIcon from './components/icons/GalleryIcon';
import SaveIcon from './components/icons/SaveIcon';
import UsePromptIcon from './components/icons/UsePromptIcon';
import HistoryIcon from './components/icons/HistoryIcon';
import History from './components/History';
import InpaintEditor from './components/InpaintEditor';
import ModelCreatorIcon from './components/icons/ModelCreatorIcon';
import AIStudioIcon from './components/icons/AIStudioIcon';
import MediaUploader from './components/MediaUploader';

interface ImageFile {
  base64: string;
  mimeType: string;
}

type Notification = {
  message: string;
  type: 'success' | 'error';
};

interface StudioMessage {
  id: number;
  role: 'user' | 'model';
  text: string;
  media?: ImageFile;
  grounding?: any[];
}

const artisticStyles = [
  'Impressionism', 'Cubism', 'Surrealism', 'Pop Art', 
  'Steampunk', 'Cyberpunk', 'Art Nouveau', 'Minimalist',
  'Abstract', 'Fantasy', 'Gothic', 'Vaporwave'
];

const base64ToBlob = (base64: string, mimeType: string): Blob => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuthState, setLoadingAuthState] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Generate);
  
  // State for Analyze Tab
  const [analyzeImage, setAnalyzeImage] = useState<ImageFile | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isThinkingModeEnabled, setIsThinkingModeEnabled] = useState<boolean>(true);
  const [isRefiningPrompt, setIsRefiningPrompt] = useState<boolean>(false);
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [styleIntensity, setStyleIntensity] = useState<number>(3);
  const [focusArea, setFocusArea] = useState<string>('');

  // State for Generate Tab
  const [generateMode, setGenerateMode] = useState<'fromText' | 'stylize' | 'magicEdit' | 'inpaint'>('fromText');
  const [generateImageFile, setGenerateImageFile] = useState<ImageFile | null>(null);
  const [maskImage, setMaskImage] = useState<ImageFile | null>(null);
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [generatedResultImage, setGeneratedResultImage] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isImageLoading, setIsImageLoading] = useState<boolean>(false);
  const [negativePrompt, setNegativePrompt] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [styleStrength, setStyleStrength] = useState<number>(3);
  const [imageQuality, setImageQuality] = useState<string>('medium');

  // State for Model Creator Tab
  const [modelCreatorImages, setModelCreatorImages] = useState<ImageFile[]>([]);
  const [modelAnalysis, setModelAnalysis] = useState<{ facialStructure: string; bodyStructure: string } | null>(null);
  const [modelConfidence, setModelConfidence] = useState<number>(0);
  const [modelResultImage, setModelResultImage] = useState<string>('');
  const [isModeling, setIsModeling] = useState<boolean>(false);

  // State for AI Studio Tab
  const [studioMedia, setStudioMedia] = useState<ImageFile | null>(null);
  const [studioMessages, setStudioMessages] = useState<StudioMessage[]>([]);
  const [studioIsRunning, setStudioIsRunning] = useState(false);
  const [studioModel, setStudioModel] = useState<'gemini-2.5-flash' | 'gemini-2.5-pro'>('gemini-2.5-flash');
  const [studioUseThinking, setStudioUseThinking] = useState(false);
  const [studioUseGrounding, setStudioUseGrounding] = useState(false);
  const [studioPrompt, setStudioPrompt] = useState('');
  
  // State for Gallery & History
  const [galleryKey, setGalleryKey] = useState(0);
  const [historyKey, setHistoryKey] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoadingAuthState(false);
    });

    // Initial session check
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

  const handleAnalyze = async () => {
    if (!analyzeImage || !user) {
      setError('Please upload an image to analyze.');
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    setGeneratedPrompt('');
    setIsRefiningPrompt(false);
    try {
      const prompt = await analyzeImageForPrompt(
        analyzeImage.base64, 
        analyzeImage.mimeType, 
        isThinkingModeEnabled,
        selectedStyle,
        styleIntensity,
        focusArea
      );
      setGeneratedPrompt(prompt);

      // Save to history
      try {
        const imageBlob = base64ToBlob(analyzeImage.base64, analyzeImage.mimeType);
        const fileExtension = analyzeImage.mimeType.split('/')[1] || 'png';
        const filePath = `${user.id}/${Date.now()}.${fileExtension}`;
        
        const { error: uploadError } = await supabase.storage
          .from('analysis-images')
          .upload(filePath, imageBlob);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('analysis-images')
          .getPublicUrl(filePath);

        const imageUrl = urlData.publicUrl;

        const { error: insertError } = await supabase.from('analysis_history').insert({
          user_id: user.id,
          image_url: imageUrl,
          prompt,
        });

        if (insertError) throw insertError;
        setHistoryKey(prev => prev + 1);
      } catch (historyError: any) {
        console.error("Failed to save analysis to history:", historyError.message || historyError);
        let message = "Analysis complete, but an error occurred while saving to your history.";
        if (historyError.message.includes('Bucket not found')) {
            message = "Analysis complete, but failed to save. The 'analysis-images' storage bucket was not found in your Supabase project.";
        } else if (historyError.message.includes('network')) {
            message = "Analysis complete, but failed to save to history due to a network issue.";
        }
        setNotification({ message, type: 'error' });
        setTimeout(() => setNotification(null), 8000);
      }

    } catch (e: any) {
      setError('Failed to analyze image. Please try again.');
      console.error('Analysis Error:', e.message || e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (!userPrompt.trim()) {
      setError('Please enter a prompt.');
      return;
    }

    if (['stylize', 'inpaint', 'magicEdit'].includes(generateMode) && !generateImageFile) {
      setError('Please upload an image for this generation mode.');
      return;
    }

    if (generateMode === 'inpaint' && !maskImage) {
      setError('Please mask an area on the image before generating.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedResultImage('');

    try {
      let newImage: { base64: string; mimeType: string };

      switch (generateMode) {
        case 'inpaint':
          if (!maskImage || !generateImageFile) throw new Error("Missing image or mask for in-painting.");
          newImage = await inpaintImage(generateImageFile, maskImage, userPrompt);
          break;
        case 'magicEdit':
          if (!generateImageFile) throw new Error("Missing image for magic edit.");
          newImage = await editImage(generateImageFile, userPrompt);
          break;
        case 'fromText':
          newImage = await generateImageFromText(userPrompt, negativePrompt, aspectRatio as any);
          break;
        case 'stylize':
        default:
          if (!generateImageFile) throw new Error("Missing image for stylizing.");
          newImage = await generateImage(
            generateImageFile.base64,
            generateImageFile.mimeType,
            userPrompt,
            negativePrompt,
            aspectRatio,
            styleStrength,
            imageQuality
          );
          break;
      }

      setIsImageLoading(true);
      setGeneratedResultImage(`data:${newImage.mimeType};base64,${newImage.base64}`);
    } catch (e: any) {
      setError(e.message || 'Failed to generate image. Please try again.');
      console.error('Generation Error:', e.message || e);
    } finally {
      setIsGenerating(false);
    }
  };


  const handleCreateModel = async () => {
    if (modelCreatorImages.length === 0 || !user) {
      setError('Please upload at least one image to create a model.');
      return;
    }
    setIsModeling(true);
    setError(null);
    setModelAnalysis(null);
    setModelConfidence(0);
    setModelResultImage('');

    try {
      // Step 1: Analyze image(s) for character sheet and confidence
      const { characterSheet, confidenceScore } = await analyzeForModel(modelCreatorImages);
      setModelAnalysis(characterSheet);
      setModelConfidence(confidenceScore);

      // Step 2: Generate a character portrait based on the analysis
      const portraitPrompt = `Create a realistic, front-facing 3D-style character portrait of a person. The background should be a neutral gray studio background. The character should be based on the following detailed description.
      Facial Structure: ${characterSheet.facialStructure}
      Body Structure: ${characterSheet.bodyStructure}
      The final image should look like a high-quality 3D render.`;
      
      const referenceImage = modelCreatorImages[0];
      
      const newImage = await generateImage(
        referenceImage.base64,
        referenceImage.mimeType,
        portraitPrompt,
        'blurry, deformed, cartoon, sketch, text, watermark', // Negative prompt
        '1:1', // Aspect ratio
        3, // Style strength (moderate)
        'high' // Quality
      );
      
      setIsImageLoading(true);
      setModelResultImage(`data:${newImage.mimeType};base64,${newImage.base64}`);

    // Fix: Added opening brace for the catch block
    } catch (e: any) {
      setError(e.message || 'Failed to create model. Please try again.');
      console.error('Model Creation Error:', e.message || e);
    } finally {
      setIsModeling(false);
    }
  };

  const handleStudioSubmit = async () => {
    if (!studioPrompt.trim()) return;

    const userMessage: StudioMessage = {
      id: Date.now(),
      role: 'user',
      text: studioPrompt,
      media: studioMedia || undefined,
    };
    
    setStudioMessages(prev => [...prev, userMessage]);
    setStudioIsRunning(true);
    setError(null);
    setStudioPrompt('');
    setStudioMedia(null);

    try {
      const { text, groundingChunks } = await runStudioQuery(
        userMessage.text,
        userMessage.media || null,
        studioModel,
        studioUseThinking,
        studioUseGrounding
      );

      const modelMessage: StudioMessage = {
        id: Date.now() + 1,
        role: 'model',
        text: text,
        grounding: groundingChunks || undefined,
      };
      setStudioMessages(prev => [...prev, modelMessage]);

    } catch (e: any) {
      setError(e.message || "An error occurred in the AI Studio.");
      console.error("AI Studio Error:", e.message || e);
    } finally {
      setStudioIsRunning(false);
    }
  };
  
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPrompt).then(() => {
      setNotification({ message: 'Prompt copied to clipboard!', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    }).catch((err: any) => {
      console.error('Could not copy text: ', err.message || err);
      setError('Failed to copy prompt to clipboard.');
    });
  };

  const handlePaste = async (setter: React.Dispatch<React.SetStateAction<string>>) => {
    try {
        const text = await navigator.clipboard.readText();
        setter(text);
        setNotification({ message: 'Pasted from clipboard!', type: 'success' });
        setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
        console.error('Failed to read clipboard contents: ', err.message || err);
        setError('Could not paste from clipboard. Please check browser permissions.');
    }
  };

  const handlePasteGeneratedPrompt = async () => {
      try {
          const text = await navigator.clipboard.readText();
          setGeneratedPrompt(text);
          setIsRefiningPrompt(true);
          setNotification({ message: 'Pasted from clipboard!', type: 'success' });
          setTimeout(() => setNotification(null), 3000);
      } catch (err: any) {
          console.error('Failed to read clipboard contents: ', err.message || err);
          setError('Could not paste from clipboard. Please check browser permissions.');
      }
  };

  const handleDownloadImage = () => {
    if (!generatedResultImage) return;
    const link = document.createElement('a');
    link.href = generatedResultImage;
    const mimeType = generatedResultImage.split(';')[0].split(':')[1];
    const extension = mimeType.split('/')[1] || 'png';
    link.download = `stylized-image.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setNotification({ message: 'Image download started!', type: 'success' });
    setTimeout(() => setNotification(null), 3000);
  };
  
  const handleSaveToGallery = async () => {
    if (!generatedResultImage || !user) {
        setError("You must be logged in and have a generated image to save.");
        return;
    }
    setNotification({ message: "Saving to gallery...", type: 'success' });
    try {
        const base64Data = generatedResultImage.split(',')[1];
        const mimeType = generatedResultImage.split(';')[0].split(':')[1];
        const fileExtension = mimeType.split('/')[1] || 'png';
        const imageBlob = base64ToBlob(base64Data, mimeType);
        const filePath = `${user.id}/${Date.now()}.${fileExtension}`;
        
        const { error } = await supabase.storage
          .from('gallery')
          .upload(filePath, imageBlob);

        if (error) throw error;
        
        setNotification({ message: 'Image saved to gallery successfully!', type: 'success' });
        setGalleryKey(prev => prev + 1); // Trigger gallery refresh
        setActiveTab(Tab.Gallery); // Switch to gallery tab
        setTimeout(() => setNotification(null), 3000);
    } catch (e: any) {
        console.error("Error saving to storage:", e.message || e);
        if (e.message.includes('Bucket not found')) {
          setError("Failed to save image. The 'gallery' storage bucket was not found in your Supabase project. Please create it in the Supabase dashboard.");
        } else if (e.message.includes('network')) {
          setError("Could not save to gallery due to a network issue. Please check your connection and try again.");
        } else {
          setError("Failed to save image to gallery. Please try again.");
        }
        setNotification(null);
    }
  };

  const handleUsePrompt = () => {
    if (!generatedPrompt || !analyzeImage) {
      setError("Cannot proceed without a generated prompt and an image from the analysis step.");
      return;
    }
    setUserPrompt(generatedPrompt);
    setGenerateImageFile(analyzeImage);
    setGenerateMode('stylize'); // Default to stylize when using a prompt from analyzer
    setActiveTab(Tab.Generate);
    setNotification({ message: "Prompt and image loaded! Ready to generate.", type: 'success' });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleUseHistoryItem = async (item: Pick<HistoryItem, 'imageUrl' | 'prompt'>) => {
    const originalNotification = notification;
    setNotification({ message: "Loading image from history...", type: 'success' });
    setError(null);

    try {
        const response = await fetch(item.imageUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch image. Server responded with ${response.status}`);
        }
        const blob = await response.blob();
        
        const urlParts = item.imageUrl.split('/');
        const filename = urlParts[urlParts.length - 1].split('?')[0];
        
        const file = new File([blob], filename, { type: blob.type });
        const { base64, mimeType } = await fileToBase64(file);
        
        const imageFile: ImageFile = { base64, mimeType };
        
        setUserPrompt(item.prompt);
        setGenerateImageFile(imageFile);
        setAnalyzeImage(imageFile);
        setGenerateMode('stylize');
        setActiveTab(Tab.Generate);
        
        setNotification({ message: "Prompt and image loaded! Ready to generate.", type: 'success' });
        setTimeout(() => setNotification(null), 4000);
    } catch (e: any) {
        setError(`Failed to load image from history. It might be unavailable or expired. Details: ${e.message}`);
        console.error("Error using history item:", e.message || e);
        setNotification(originalNotification);
    }
  };


  const toggleRefinePrompt = () => {
    setIsRefiningPrompt(!isRefiningPrompt);
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

  const handleImageForGeneration = (imageFile: ImageFile) => {
    setGenerateImageFile(imageFile);
    setMaskImage(null); // Clear mask when a new image is uploaded
  }

  // Inline Components for Model Creator
  const MultiImageUploader: React.FC = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
  
    const handleFilesSelected = async (files: FileList | null) => {
      if (!files) return;
      const filePromises = Array.from(files)
        .filter(file => file.type.startsWith('image/'))
        .map(file => fileToBase64(file));
      
      try {
        const newImages = await Promise.all(filePromises);
        setModelCreatorImages(prev => [...prev, ...newImages]);
      } catch (error) {
        console.error("Error processing files:", error);
        setError("There was an error processing one or more images.");
      }
    };
  
    const removeImage = (index: number) => {
      setModelCreatorImages(prev => prev.filter((_, i) => i !== index));
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
        {modelCreatorImages.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {modelCreatorImages.map((image, index) => (
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
             <button onClick={() => setModelCreatorImages([])} className="h-full aspect-square text-xs bg-card-bg border border-border-color text-text-secondary rounded-md flex flex-col items-center justify-center hover:bg-border-color transition">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Clear All
            </button>
          </div>
        )}
      </div>
    );
  };

  const ConfidenceGauge: React.FC<{ value: number }> = ({ value }) => {
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
      <div className="relative w-32 h-32">
        <svg className="w-full h-full" viewBox="0 0 120 120">
          <circle className="text-border-color" strokeWidth="10" stroke="currentColor" fill="transparent" r={radius} cx="60" cy="60" />
          <circle
            className="text-accent"
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="60"
            cy="60"
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-accent">{`${Math.round(value)}%`}</span>
          <span className="text-xs text-text-secondary">Confidence</span>
        </div>
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-background text-text font-sans p-4 sm:p-6 lg:p-8">
       {notification && (
        <div className={`fixed bottom-5 right-5 text-white py-2 px-4 rounded-lg shadow-lg z-50 ${
          notification.type === 'success' ? 'bg-success text-background' : 'bg-red-600'
        }`} role="status">
          {notification.message}
        </div>
      )}
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
            <div className="text-center sm:text-left">
              <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                AI Image Stylizer
              </h1>
              <p className="mt-2 text-lg text-text-secondary">
                Analyze, edit, and transform your photos with the power of generative AI.
              </p>
            </div>
            <div className="flex items-center gap-4 bg-card-bg p-2 rounded-full shadow-lg">
                {user.user_metadata.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="User" className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-white font-bold text-lg">
                    {user.email ? user.email.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
                <span className="font-semibold text-text hidden md:block max-w-[150px] truncate">
                  {user.user_metadata.full_name || user.email}
                </span>
                <button 
                    onClick={handleSignOut} 
                    className="px-4 py-2 bg-border-color text-text font-semibold rounded-full hover:bg-gray-700 transition"
                >
                    Sign Out
                </button>
            </div>
        </header>

        <nav className="flex justify-center items-center gap-2 sm:gap-4 mb-8 flex-wrap">
          <TabButton isActive={activeTab === Tab.Analyze} onClick={() => setActiveTab(Tab.Analyze)}>
            <AnalyzeIcon /> Analyze & Prompt
          </TabButton>
          <TabButton isActive={activeTab === Tab.Generate} onClick={() => setActiveTab(Tab.Generate)}>
            <GenerateIcon /> Generate & Edit
          </TabButton>
          <TabButton isActive={activeTab === Tab.ModelCreator} onClick={() => setActiveTab(Tab.ModelCreator)}>
            <ModelCreatorIcon /> Model Creator
          </TabButton>
          <TabButton isActive={activeTab === Tab.AIStudio} onClick={() => setActiveTab(Tab.AIStudio)}>
            <AIStudioIcon /> AI Studio
          </TabButton>
           <TabButton isActive={activeTab === Tab.Gallery} onClick={() => setActiveTab(Tab.Gallery)}>
            <GalleryIcon /> My Gallery
          </TabButton>
          <TabButton isActive={activeTab === Tab.History} onClick={() => setActiveTab(Tab.History)}>
            <HistoryIcon /> History
          </TabButton>
        </nav>

        <main>
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 p-4 mb-6 rounded-md" role="alert">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}

          {activeTab === Tab.Analyze && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start animate-fade-in">
              <div className="bg-card-bg p-6 rounded-xl shadow-lg space-y-4 h-full flex flex-col">
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-text">1. Upload Your Image</h2>
                  <div className="h-80">
                    <ImageUploader
                      onImageUpload={setAnalyzeImage}
                      title="Upload to Analyze"
                      description="Drop an image here or click to select a file"
                      initialImage={analyzeImage}
                    />
                  </div>
                </div>

                <div className="pt-4 space-y-4">
                  <h3 className="text-xl font-bold text-text">2. Advanced Options</h3>
                  <div>
                    <label className="font-semibold text-text block mb-2">Style Palette</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {artisticStyles.map((style) => (
                        <button
                          key={style}
                          onClick={() => setSelectedStyle(style === selectedStyle ? '' : style)}
                          className={`px-2 py-1.5 text-sm rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary ${
                            selectedStyle === style
                              ? 'bg-primary text-white font-semibold shadow'
                              : 'bg-border-color text-text hover:bg-gray-600'
                          }`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="style-intensity" className="font-semibold text-text">Style Intensity</label>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm text-text-secondary">Subtle</span>
                      <input
                        id="style-intensity"
                        type="range"
                        min="1"
                        max="5"
                        value={styleIntensity}
                        onChange={(e) => setStyleIntensity(Number(e.target.value))}
                        className="w-full h-2 bg-border-color rounded-lg appearance-none cursor-pointer accent-primary"
                        aria-label="Style intensity"
                      />
                      <span className="text-sm text-text-secondary">Intense</span>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="focus-area" className="font-semibold text-text">Focus Area (Optional)</label>
                    <div className="relative">
                      <input
                        id="focus-area"
                        type="text"
                        value={focusArea}
                        onChange={(e) => setFocusArea(e.target.value)}
                        placeholder="e.g., the subject's clothing, the background"
                        className="w-full mt-2 p-2 pr-10 bg-background border border-border-color rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                      />
                      <Tooltip text="Paste">
                        <button
                            onClick={() => handlePaste(setFocusArea)}
                            className="absolute top-1/2 right-3 -translate-y-1/2 mt-1 text-gray-400 hover:text-primary transition"
                            aria-label="Paste from clipboard"
                        >
                            <PasteIcon />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    <label htmlFor="thinking-mode-toggle" className="flex flex-col cursor-pointer pr-4">
                        <span className="font-semibold text-text">Thinking Mode</span>
                        <span className="text-sm text-text-secondary">Generates more detailed prompts.</span>
                    </label>
                    <Tooltip text="Enable for more complex prompts. May take longer.">
                      <div className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                          <input 
                              type="checkbox" 
                              id="thinking-mode-toggle" 
                              className="sr-only peer"
                              checked={isThinkingModeEnabled}
                              onChange={() => setIsThinkingModeEnabled(!isThinkingModeEnabled)} 
                          />
                          <div className="w-11 h-6 bg-border-color rounded-full peer peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-offset-card-bg peer-focus:ring-primary peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </div>
                    </Tooltip>
                  </div>
                </div>
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !analyzeImage}
                  className="w-full bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition duration-300 disabled:bg-indigo-400/50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-auto"
                >
                  {isAnalyzing ? <><Spinner /> Analyzing...</> : 'Analyze & Create Prompt'}
                </button>
              </div>
              <div className="bg-card-bg p-6 rounded-xl shadow-lg space-y-4 min-h-[400px]">
                 <h2 className="text-2xl font-bold text-text">3. Generated Prompt</h2>
                 {isAnalyzing ? (
                   <div className="flex justify-center items-center h-full">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-primary mx-auto"></div>
                      <p className="text-lg font-semibold text-text-secondary">Analyzing image...</p>
                    </div>
                   </div>
                 ) : generatedPrompt ? (
                   <div className="relative bg-background p-4 rounded-lg text-text-secondary h-full max-h-[75vh] flex flex-col">
                     <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
                        <Tooltip text="Use in Generator">
                          <button
                            onClick={handleUsePrompt}
                            className="p-2 rounded-md bg-accent text-white hover:bg-emerald-600 transition"
                            aria-label="Use this prompt and image in the Generate tab"
                          >
                            <UsePromptIcon />
                          </button>
                        </Tooltip>
                        <Tooltip text="Paste from clipboard">
                          <button onClick={handlePasteGeneratedPrompt} className="p-2 rounded-md bg-border-color hover:bg-gray-600 transition">
                            <PasteIcon/>
                          </button>
                        </Tooltip>
                        <Tooltip text={isRefiningPrompt ? 'Save Changes' : 'Refine Prompt'}>
                          <button onClick={toggleRefinePrompt} className="p-2 rounded-md bg-border-color hover:bg-gray-600 transition">
                              {isRefiningPrompt ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                      <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.286.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022z"/>
                                  </svg>
                              ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                      <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                                  </svg>
                              )}
                          </button>
                        </Tooltip>
                        <Tooltip text="Copy to clipboard">
                          <button onClick={copyToClipboard} className="p-2 rounded-md bg-border-color hover:bg-gray-600 transition">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                                  <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3z"/>
                              </svg>
                          </button>
                        </Tooltip>
                     </div>
                     {isRefiningPrompt ? (
                        <textarea
                            value={generatedPrompt}
                            onChange={(e) => setGeneratedPrompt(e.target.value)}
                            className="w-full h-full mt-8 bg-background p-2 border border-primary rounded-md focus:ring-2 focus:ring-primary focus:border-transparent transition resize-none font-sans text-sm text-text"
                            aria-label="Refine prompt"
                            autoFocus
                        />
                     ) : (
                        <div className="overflow-y-auto mt-8 flex-grow">
                           <pre className="whitespace-pre-wrap font-sans text-sm">{generatedPrompt}</pre>
                        </div>
                     )}
                   </div>
                 ) : (
                  <div className="flex justify-center items-center h-full text-text-secondary text-center">
                    Your generated style prompt will appear here.
                  </div>
                 )}
              </div>
            </div>
          )}

          {activeTab === Tab.Generate && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start animate-fade-in">
              <div className="bg-card-bg p-6 rounded-xl shadow-lg space-y-4">
                <div className="flex justify-center mb-4">
                    <div className="bg-background p-1 rounded-lg flex gap-1 font-semibold flex-wrap">
                        {([
                            {id: 'fromText', label: 'From Text'}, 
                            {id: 'stylize', label: 'Stylize'}, 
                            {id: 'magicEdit', label: 'Magic Edit'}, 
                            {id: 'inpaint', label: 'In-paint'}
                        ] as const).map(mode => (
                          <button 
                              key={mode.id}
                              onClick={() => setGenerateMode(mode.id)}
                              className={`px-4 py-1.5 rounded-md text-sm transition-all ${generateMode === mode.id ? 'bg-card-bg text-primary shadow' : 'text-text-secondary hover:bg-border-color'}`}
                          >
                              {mode.label}
                          </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-text">1. {
                    {
                      fromText: 'Describe Your Image',
                      stylize: 'Upload a Photo',
                      magicEdit: 'Upload Image to Edit',
                      inpaint: 'Upload & Mask Image'
                    }[generateMode]
                  }</h2>
                    
                    {generateMode === 'inpaint' && generateImageFile ? (
                      <InpaintEditor 
                        key={generateImageFile.base64}
                        imageFile={generateImageFile} 
                        onMaskReady={(maskBase64) => setMaskImage(maskBase64 ? {base64: maskBase64, mimeType: 'image/png'} : null)}
                      />
                    ) : (generateMode !== 'fromText' &&
                      <ImageUploader
                          onImageUpload={handleImageForGeneration}
                          title={
                            {
                              stylize: 'Upload for Stylizing',
                              magicEdit: 'Upload for Magic Edit',
                              inpaint: 'Upload to In-paint',
                            }[generateMode] || 'Upload Image'
                          }
                          description={
                            {
                              stylize: 'Drop a photo to use its facial structure',
                              magicEdit: 'Drop a photo to start editing with text',
                              inpaint: 'Drop a photo to start editing',
                            }[generateMode] || 'Select an image'
                          }
                          initialImage={generateImageFile}
                      />
                    )}
                </div>
                <div className="pt-4 space-y-2">
                    <h2 className="text-2xl font-bold text-text">2. {
                      {
                        fromText: 'Add Details',
                        stylize: 'Describe Your New Style',
                        magicEdit: 'Describe Your Edit',
                        inpaint: 'Describe Your Edit'
                      }[generateMode]
                    }</h2>
                    <div className="relative">
                      <textarea
                        value={userPrompt}
                        onChange={(e) => setUserPrompt(e.target.value)}
                        placeholder={
                            {
                                fromText: 'e.g., a photorealistic image of a cat in a spacesuit on Mars',
                                stylize: "e.g., a cubist painting of a musician",
                                magicEdit: "e.g., add a pair of sunglasses",
                                inpaint: "e.g., a funny hat",
                            }[generateMode]
                        }
                        className="w-full p-3 pr-10 bg-background border border-border-color rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition text-text"
                        rows={3}
                      />
                      <Tooltip text="Paste">
                        <button
                            onClick={() => handlePaste(setUserPrompt)}
                            className="absolute top-3 right-3 text-gray-400 hover:text-primary transition"
                            aria-label="Paste from clipboard"
                        >
                            <PasteIcon />
                        </button>
                      </Tooltip>
                    </div>
                </div>
                
                {(generateMode === 'stylize' || generateMode === 'fromText') && (
                  <div className="pt-4 space-y-4 animate-fade-in">
                      <h3 className="text-xl font-bold text-text">3. Advanced Generation Options</h3>
                      <div>
                          <label htmlFor="negative-prompt" className="font-semibold text-text">Negative Prompt (Optional)</label>
                          <div className="relative">
                            <input
                                id="negative-prompt"
                                type="text"
                                value={negativePrompt}
                                onChange={(e) => setNegativePrompt(e.target.value)}
                                placeholder="e.g., text, watermarks, ugly"
                                className="w-full mt-2 p-2 pr-10 bg-background border border-border-color rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                            />
                            <Tooltip text="Paste">
                              <button
                                  onClick={() => handlePaste(setNegativePrompt)}
                                  className="absolute top-1/2 right-3 -translate-y-1/2 mt-1 text-gray-400 hover:text-primary transition"
                                  aria-label="Paste from clipboard"
                              >
                                  <PasteIcon />
                              </button>
                            </Tooltip>
                          </div>
                          <p className="text-xs text-text-secondary mt-1">Describe elements to exclude from the image.</p>
                      </div>
                      <div>
                          <label className="font-semibold text-text block mb-2">Aspect Ratio</label>
                          <div className="grid grid-cols-3 gap-2">
                              {[{id: '1:1', name: 'Square'}, {id: '16:9', name: 'Landscape'}, {id: '9:16', name: 'Portrait'}].map(ratio => (
                                  <button
                                      key={ratio.id}
                                      onClick={() => setAspectRatio(ratio.id)}
                                      className={`px-2 py-1.5 text-sm rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-accent ${
                                          aspectRatio === ratio.id
                                          ? 'bg-accent text-white font-semibold shadow'
                                          : 'bg-border-color text-text hover:bg-gray-600'
                                      }`}
                                  >
                                      {ratio.name} ({ratio.id})
                                  </button>
                              ))}
                          </div>
                      </div>
                      { generateMode === 'stylize' && <>
                        <div>
                            <label className="font-semibold text-text block mb-2">Output Quality</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[{id: 'low', name: 'Low'}, {id: 'medium', name: 'Medium'}, {id: 'high', name: 'High'}].map(quality => (
                                    <button
                                        key={quality.id}
                                        onClick={() => setImageQuality(quality.id)}
                                        className={`px-2 py-1.5 text-sm rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-accent ${
                                            imageQuality === quality.id
                                            ? 'bg-accent text-white font-semibold shadow'
                                            : 'bg-border-color text-text hover:bg-gray-600'
                                        }`}
                                    >
                                        {quality.name}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-text-secondary mt-1">Higher quality may take longer to generate.</p>
                        </div>
                        <div>
                            <label htmlFor="style-strength" className="font-semibold text-text">Style Strength</label>
                            <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm text-text-secondary text-center text-xs">Preserve<br />Structure</span>
                                <input
                                    id="style-strength"
                                    type="range"
                                    min="1"
                                    max="5"
                                    value={styleStrength}
                                    onChange={(e) => setStyleStrength(Number(e.target.value))}
                                    className="w-full h-2 bg-border-color rounded-lg appearance-none cursor-pointer accent-accent"
                                    aria-label="Style strength"
                                />
                                <span className="text-sm text-text-secondary text-center text-xs">Creative<br />Freedom</span>
                            </div>
                        </div>
                      </>}
                  </div>
                )}
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !userPrompt}
                  className="w-full bg-accent text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-600 transition duration-300 disabled:bg-emerald-500/50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                >
                  {isGenerating ? <><Spinner /> Generating...</> : 'Generate Image'}
                </button>
              </div>
              <div className="bg-card-bg p-6 rounded-xl shadow-lg space-y-4">
                <h2 className="text-2xl font-bold text-text">Generated Image</h2>
                <div className="w-full aspect-square bg-background rounded-lg flex items-center justify-center relative">
                  {isGenerating ? (
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-accent mx-auto"></div>
                      <p className="text-lg font-semibold text-text-secondary">Generating image...</p>
                    </div>
                  ) : generatedResultImage ? (
                    <>
                      <img
                        src={generatedResultImage}
                        alt="Generated result"
                        className={`rounded-lg object-contain w-full h-full transition-opacity duration-500 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
                        onLoad={() => setIsImageLoading(false)}
                        onError={() => {
                          setIsImageLoading(false);
                          setError('Failed to load the generated image.');
                        }}
                      />
                       {isImageLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                          <div className="text-center space-y-2 text-text-secondary">
                             <Spinner className="w-12 h-12 text-accent mx-auto" />
                             <p>Loading image...</p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-text-secondary text-center p-4">
                      Your new image will appear here.
                    </div>
                  )}
                </div>
                 {generatedResultImage && !isGenerating && !isImageLoading && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleDownloadImage}
                      className="w-full bg-secondary text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-500 transition duration-300 flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                        <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                      </svg>
                      Download
                    </button>
                    <button
                      onClick={handleSaveToGallery}
                      className="w-full bg-success text-background font-bold py-3 px-4 rounded-lg hover:bg-green-500 transition duration-300 flex items-center justify-center gap-2"
                    >
                      <SaveIcon />
                      Save to Gallery
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === Tab.ModelCreator && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start animate-fade-in">
                <div className="bg-card-bg p-6 rounded-xl shadow-lg space-y-4">
                    <h2 className="text-2xl font-bold text-text">1. Upload Reference Images</h2>
                    <p className="text-sm text-text-secondary">Provide one or more images of a person. More images from different angles will result in a more accurate model and a higher confidence score.</p>
                    <MultiImageUploader />
                    <button
                        onClick={handleCreateModel}
                        disabled={isModeling || modelCreatorImages.length === 0}
                        className="w-full bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition duration-300 disabled:bg-indigo-400/50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-auto"
                    >
                        {isModeling ? <><Spinner /> Analyzing Structure...</> : 'Analyze & Create Model'}
                    </button>
                </div>
                <div className="bg-card-bg p-6 rounded-xl shadow-lg space-y-4 min-h-[500px]">
                    <h2 className="text-2xl font-bold text-text">2. Generated Model Profile</h2>
                    {isModeling ? (
                        <div className="flex flex-col justify-center items-center h-full text-center text-text-secondary">
                             <svg className="w-24 h-24 text-primary animate-spin" fill="none" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeDasharray="282.74" strokeDashoffset="212.06" /></svg>
                            <p className="text-lg font-semibold mt-4">Creating 3D model profile...</p>
                            <p className="text-sm">This involves detailed structural analysis and may take a moment.</p>
                        </div>
                    ) : modelAnalysis ? (
                        <div className="space-y-4">
                            <div className="flex justify-center">
                                <ConfidenceGauge value={modelConfidence} />
                            </div>
                            {modelResultImage && (
                                <div className="aspect-square bg-background rounded-lg">
                                    <img src={modelResultImage} alt="Generated model portrait" className="w-full h-full object-contain rounded-lg" />
                                </div>
                            )}
                            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                                <div>
                                    <h3 className="font-bold text-lg text-text">Facial Structure Analysis</h3>
                                    <p className="text-sm text-text-secondary whitespace-pre-wrap">{modelAnalysis.facialStructure}</p>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-text">Body Structure Analysis</h3>
                                    <p className="text-sm text-text-secondary whitespace-pre-wrap">{modelAnalysis.bodyStructure}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col justify-center items-center h-full text-text-secondary text-center">
                            <ModelCreatorIcon className="w-16 h-16 text-gray-600 mb-4" />
                            <h3 className="font-semibold text-lg">Your model profile will appear here</h3>
                            <p className="text-sm">Upload images and click "Analyze" to begin.</p>
                        </div>
                    )}
                </div>
            </div>
          )}

          {activeTab === Tab.AIStudio && (
            <div className="bg-card-bg p-6 rounded-xl shadow-lg animate-fade-in flex flex-col h-[80vh]">
                <h2 className="text-3xl font-bold text-text mb-4">AI Studio</h2>
                <div className="flex-grow bg-background rounded-lg p-4 overflow-y-auto space-y-4">
                    {studioMessages.length === 0 && !studioIsRunning && (
                        <div className="flex flex-col justify-center items-center h-full text-text-secondary text-center">
                            <AIStudioIcon className="w-16 h-16 text-gray-600 mb-4" />
                            <h3 className="font-semibold text-lg">Welcome to the AI Studio</h3>
                            <p className="text-sm">Upload an image or video, ask a question, and get insights.</p>
                        </div>
                    )}
                    {studioMessages.map(msg => (
                        <div key={msg.id} className={`flex gap-4 items-start ${msg.role === 'user' ? 'justify-end' : ''}`}>
                            {msg.role === 'model' && <AIStudioIcon className="w-8 h-8 flex-shrink-0 text-primary mt-1" />}
                            <div className={`max-w-xl p-4 rounded-xl ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-border-color'}`}>
                                {msg.media && (
                                    msg.media.mimeType.startsWith('image/') ?
                                        <img src={`data:${msg.media.mimeType};base64,${msg.media.base64}`} className="rounded-lg mb-2 max-h-48" alt="User upload" /> :
                                        <video src={`data:${msg.media.mimeType};base64,${msg.media.base64}`} controls className="rounded-lg mb-2 max-h-48" />
                                )}
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                                {msg.grounding && msg.grounding.length > 0 && (
                                    <div className="mt-4 border-t border-gray-500 pt-2">
                                        <h4 className="text-xs font-semibold mb-1">Sources:</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {msg.grounding.map((chunk, index) => (
                                                <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" key={index} className="text-xs bg-background text-secondary px-2 py-1 rounded-full hover:underline">
                                                    {chunk.web.title || new URL(chunk.web.uri).hostname}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {msg.role === 'user' && (user.user_metadata.avatar_url ? (
                                <img src={user.user_metadata.avatar_url} alt="User" className="w-8 h-8 rounded-full flex-shrink-0 mt-1" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-white font-bold text-sm flex-shrink-0 mt-1">
                                    {user.email ? user.email.charAt(0).toUpperCase() : '?'}
                                </div>
                            ))}
                        </div>
                    ))}
                    {studioIsRunning && (
                       <div className="flex gap-4 items-start">
                           <AIStudioIcon className="w-8 h-8 flex-shrink-0 text-primary mt-1 animate-pulse" />
                           <div className="max-w-xl p-4 rounded-xl bg-border-color flex items-center gap-2">
                               <Spinner className="w-5 h-5" /> Thinking...
                           </div>
                       </div>
                    )}
                </div>
                <div className="mt-4 border-t border-border-color pt-4">
                    <div className="bg-background rounded-lg p-2">
                        {studioMedia && (
                            <div className="h-40 mb-2">
                                <MediaUploader onMediaUpload={setStudioMedia} title="Upload Media" description="Upload image or video" />
                            </div>
                        )}
                        <div className="flex gap-2">
                           {!studioMedia && <button onClick={() => document.getElementById('studio-media-upload')?.click()} className="p-2 bg-border-color rounded-lg hover:bg-gray-600 transition">
                             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                             <input type="file" id="studio-media-upload" className="hidden" accept="image/*,video/*" onChange={async e => { if (e.target.files?.[0]) { setStudioMedia(await fileToBase64(e.target.files[0])) }}} />
                            </button>}
                            <textarea
                                value={studioPrompt}
                                onChange={e => setStudioPrompt(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleStudioSubmit(); }}}
                                placeholder="Ask about the media or start a new conversation..."
                                className="w-full p-2 bg-background border-none rounded-lg focus:ring-0 resize-none"
                                rows={1}
                            />
                            <button onClick={handleStudioSubmit} disabled={studioIsRunning || !studioPrompt} className="p-2 bg-primary text-white rounded-lg hover:bg-indigo-700 transition disabled:bg-indigo-400/50">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                        <div className="flex items-center gap-2">
                            <label htmlFor="studio-model">Model:</label>
                            <select id="studio-model" value={studioModel} onChange={e => setStudioModel(e.target.value as any)} className="bg-border-color p-1 rounded-md">
                                <option value="gemini-2.5-flash">Flash</option>
                                <option value="gemini-2.5-pro">Pro</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                           <input type="checkbox" id="studio-grounding" checked={studioUseGrounding} onChange={e => setStudioUseGrounding(e.target.checked)} className="accent-primary" />
                           <label htmlFor="studio-grounding">Search Grounding</label>
                        </div>
                         {studioModel === 'gemini-2.5-pro' && <div className="flex items-center gap-2">
                           <input type="checkbox" id="studio-thinking" checked={studioUseThinking} onChange={e => setStudioUseThinking(e.target.checked)} className="accent-primary" />
                           <label htmlFor="studio-thinking">Max Thinking</label>
                        </div>}
                    </div>
                </div>
            </div>
          )}

          {activeTab === Tab.Gallery && user && (
            <Gallery user={user} galleryKey={galleryKey} />
          )}
          {activeTab === Tab.History && user && (
            <History 
              user={user} 
              historyKey={historyKey}
              onUseHistoryItem={handleUseHistoryItem}
              setNotification={setNotification}
              setError={setError}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;