import React, { useState, useEffect } from 'react';
import { ImageFile, Notification } from '../../../types';
import { generateImage, inpaintImage, generateImageFromText, editImage } from '../../../services/geminiService';
import { pasteFromClipboard } from '../../../utils/clipboardUtils';
import ImageUploader from '../../common/ImageUploader';
import InpaintEditor from '../../editor/InpaintEditor';
import Spinner from '../../common/Spinner';
import Tooltip from '../../common/Tooltip';
import PasteIcon from '../../icons/PasteIcon';
import SaveIcon from '../../icons/SaveIcon';

interface GenerateTabProps {
    initialPrompt: string;
    initialImage: ImageFile | null;
    clearInitialData: () => void;
    onSaveToGallery: (generatedImage: string) => void;
    setError: (error: string | null) => void;
    setNotification: (notification: Notification | null) => void;
}

const GenerateTab: React.FC<GenerateTabProps> = ({ initialPrompt, initialImage, clearInitialData, onSaveToGallery, setError, setNotification }) => {
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

    useEffect(() => {
        if (initialPrompt) setUserPrompt(initialPrompt);
        if (initialImage) {
            setGenerateImageFile(initialImage);
            setGenerateMode('stylize');
        }
        return () => {
            clearInitialData();
        }
    }, [initialPrompt, initialImage, clearInitialData]);

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
                    newImage = await generateImage(generateImageFile.base64, generateImageFile.mimeType, userPrompt, negativePrompt, aspectRatio, styleStrength, imageQuality);
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

    const handleImageForGeneration = (imageFile: ImageFile) => {
        setGenerateImageFile(imageFile);
        setMaskImage(null); // Clear mask when a new image is uploaded
    }
    
    return (
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
                    onClick={() => onSaveToGallery(generatedResultImage)}
                    className="w-full bg-success text-background font-bold py-3 px-4 rounded-lg hover:bg-green-500 transition duration-300 flex items-center justify-center gap-2"
                >
                    <SaveIcon />
                    Save to Gallery
                </button>
                </div>
            )}
            </div>
        </div>
    );
};

export default GenerateTab;
