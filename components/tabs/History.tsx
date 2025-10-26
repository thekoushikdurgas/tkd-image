import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../../services/supabaseClient';
import Spinner from '../common/Spinner';
import { HistoryItem, Notification } from '../../types';
import Tooltip from '../common/Tooltip';
import UsePromptIcon from '../icons/UsePromptIcon';
import PasteIcon from '../icons/PasteIcon';
import { copyToClipboard, pasteFromClipboard } from '../../utils/clipboardUtils';

interface HistoryProps {
  user: User;
  historyKey: number;
  onUseHistoryItem: (item: Pick<HistoryItem, 'imageUrl' | 'prompt'>) => void;
  setNotification: (notification: Notification | null) => void;
  setError: (error: string | null) => void;
}

const History: React.FC<HistoryProps> = ({ user, historyKey, onUseHistoryItem, setNotification, setError }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [editablePrompts, setEditablePrompts] = useState<Record<string, string>>({});
  const [refiningPromptId, setRefiningPromptId] = useState<string | null>(null);


  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase
        .from('analysis_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const historyData = data.map(item => ({
        id: item.id,
        imageUrl: item.image_url,
        prompt: item.prompt,
        createdAt: new Date(item.created_at),
      })) as HistoryItem[];

      setHistory(historyData);
    } catch (e: any) {
      console.error("Error fetching history:", e.message || e);
      if (e.message.includes('network')) {
        setFetchError("Could not connect to the server to load your history. Please check your internet connection and try again.");
      } else {
        setFetchError("An unexpected error occurred while loading your history. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, historyKey]);

  useEffect(() => {
    if (history.length > 0) {
        const prompts = history.reduce((acc, item) => {
            acc[item.id] = item.prompt;
            return acc;
        }, {} as Record<string, string>);
        setEditablePrompts(prompts);
    }
  }, [history]);

  const handlePromptChange = (id: string, newPrompt: string) => {
    setEditablePrompts(prev => ({ ...prev, [id]: newPrompt }));
  };

  const toggleRefinePrompt = (id: string) => {
    setRefiningPromptId(prevId => (prevId === id ? null : id));
  };

  const handleCopy = (text: string) => {
    copyToClipboard(text, 
      () => {
        setNotification({ message: 'Prompt copied to clipboard!', type: 'success' });
        setTimeout(() => setNotification(null), 3000);
      },
      () => setError('Failed to copy prompt to clipboard.')
    );
  };
  
  const handlePaste = (id: string) => {
    pasteFromClipboard(
      (text) => {
        handlePromptChange(id, text);
        setRefiningPromptId(id);
      },
      () => {
        setNotification({ message: 'Pasted from clipboard!', type: 'success' });
        setTimeout(() => setNotification(null), 3000);
      },
      () => setError('Could not paste from clipboard. Please check browser permissions.')
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center space-y-4">
          <Spinner className="w-12 h-12 text-primary mx-auto" />
          <p className="text-lg font-semibold text-text-secondary">Loading your history...</p>
        </div>
      </div>
    );
  }
  
  if (fetchError) {
    return (
        <div className="bg-red-500/20 border-l-4 border-red-500 text-red-300 p-6 rounded-md text-center" role="alert">
            <p className="font-bold">Error Loading History</p>
            <p className="mt-2">{fetchError}</p>
            <button
                onClick={fetchHistory}
                className="mt-4 px-5 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition"
            >
                Retry
            </button>
        </div>
    );
  }

  return (
    <div className="bg-card-bg p-6 rounded-xl shadow-lg animate-fade-in">
        <h2 className="text-3xl font-bold text-text mb-6">Analysis History</h2>
        {history.length > 0 ? (
            <div className="space-y-6">
                {history.map((item) => {
                    const currentPrompt = editablePrompts[item.id] || item.prompt;
                    const isRefining = refiningPromptId === item.id;

                    return (
                      <div key={item.id} className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 border border-border-color rounded-lg">
                          <div className="md:col-span-1">
                              <img src={item.imageUrl} alt="Analyzed" className="rounded-md object-cover w-full h-full aspect-square" loading="lazy" />
                          </div>
                          <div className="md:col-span-2 flex flex-col">
                              <div className="flex justify-between items-center mb-2">
                                <p className="text-xs text-text-secondary">{item.createdAt.toLocaleString()}</p>
                                <div className="flex items-center gap-2">
                                  <Tooltip text="Use in Generator">
                                    <button
                                      onClick={() => onUseHistoryItem({ imageUrl: item.imageUrl, prompt: currentPrompt })}
                                      className="p-2 rounded-md bg-accent text-white hover:bg-emerald-600 transition"
                                      aria-label="Use this prompt and image in the Generate tab"
                                    >
                                      <UsePromptIcon />
                                    </button>
                                  </Tooltip>
                                  <Tooltip text="Paste from clipboard">
                                    <button onClick={() => handlePaste(item.id)} className="p-2 rounded-md bg-border-color hover:bg-gray-600 transition">
                                      <PasteIcon/>
                                    </button>
                                  </Tooltip>
                                  <Tooltip text={isRefining ? 'Save Changes' : 'Refine Prompt'}>
                                    <button onClick={() => toggleRefinePrompt(item.id)} className="p-2 rounded-md bg-border-color hover:bg-gray-600 transition">
                                        {isRefining ? (
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
                                    <button onClick={() => handleCopy(currentPrompt)} className="p-2 rounded-md bg-border-color hover:bg-gray-600 transition">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                            <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                                            <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3z"/>
                                        </svg>
                                    </button>
                                  </Tooltip>
                                </div>
                              </div>
                              <div className="relative bg-background p-3 rounded-md h-full flex flex-col flex-grow min-h-[100px]">
                                  {isRefining ? (
                                      <textarea
                                          value={currentPrompt}
                                          onChange={(e) => handlePromptChange(item.id, e.target.value)}
                                          className="w-full h-full bg-border-color p-2 border border-primary rounded-md focus:ring-2 focus:ring-primary focus:border-transparent transition resize-none font-sans text-sm text-text flex-grow"
                                          aria-label="Refine prompt"
                                          autoFocus
                                      />
                                  ) : (
                                      <div className="overflow-y-auto flex-grow">
                                          <pre className="whitespace-pre-wrap font-sans text-sm text-text-secondary">{currentPrompt}</pre>
                                      </div>
                                  )}
                              </div>
                          </div>
                      </div>
                    )
                })}
            </div>
        ) : (
            <div className="text-center py-16 px-6 border-2 border-dashed border-border-color rounded-xl">
                 <svg className="mx-auto h-12 w-12 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-text">No history yet</h3>
                <p className="mt-1 text-sm text-text-secondary">
                    Use the 'Analyze & Prompt' tab to create prompts. Your results will be saved here.
                </p>
            </div>
        )}
    </div>
  );
};

export default History;
