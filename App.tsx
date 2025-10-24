import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, storage, db } from './services/firebase';
import { Tab } from './types';
import TabButton from './components/TabButton';
import ImageUploader from './components/ImageUploader';
import Spinner from './components/Spinner';
import AnalyzeIcon from './components/icons/AnalyzeIcon';
import GenerateIcon from './components/icons/GenerateIcon';
import { analyzeImageForPrompt, generateImage } from './services/geminiService';
import Tooltip from './components/Tooltip';
import PasteIcon from './components/icons/PasteIcon';
import Login from './components/Login';
import Gallery from './components/Gallery';
import GalleryIcon from './components/icons/GalleryIcon';
import SaveIcon from './components/icons/SaveIcon';
import UsePromptIcon from './components/icons/UsePromptIcon';
import HistoryIcon from './components/icons/HistoryIcon';
import History from './components/History';

interface ImageFile {
  base64: string;
  mimeType: string;
}

type Notification = {
  message: string;
  type: 'success' | 'error';
};

const artisticStyles = [
  'Impressionism', 'Cubism', 'Surrealism', 'Pop Art', 
  'Steampunk', 'Cyberpunk', 'Art Nouveau', 'Minimalist',
  'Abstract', 'Fantasy', 'Gothic', 'Vaporwave'
];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuthState, setLoadingAuthState] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Analyze);
  
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
  const [generateImageFile, setGenerateImageFile] = useState<ImageFile | null>(null);
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [generatedResultImage, setGeneratedResultImage] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isImageLoading, setIsImageLoading] = useState<boolean>(false);
  const [negativePrompt, setNegativePrompt] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [styleStrength, setStyleStrength] = useState<number>(3);
  const [imageQuality, setImageQuality] = useState<string>('medium');
  
  // State for Gallery & History
  const [galleryKey, setGalleryKey] = useState(0);
  const [historyKey, setHistoryKey] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuthState(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
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
        const storageRef = ref(storage, `analysisImages/${user.uid}/${Date.now()}`);
        await uploadString(storageRef, analyzeImage.base64, 'base64', { contentType: analyzeImage.mimeType });
        const imageUrl = await getDownloadURL(storageRef);
        await addDoc(collection(db, 'analysisHistory'), {
          userId: user.uid,
          imageUrl,
          prompt,
          createdAt: serverTimestamp(),
        });
        setHistoryKey(prev => prev + 1);
      } catch (historyError: any) {
        console.error("Failed to save analysis to history:", historyError.message || historyError);
        let message = "Analysis complete, but an error occurred while saving to your history.";
        if (historyError.code === 'storage/retry-limit-exceeded' || historyError.code === 'unavailable') {
            message = "Analysis complete, but failed to save to history due to a network issue.";
        }
        setNotification({ message, type: 'error' });
        setTimeout(() => setNotification(null), 5000);
      }

    } catch (e: any) {
      setError('Failed to analyze image. Please try again.');
      console.error('Analysis Error:', e.message || e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (!userPrompt.trim() || !generateImageFile) {
      setError('Please upload an image and enter a prompt to generate an image.');
      return;
    }
    setIsGenerating(true);
    setError(null);
    setGeneratedResultImage('');
    try {
      const { base64: newImageBase64, mimeType: newImageMimeType } = await generateImage(
        generateImageFile.base64,
        generateImageFile.mimeType,
        userPrompt,
        negativePrompt,
        aspectRatio,
        styleStrength,
        imageQuality
      );
      setIsImageLoading(true);
      setGeneratedResultImage(`data:${newImageMimeType};base64,${newImageBase64}`);
    } catch (e: any) {
      setError('Failed to generate image. Please try again.');
      console.error('Generation Error:', e.message || e);
    } finally {
      setIsGenerating(false);
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
        
        const storageRef = ref(storage, `images/${user.uid}/${Date.now()}.${fileExtension}`);
        await uploadString(storageRef, base64Data, 'base64', { contentType: mimeType });
        
        setNotification({ message: 'Image saved to gallery successfully!', type: 'success' });
        setGalleryKey(prev => prev + 1); // Trigger gallery refresh
        setActiveTab(Tab.Gallery); // Switch to gallery tab
        setTimeout(() => setNotification(null), 3000);
    } catch (e: any) {
        console.error("Error saving to storage:", e.message || e);
        if (e.code === 'storage/retry-limit-exceeded') {
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
    setActiveTab(Tab.Generate);
    setNotification({ message: "Prompt and image loaded! Ready to generate.", type: 'success' });
    setTimeout(() => setNotification(null), 4000);
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

  return (
    <div className="min-h-screen bg-background text-text-primary p-4 sm:p-6 lg:p-8">
       {notification && (
        <div className={`fixed bottom-5 right-5 text-white py-2 px-4 rounded-lg shadow-lg z-50 ${
          notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
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
              <p className="mt-2 text-lg text-slate-600">
                Analyze, edit, and transform your photos with the power of generative AI.
              </p>
            </div>
            <div className="flex items-center gap-4 bg-card-bg p-2 rounded-full shadow-sm">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="User" className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-white font-bold text-lg">
                    {user.email ? user.email.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
                <span className="font-semibold text-text-primary hidden md:block max-w-[150px] truncate">
                  {user.displayName || user.email}
                </span>
                <button 
                    onClick={handleSignOut} 
                    className="px-4 py-2 bg-slate-200 text-text-primary font-semibold rounded-full hover:bg-slate-300 transition"
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
           <TabButton isActive={activeTab === Tab.Gallery} onClick={() => setActiveTab(Tab.Gallery)}>
            <GalleryIcon /> My Gallery
          </TabButton>
          <TabButton isActive={activeTab === Tab.History} onClick={() => setActiveTab(Tab.History)}>
            <HistoryIcon /> History
          </TabButton>
        </nav>

        <main>
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md" role="alert">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}

          {activeTab === Tab.Analyze && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start animate-fade-in">
              <div className="bg-card-bg p-6 rounded-xl shadow-md space-y-4 h-full flex flex-col">
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-text-primary">1. Upload Your Image</h2>
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
                  <h3 className="text-xl font-bold text-text-primary">2. Advanced Options</h3>
                  <div>
                    <label className="font-semibold text-text-primary block mb-2">Style Palette</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {artisticStyles.map((style) => (
                        <button
                          key={style}
                          onClick={() => setSelectedStyle(style === selectedStyle ? '' : style)}
                          className={`px-2 py-1.5 text-sm rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${
                            selectedStyle === style
                              ? 'bg-primary text-white font-semibold shadow'
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="style-intensity" className="font-semibold text-text-primary">Style Intensity</label>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm text-slate-500">Subtle</span>
                      <input
                        id="style-intensity"
                        type="range"
                        min="1"
                        max="5"
                        value={styleIntensity}
                        onChange={(e) => setStyleIntensity(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                        aria-label="Style intensity"
                      />
                      <span className="text-sm text-slate-500">Intense</span>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="focus-area" className="font-semibold text-text-primary">Focus Area (Optional)</label>
                    <div className="relative">
                      <input
                        id="focus-area"
                        type="text"
                        value={focusArea}
                        onChange={(e) => setFocusArea(e.target.value)}
                        placeholder="e.g., the subject's clothing, the background"
                        className="w-full mt-2 p-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                      />
                      <Tooltip text="Paste">
                        <button
                            onClick={() => handlePaste(setFocusArea)}
                            className="absolute top-1/2 right-3 -translate-y-1/2 mt-1 text-slate-400 hover:text-primary transition"
                            aria-label="Paste from clipboard"
                        >
                            <PasteIcon />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    <label htmlFor="thinking-mode-toggle" className="flex flex-col cursor-pointer pr-4">
                        <span className="font-semibold text-text-primary">Thinking Mode</span>
                        <span className="text-sm text-slate-500">Generates more detailed prompts.</span>
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
                          <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-offset-card-bg peer-focus:ring-primary peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </div>
                    </Tooltip>
                  </div>
                </div>
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !analyzeImage}
                  className="w-full bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition duration-300 disabled:bg-indigo-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-auto"
                >
                  {isAnalyzing ? <><Spinner /> Analyzing...</> : 'Analyze & Create Prompt'}
                </button>
              </div>
              <div className="bg-card-bg p-6 rounded-xl shadow-md space-y-4 min-h-[400px]">
                 <h2 className="text-2xl font-bold text-text-primary">3. Generated Prompt</h2>
                 {isAnalyzing ? (
                   <div className="flex justify-center items-center h-full">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-primary mx-auto"></div>
                      <p className="text-lg font-semibold text-slate-600">Analyzing image...</p>
                    </div>
                   </div>
                 ) : generatedPrompt ? (
                   <div className="relative bg-slate-100 p-4 rounded-lg text-slate-700 h-full max-h-[75vh] flex flex-col">
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
                          <button onClick={handlePasteGeneratedPrompt} className="p-2 rounded-md bg-slate-200 hover:bg-slate-300 transition">
                            <PasteIcon/>
                          </button>
                        </Tooltip>
                        <Tooltip text={isRefiningPrompt ? 'Save Changes' : 'Refine Prompt'}>
                          <button onClick={toggleRefinePrompt} className="p-2 rounded-md bg-slate-200 hover:bg-slate-300 transition">
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
                          <button onClick={copyToClipboard} className="p-2 rounded-md bg-slate-200 hover:bg-slate-300 transition">
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
                            className="w-full h-full mt-8 bg-white p-2 border border-primary rounded-md focus:ring-2 focus:ring-primary focus:border-transparent transition resize-none font-sans text-sm"
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
                  <div className="flex justify-center items-center h-full text-slate-500 text-center">
                    Your generated style prompt will appear here.
                  </div>
                 )}
              </div>
            </div>
          )}

          {activeTab === Tab.Generate && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start animate-fade-in">
              <div className="bg-card-bg p-6 rounded-xl shadow-md space-y-4">
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-text-primary">1. Upload a Photo</h2>
                  <ImageUploader
                      onImageUpload={setGenerateImageFile}
                      title="Upload for Generation"
                      description="Drop a photo to use its facial structure"
                      initialImage={generateImageFile}
                    />
                </div>
                <div className="pt-4 space-y-2">
                    <h2 className="text-2xl font-bold text-text-primary">2. Describe Your Edit or New Style</h2>
                    <div className="relative">
                      <textarea
                        value={userPrompt}
                        onChange={(e) => setUserPrompt(e.target.value)}
                        placeholder="e.g., a cubist painting, or 'add a funny hat'"
                        className="w-full p-3 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                        rows={3}
                      />
                      <Tooltip text="Paste">
                        <button
                            onClick={() => handlePaste(setUserPrompt)}
                            className="absolute top-3 right-3 text-slate-400 hover:text-primary transition"
                            aria-label="Paste from clipboard"
                        >
                            <PasteIcon />
                        </button>
                      </Tooltip>
                    </div>
                </div>
                <div className="pt-4 space-y-4">
                    <h3 className="text-xl font-bold text-text-primary">3. Advanced Generation Options</h3>
                    <div>
                        <label htmlFor="negative-prompt" className="font-semibold text-text-primary">Negative Prompt (Optional)</label>
                        <div className="relative">
                          <input
                              id="negative-prompt"
                              type="text"
                              value={negativePrompt}
                              onChange={(e) => setNegativePrompt(e.target.value)}
                              placeholder="e.g., text, watermarks, ugly"
                              className="w-full mt-2 p-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                          />
                          <Tooltip text="Paste">
                            <button
                                onClick={() => handlePaste(setNegativePrompt)}
                                className="absolute top-1/2 right-3 -translate-y-1/2 mt-1 text-slate-400 hover:text-primary transition"
                                aria-label="Paste from clipboard"
                            >
                                <PasteIcon />
                            </button>
                          </Tooltip>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Describe elements to exclude from the image.</p>
                    </div>
                    <div>
                        <label className="font-semibold text-text-primary block mb-2">Aspect Ratio</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[{id: '1:1', name: 'Square'}, {id: '16:9', name: 'Landscape'}, {id: '9:16', name: 'Portrait'}].map(ratio => (
                                <button
                                    key={ratio.id}
                                    onClick={() => setAspectRatio(ratio.id)}
                                    className={`px-2 py-1.5 text-sm rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent ${
                                        aspectRatio === ratio.id
                                        ? 'bg-accent text-white font-semibold shadow'
                                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                    }`}
                                >
                                    {ratio.name} ({ratio.id})
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="font-semibold text-text-primary block mb-2">Output Quality</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[{id: 'low', name: 'Low'}, {id: 'medium', name: 'Medium'}, {id: 'high', name: 'High'}].map(quality => (
                                <button
                                    key={quality.id}
                                    onClick={() => setImageQuality(quality.id)}
                                    className={`px-2 py-1.5 text-sm rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent ${
                                        imageQuality === quality.id
                                        ? 'bg-accent text-white font-semibold shadow'
                                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                    }`}
                                >
                                    {quality.name}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Higher quality may take longer to generate.</p>
                    </div>
                    <div>
                        <label htmlFor="style-strength" className="font-semibold text-text-primary">Style Strength</label>
                        <div className="flex items-center gap-4 mt-2">
                            <span className="text-sm text-slate-500 text-center text-xs">Preserve<br />Structure</span>
                            <input
                                id="style-strength"
                                type="range"
                                min="1"
                                max="5"
                                value={styleStrength}
                                onChange={(e) => setStyleStrength(Number(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-accent"
                                aria-label="Style strength"
                            />
                            <span className="text-sm text-slate-500 text-center text-xs">Creative<br />Freedom</span>
                        </div>
                    </div>
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !userPrompt || !generateImageFile}
                  className="w-full bg-accent text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-600 transition duration-300 disabled:bg-emerald-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                >
                  {isGenerating ? <><Spinner /> Generating...</> : 'Generate Image'}
                </button>
              </div>
              <div className="bg-card-bg p-6 rounded-xl shadow-md space-y-4">
                <h2 className="text-2xl font-bold text-text-primary">Generated Image</h2>
                <div className="w-full aspect-square bg-slate-100 rounded-lg flex items-center justify-center relative">
                  {isGenerating ? (
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-accent mx-auto"></div>
                      <p className="text-lg font-semibold text-slate-600">Generating image...</p>
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
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 rounded-lg">
                          <div className="text-center space-y-2 text-slate-600">
                             <Spinner className="w-12 h-12 text-accent mx-auto" />
                             <p>Loading image...</p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-slate-500 text-center p-4">
                      Your new image will appear here.
                    </div>
                  )}
                </div>
                 {generatedResultImage && !isGenerating && !isImageLoading && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleDownloadImage}
                      className="w-full bg-secondary text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 transition duration-300 flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                        <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                      </svg>
                      Download
                    </button>
                    <button
                      onClick={handleSaveToGallery}
                      className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition duration-300 flex items-center justify-center gap-2"
                    >
                      <SaveIcon />
                      Save to Gallery
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === Tab.Gallery && user && (
            <Gallery user={user} galleryKey={galleryKey} />
          )}
          {activeTab === Tab.History && user && (
            <History user={user} historyKey={historyKey} />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;