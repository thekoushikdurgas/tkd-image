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
