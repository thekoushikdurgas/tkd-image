export enum Tab {
  Analyze = 'Analyze',
  Generate = 'Generate & Edit',
  ModelCreator = 'Model Creator',
  AIStudio = 'AI Studio',
  Gallery = 'Gallery',
  History = 'History',
}

export interface HistoryItem {
  id: string;
  imageUrl: string;
  prompt: string;
  createdAt: Date;
}

export interface ImageFile {
  base64: string;
  mimeType: string;
}

export type Notification = {
  message: string;
  type: 'success' | 'error';
};

export interface StudioMessage {
  id: number;
  role: 'user' | 'model';
  text: string;
  media?: ImageFile;
  grounding?: any[];
}
