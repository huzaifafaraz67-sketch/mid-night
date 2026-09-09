export type GameMode = 'menu' | 'story' | 'survival' | 'practice' | 'dead' | 'won' | 'paused';

export type GraphicPreset = 'ultra' | 'high' | 'medium' | 'retro';

export interface StoryChapter {
  id: number;
  title: string;
  timeString: string;
  subtitle: string;
  objective: string;
  narrativePrompt: string;
  loreClue: string;
}

export interface NoteDocument {
  id: string;
  title: string;
  subtitle: string;
  content: string[];
  footer: string;
  author: string;
}

export interface SecretEndingInfo {
  title: string;
  description: string;
  endingNumber: number;
}
