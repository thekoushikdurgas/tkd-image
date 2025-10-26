import React, { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { ImageFile } from '../../../types';
import { analyzeForModel, generateImage } from '../../../services/geminiService';
import Spinner from '../../common/Spinner';
import MultiImageUploader from './MultiImageUploader';
import ConfidenceGauge from './ConfidenceGauge';
import ModelCreatorIcon from '../../icons/ModelCreatorIcon';

interface ModelCreatorTabProps {
    user: User;
    setError: (error: string | null) => void;
}

const ModelCreatorTab: React.FC<ModelCreatorTabProps> = ({ user, setError }) => {
    const [modelCreatorImages, setModelCreatorImages] = useState<ImageFile[]>([]);
    const [modelAnalysis, setModelAnalysis] = useState<{ facialStructure: string; bodyStructure: string } | null>(null);
    const [modelConfidence, setModelConfidence] = useState<number>(0);
    const [modelResultImage, setModelResultImage] = useState<string>('');
    const [isModeling, setIsModeling] = useState<boolean>(false);
    const [isImageLoading, setIsImageLoading] = useState<boolean>(false);

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
            const { characterSheet, confidenceScore } = await analyzeForModel(modelCreatorImages);
            setModelAnalysis(characterSheet);
            setModelConfidence(confidenceScore);

            const portraitPrompt = `Create a realistic, front-facing 3D-style character portrait of a person. The background should be a neutral gray studio background. The character should be based on the following detailed description.
            Facial Structure: ${characterSheet.facialStructure}
            Body Structure: ${characterSheet.bodyStructure}
            The final image should look like a high-quality 3D render.`;
            
            const referenceImage = modelCreatorImages[0];
            
            const newImage = await generateImage(
                referenceImage.base64,
                referenceImage.mimeType,
                portraitPrompt,
                'blurry, deformed, cartoon, sketch, text, watermark',
                '1:1', 3, 'high'
            );
            
            setIsImageLoading(true);
            setModelResultImage(`data:${newImage.mimeType};base64,${newImage.base64}`);
        } catch (e: any) {
            setError(e.message || 'Failed to create model. Please try again.');
            console.error('Model Creation Error:', e.message || e);
        } finally {
            setIsModeling(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start animate-fade-in">
            <div className="bg-card-bg p-6 rounded-xl shadow-lg space-y-4">
                <h2 className="text-2xl font-bold text-text">1. Upload Reference Images</h2>
                <p className="text-sm text-text-secondary">Provide one or more images of a person. More images from different angles will result in a more accurate model and a higher confidence score.</p>
                <MultiImageUploader images={modelCreatorImages} setImages={setModelCreatorImages} setError={setError} />
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
                        <div className="aspect-square bg-background rounded-lg flex items-center justify-center">
                            {modelResultImage ? (
                                <img src={modelResultImage} alt="Generated model portrait" className={`w-full h-full object-contain rounded-lg transition-opacity duration-500 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`} onLoad={() => setIsImageLoading(false)} />
                            ) : (
                                <div className="text-text-secondary">Generating portrait...</div>
                            )}
                            {isImageLoading && <Spinner className="absolute w-12 h-12 text-primary" />}
                        </div>
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
    );
};

export default ModelCreatorTab;
