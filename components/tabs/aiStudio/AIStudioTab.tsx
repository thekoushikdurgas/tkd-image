import React, { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { ImageFile, StudioMessage, Notification as NotificationType } from '../../../types';
import { runStudioQuery, fileToBase64 } from '../../../services/geminiService';
import MediaUploader from '../../common/MediaUploader';
import Spinner from '../../common/Spinner';
import AIStudioIcon from '../../icons/AIStudioIcon';

interface AIStudioTabProps {
    user: User;
    setError: (error: string | null) => void;
}

const AIStudioTab: React.FC<AIStudioTabProps> = ({ user, setError }) => {
    const [studioMedia, setStudioMedia] = useState<ImageFile | null>(null);
    const [studioMessages, setStudioMessages] = useState<StudioMessage[]>([]);
    const [studioIsRunning, setStudioIsRunning] = useState(false);
    const [studioModel, setStudioModel] = useState<'gemini-2.5-flash' | 'gemini-2.5-pro'>('gemini-2.5-flash');
    const [studioUseThinking, setStudioUseThinking] = useState(false);
    const [studioUseGrounding, setStudioUseGrounding] = useState(false);
    const [studioPrompt, setStudioPrompt] = useState('');

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
            const modelMessage: StudioMessage = {
                id: Date.now() + 1,
                role: 'model',
                text: `Sorry, an error occurred: ${e.message || "Please try again."}`,
            };
            setStudioMessages(prev => [...prev, modelMessage]);
        } finally {
            setStudioIsRunning(false);
        }
    };

    const handleMediaFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            try {
                const mediaData = await fileToBase64(file);
                setStudioMedia(mediaData);
            } catch (err) {
                setError("Failed to process media file.");
                console.error(err);
            }
        }
    };

    return (
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
                                <div className="mb-2">
                                    {msg.media.mimeType.startsWith('image/') ?
                                        <img src={`data:${msg.media.mimeType};base64,${msg.media.base64}`} className="rounded-lg max-h-48" alt="User upload" /> :
                                        <video src={`data:${msg.media.mimeType};base64,${msg.media.base64}`} controls className="rounded-lg max-h-48" />
                                    }
                                </div>
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
                       {!studioMedia && 
                        <label htmlFor="studio-media-upload" className="p-2 bg-border-color rounded-lg hover:bg-gray-600 transition cursor-pointer">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                            <input type="file" id="studio-media-upload" className="hidden" accept="image/*,video/*" onChange={handleMediaFileSelected} />
                        </label>
                       }
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
    );
};

export default AIStudioTab;
