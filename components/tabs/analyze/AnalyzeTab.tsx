import React, { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../../../services/supabaseClient';
import { ImageFile, Notification } from '../../../types';
import { analyzeImageForPrompt } from '../../../services/geminiService';
import { copyToClipboard, pasteFromClipboard } from '../../../utils/clipboardUtils';
import { base64ToBlob } from '../../../utils/fileUtils';
import ImageUploader from '../../common/ImageUploader';
import Spinner from '../../common/Spinner';
import Tooltip from '../../common/Tooltip';
import PasteIcon from '../../icons/PasteIcon';
import UsePromptIcon from '../../icons/UsePromptIcon';

const artisticStyles = [
  'Impressionism', 'Cubism', 'Surrealism', 'Pop Art', 
  'Steampunk', 'Cyberpunk', 'Art Nouveau', 'Minimalist',
  'Abstract', 'Fantasy', 'Gothic', 'Vaporwave'
];

interface AnalyzeTabProps {
    user: User;
    setHistoryKey: React.Dispatch<React.SetStateAction<number>>;
    setError: (error: string | null) => void;
    setNotification: (notification: Notification | null) => void;
    onUsePrompt: (prompt: string, image: ImageFile) => void;
}

const AnalyzeTab: React.FC<AnalyzeTabProps> = ({ user, setHistoryKey, setError, setNotification, onUsePrompt }) => {
    const [analyzeImage, setAnalyzeImage] = useState<ImageFile | null>(null);
    const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [isThinkingModeEnabled, setIsThinkingModeEnabled] = useState<boolean>(true);
    const [isRefiningPrompt, setIsRefiningPrompt] = useState<boolean>(false);
    const [selectedStyle, setSelectedStyle] = useState<string>('');
    const [styleIntensity, setStyleIntensity] = useState<number>(3);
    const [focusArea, setFocusArea] = useState<string>('');
    
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

            try {
                const imageBlob = base64ToBlob(analyzeImage.base64, analyzeImage.mimeType);
                const fileExtension = analyzeImage.mimeType.split('/')[1] || 'png';
                const filePath = `${user.id}/${Date.now()}.${fileExtension}`;
                
                const { error: uploadError } = await supabase.storage.from('analysis-images').upload(filePath, imageBlob);
                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage.from('analysis-images').getPublicUrl(filePath);
                const { error: insertError } = await supabase.from('analysis_history').insert({ user_id: user.id, image_url: urlData.publicUrl, prompt });
                if (insertError) throw insertError;

                setHistoryKey(prev => prev + 1);
            } catch (historyError: any) {
                console.error("Failed to save analysis to history:", historyError.message || historyError);
                let message = "Analysis complete, but failed to save to history.";
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

    const handleCopy = () => {
        copyToClipboard(generatedPrompt, 
            () => {
                setNotification({ message: 'Prompt copied to clipboard!', type: 'success' });
                setTimeout(() => setNotification(null), 3000);
            },
            () => setError('Failed to copy prompt to clipboard.')
        );
    };

    const handlePaste = (setter: React.Dispatch<React.SetStateAction<string>>) => {
        pasteFromClipboard(
            (text) => setter(text),
            () => {
                setNotification({ message: 'Pasted from clipboard!', type: 'success' });
                setTimeout(() => setNotification(null), 3000);
            },
            () => setError('Could not paste from clipboard. Please check browser permissions.')
        );
    };

    const handlePasteGeneratedPrompt = () => {
        pasteFromClipboard(
            (text) => {
                setGeneratedPrompt(text);
                setIsRefiningPrompt(true);
            },
            () => {
                setNotification({ message: 'Pasted from clipboard!', type: 'success' });
                setTimeout(() => setNotification(null), 3000);
            },
            () => setError('Could not paste from clipboard.')
        );
    };

    const handleUsePrompt = () => {
        if (!generatedPrompt || !analyzeImage) {
            setError("Cannot proceed without a generated prompt and an image from the analysis step.");
            return;
        }
        onUsePrompt(generatedPrompt, analyzeImage);
    };

    return (
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
                            <button onClick={() => setIsRefiningPrompt(!isRefiningPrompt)} className="p-2 rounded-md bg-border-color hover:bg-gray-600 transition">
                                {isRefiningPrompt ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.286.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022z"/></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/></svg>
                                )}
                            </button>
                            </Tooltip>
                            <Tooltip text="Copy to clipboard">
                            <button onClick={handleCopy} className="p-2 rounded-md bg-border-color hover:bg-gray-600 transition">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3z"/></svg>
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
    );
};

export default AnalyzeTab;
