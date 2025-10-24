import React, { useState } from 'react';
import { Tab } from './types';
import TabButton from './components/TabButton';
import ImageUploader from './components/ImageUploader';
import Spinner from './components/Spinner';
import AnalyzeIcon from './components/icons/AnalyzeIcon';
import GenerateIcon from './components/icons/GenerateIcon';
import { analyzeImageForPrompt, generateImage } from './services/geminiService';
import Tooltip from './components/Tooltip';
import PasteIcon from './components/icons/PasteIcon';

interface ImageFile {
  base64: string;
  mimeType: string;
}

const artisticStyles = [
  'Impressionism', 'Cubism', 'Surrealism', 'Pop Art', 
  'Steampunk', 'Cyberpunk', 'Art Nouveau', 'Minimalist',
  'Abstract', 'Fantasy', 'Gothic', 'Vaporwave'
];

const App: React.FC = () => {
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
  
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string>('');

  const handleAnalyze = async () => {
    if (!analyzeImage) {
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
    } catch (e) {
      setError('Failed to analyze image. Please try again.');
      console.error(e);
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
    } catch (e) {
      setError('Failed to generate image. Please try again.');
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPrompt).then(() => {
      setNotification('Prompt copied to clipboard!');
      setTimeout(() => setNotification(''), 3000);
    }).catch(err => {
      console.error('Could not copy text: ', err);
      setError('Failed to copy prompt to clipboard.');
    });
  };

  const handlePaste = async (setter: React.Dispatch<React.SetStateAction<string>>) => {
    try {
        const text = await navigator.clipboard.readText();
        setter(text);
        setNotification('Pasted from clipboard!');
        setTimeout(() => setNotification(''), 3000);
    } catch (err) {
        console.error('Failed to read clipboard contents: ', err);
        setError('Could not paste from clipboard. Please check browser permissions.');
    }
  };

  const handlePasteGeneratedPrompt = async () => {
      try {
          const text = await navigator.clipboard.readText();
          setGeneratedPrompt(text);
          setIsRefiningPrompt(true);
          setNotification('Pasted from clipboard!');
          setTimeout(() => setNotification(''), 3000);
      } catch (err) {
          console.error('Failed to read clipboard contents: ', err);
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
    setNotification('Image download started!');
    setTimeout(() => setNotification(''), 3000);
  };

  const toggleRefinePrompt = () => {
    setIsRefiningPrompt(!isRefiningPrompt);
  };


  return (
    <div className="min-h-screen bg-background text-text-primary p-4 sm:p-6 lg:p-8">
       {notification && (
        <div className="fixed bottom-5 right-5 bg-green-600 text-white py-2 px-4 rounded-lg shadow-lg z-50" role="status">
          {notification}
        </div>
      )}
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
            AI Image Stylizer
          </h1>
          <p className="mt-2 text-lg text-slate-600">
            Analyze, edit, and transform your photos with the power of generative AI.
          </p>
        </header>

        <nav className="flex justify-center items-center gap-4 mb-8">
          <TabButton isActive={activeTab === Tab.Analyze} onClick={() => setActiveTab(Tab.Analyze)}>
            <AnalyzeIcon /> Analyze & Prompt
          </TabButton>
          <TabButton isActive={activeTab === Tab.Generate} onClick={() => setActiveTab(Tab.Generate)}>
            <GenerateIcon /> Generate & Edit
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
                  <button
                    onClick={handleDownloadImage}
                    className="w-full bg-secondary text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 transition duration-300 flex items-center justify-center gap-2 mt-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                      <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                    </svg>
                    Download Image
                  </button>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;