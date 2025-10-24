import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { db } from '../services/firebase';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import Spinner from './Spinner';

interface HistoryItem {
  id: string;
  imageUrl: string;
  prompt: string;
  createdAt: Date;
}

interface HistoryProps {
  user: User;
  historyKey: number;
}

const History: React.FC<HistoryProps> = ({ user, historyKey }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const historyRef = collection(db, 'analysisHistory');
      const q = query(historyRef, where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const historyData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          imageUrl: data.imageUrl,
          prompt: data.prompt,
          createdAt: (data.createdAt as Timestamp).toDate(),
        };
      }) as HistoryItem[];

      setHistory(historyData);
    } catch (e: any) {
      console.error("Error fetching history:", e.message || e);
      if (e.code === 'unavailable' || e.code === 'deadline-exceeded') {
        setError("Could not connect to the server to load your history. Please check your internet connection and try again.");
      } else {
        setError("An unexpected error occurred while loading your history. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, historyKey]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center space-y-4">
          <Spinner className="w-12 h-12 text-primary mx-auto" />
          <p className="text-lg font-semibold text-slate-600">Loading your history...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-md text-center" role="alert">
            <p className="font-bold">Error Loading History</p>
            <p className="mt-2">{error}</p>
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
    <div className="bg-card-bg p-6 rounded-xl shadow-md animate-fade-in">
        <h2 className="text-3xl font-bold text-text-primary mb-6">Analysis History</h2>
        {history.length > 0 ? (
            <div className="space-y-6">
                {history.map((item) => (
                    <div key={item.id} className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 border border-slate-200 rounded-lg">
                        <div className="md:col-span-1">
                            <img src={item.imageUrl} alt="Analyzed image" className="rounded-md object-cover w-full h-full aspect-square" loading="lazy" />
                        </div>
                        <div className="md:col-span-2 flex flex-col">
                            <p className="text-xs text-slate-500 mb-2">{item.createdAt.toLocaleString()}</p>
                            <div className="bg-slate-100 p-3 rounded-md h-full overflow-y-auto">
                               <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700">{item.prompt}</pre>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="text-center py-16 px-6 border-2 border-dashed border-slate-300 rounded-xl">
                 <svg className="mx-auto h-12 w-12 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-text-primary">No history yet</h3>
                <p className="mt-1 text-sm text-slate-500">
                    Use the 'Analyze & Prompt' tab to create prompts. Your results will be saved here.
                </p>
            </div>
        )}
    </div>
  );
};

export default History;