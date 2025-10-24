import React, { useState } from 'react';
import { Tab } from './types';
import TabButton from './components/TabButton';
import ImageUploader from './components/ImageUploader';
import Spinner from './components/Spinner';
import AnalyzeIcon from './components/icons/AnalyzeIcon';
import GenerateIcon from './components/icons/GenerateIcon';
import { analyzeImageForPrompt, generateImage } from './services/geminiService';

interface ImageFile {
  base64: string;
  mimeType: string;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Analyze);
  
  // State for Analyze Tab
  const [analyzeImage, setAnalyzeImage] = useState<ImageFile | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // State for Generate Tab
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [outputFormat, setOutputFormat] = useState<'image/png' | 'image/jpeg'>('image/png');
  const [generatedResultImage, setGeneratedResultImage] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!analyzeImage) {
      setError('Please upload an image to analyze.');
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    setGeneratedPrompt('');
    try {
      const prompt = await analyzeImageForPrompt(analyzeImage.base64, analyzeImage.mimeType);
      setGeneratedPrompt(prompt);
    } catch (e) {
      setError('Failed to analyze image. Please try again.');
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (!userPrompt.trim()) {
      setError('Please enter a prompt to generate an image.');
      return;
    }
    setIsGenerating(true);
    setError(null);
    setGeneratedResultImage('');
    try {
      const newImageBase64 = await generateImage(
        userPrompt,
        aspectRatio,
        outputFormat,
      );
      setGeneratedResultImage(`data:${outputFormat};base64,${newImageBase64}`);
    } catch (e) {
      setError('Failed to generate image. Please try again.');
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPrompt);
  };

  return (
    <div className="min-h-screen bg-background text-text-primary p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
            AI Image Stylizer
          </h1>
          <p className="mt-2 text-lg text-slate-600">
            Transform your photos with the power of generative AI.
          </p>
        </header>

        <nav className="flex justify-center items-center gap-4 mb-8">
          <TabButton isActive={activeTab === Tab.Analyze} onClick={() => setActiveTab(Tab.Analyze)}>
            <AnalyzeIcon /> Analyze & Prompt
          </TabButton>
          <TabButton isActive={activeTab === Tab.Generate} onClick={() => setActiveTab(Tab.Generate)}>
            <GenerateIcon /> Generate Image
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
                <h2 className="text-2xl font-bold text-text-primary">1. Upload Your Image</h2>
                <div className="flex-grow">
                   <ImageUploader
                    onImageUpload={setAnalyzeImage}
                    title="Upload to Analyze"
                    description="Drop an image here or click to select a file"
                  />
                </div>
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !analyzeImage}
                  className="w-full bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition duration-300 disabled:bg-indigo-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? <><Spinner /> Analyzing...</> : 'Analyze & Create Prompt'}
                </button>
              </div>
              <div className="bg-card-bg p-6 rounded-xl shadow-md space-y-4 min-h-[400px]">
                 <h2 className="text-2xl font-bold text-text-primary">2. Generated Prompt</h2>
                 {isAnalyzing ? (
                   <div className="flex justify-center items-center h-64">
                    <div className="text-center space-y-2">
                      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-primary mx-auto"></div>
                      <p className="text-slate-500">AI is analyzing your image...</p>
                    </div>
                   </div>
                 ) : generatedPrompt ? (
                   <div className="relative bg-slate-100 p-4 rounded-lg text-slate-700 h-full max-h-96 overflow-y-auto">
                     <button onClick={copyToClipboard} className="absolute top-2 right-2 p-2 rounded-md bg-slate-200 hover:bg-slate-300 transition" title="Copy to clipboard">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zM-1 8a.5.5 0 0 1 .5-.5h15a.5.5 0 0 1 0 1h-15A.5.5 0 0 1-1 8z"/></svg>
                     </button>
                     <pre className="whitespace-pre-wrap font-sans text-sm">{generatedPrompt}</pre>
                   </div>
                 ) : (
                  <div className="flex justify-center items-center h-64 text-slate-500 text-center">
                    Your generated style prompt will appear here.
                  </div>
                 )}
              </div>
            </div>
          )}

          {activeTab === Tab.Generate && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start animate-fade-in">
              <div className="bg-card-bg p-6 rounded-xl shadow-md space-y-4">
                <h2 className="text-2xl font-bold text-text-primary">1. Describe Your Scene</h2>
                <textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="e.g., a high-quality photo of a majestic lion in the savannah"
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                  rows={4}
                />
                 <h2 className="text-2xl font-bold text-text-primary mt-4">2. Configure Options</h2>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                     <label htmlFor="aspectRatio" className="block text-sm font-medium text-slate-700 mb-1">Aspect Ratio</label>
                     <select 
                         id="aspectRatio" 
                         name="aspectRatio"
                         value={aspectRatio}
                         onChange={(e) => setAspectRatio(e.target.value)}
                         className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                     >
                         <option value="1:1">Square (1:1)</option>
                         <option value="16:9">Landscape (16:9)</option>
                         <option value="9:16">Portrait (9:16)</option>
                         <option value="4:3">Standard (4:3)</option>
                         <option value="3:4">Tall (3:4)</option>
                     </select>
                   </div>
                   <div>
                     <label htmlFor="outputFormat" className="block text-sm font-medium text-slate-700 mb-1">Format</label>
                     <select 
                         id="outputFormat" 
                         name="outputFormat"
                         value={outputFormat}
                         onChange={(e) => setOutputFormat(e.target.value as 'image/png' | 'image/jpeg')}
                         className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                     >
                         <option value="image/png">PNG</option>
                         <option value="image/jpeg">JPG</option>
                     </select>
                   </div>
                 </div>

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !userPrompt}
                  className="w-full bg-accent text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-600 transition duration-300 disabled:bg-emerald-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                >
                  {isGenerating ? <><Spinner /> Generating...</> : 'Generate Image'}
                </button>
              </div>
              <div className="bg-card-bg p-6 rounded-xl shadow-md space-y-4">
                <h2 className="text-2xl font-bold text-text-primary">Generated Image</h2>
                <div className="w-full aspect-square bg-slate-100 rounded-lg flex items-center justify-center">
                  {isGenerating ? (
                    <div className="text-center space-y-2">
                      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-accent mx-auto"></div>
                      <p className="text-slate-500">AI is creating your masterpiece...</p>
                    </div>
                  ) : generatedResultImage ? (
                    <img src={generatedResultImage} alt="Generated result" className="rounded-lg object-contain w-full h-full" />
                  ) : (
                    <div className="text-slate-500 text-center p-4">
                      Your new image will appear here.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
