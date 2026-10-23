export type CoverId = 'ink' | 'wine' | 'moss' | 'sand' | 'dusk' | 'copper';

export type ChapterState = 'empty' | 'draft' | 'stale' | 'ready';

export type ProjectStatus = 'draft' | 'in-progress' | 'ready';

export interface Voice {
    id: string;
    name: string;
    detail: string;
}

export interface Chapter {
    id: string;
    title: string;
    text: string;
    voiceID: string;
    synthesizedText: string | null;
    synthesizedVoiceId: string | null;
    duration: number;
    peaks: number[];
    gain: number;
    audio: string | null;
}

export interface Project {
    id: string;
    source?: string | null;
    slug: string;
    title: string;
    author: string;
    voiceID: string;
    cover: CoverId;
    createdAt: string;
    updatedAt: string;
    activechapterID: string;
    chapters: Chapter[];
}
