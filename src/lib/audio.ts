import type { Chapter, ChapterState, Project, ProjectStatus } from '@/lib/types';

const WORDS_PER_MINUTE = 156;

export function wordCount(text: string): number {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
}

export function narrationSeconds(text: string): number {
    const words = wordCount(text);
    if (!words) return 0;
    return Math.max(1, Math.round((words / WORDS_PER_MINUTE) * 60));
}

function hashString(input: string): number {
    let hash = 2166136261;
    for (let index = 0; index < input.length; index += 1) {
        hash ^= input.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function mulberry32(seed: number) {
    let state = seed;
    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let next = Math.imul(state ^ (state >>> 15), 1 | state);
        next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
        return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
    };
}

export function waveformFromText(text: string, bars?: number): number[] {
    const seconds = narrationSeconds(text);
    const count = bars ?? Math.max(220, Math.min(960, Math.round(seconds * 14) || 220));
    const random = mulberry32(hashString(text || 'silence'));
    const words = text.split(/\s+/).filter(Boolean);
    const peaks = new Array<number>(count).fill(0.045);

    if (!words.length) return peaks;

    words.forEach((word, index) => {
        const start = Math.floor((index / words.length) * count);
        const end = Math.max(start + 1, Math.floor(((index + 1) / words.length) * count));
        const letters = word.replace(/[^a-zA-Z]/g, '');
        const vowels = (letters.match(/[aeiouAEIOU]/g) || []).length;
        const energy = Math.min(1, 0.22 + Math.min(letters.length, 14) / 16 + vowels * 0.035);
        const pause = /[.!?…"']$/.test(word) ? 0.16 : /[,;:—–-]$/.test(word) ? 0.42 : 1;

        for (let cursor = start; cursor < end; cursor += 1) {
            const span = Math.max(1, end - start);
            const envelope = Math.sin(((cursor - start) / span) * Math.PI);
            const jitter = 0.68 + random() * 0.32;
            peaks[cursor] = Math.max(0.04, Math.min(1, energy * pause * (0.42 + envelope * 0.58) * jitter));
        }
    });

    const smoothed = peaks.slice();
    for (let pass = 0; pass < 2; pass += 1) {
        const source = smoothed.slice();
        for (let index = 1; index < count - 1; index += 1) {
            const left = source[index - 1] ?? 0;
            const middle = source[index] ?? 0;
            const right = source[index + 1] ?? 0;
            smoothed[index] = left * 0.22 + middle * 0.56 + right * 0.22;
        }
    }

    return smoothed;
}

export function chapterState(chapter: Chapter): ChapterState {
    const text = chapter.text.trim();
    if (!text) return 'empty';
    if (!chapter.synthesizedText) return 'draft';
    if (chapter.synthesizedText !== chapter.text || chapter.synthesizedVoiceId !== chapter.voiceID) return 'stale';
    return 'ready';
}

export function projectStatus(project: Project): ProjectStatus {
    if (project.chapters.length && project.chapters.every((chapter) => chapterState(chapter) === 'ready')) {
        return 'ready';
    }
    if (project.chapters.some((chapter) => {
        const state = chapterState(chapter);
        return state === 'ready' || state === 'stale';
    })) {
        return 'in-progress';
    }
    return 'draft';
}

export function chapterClock(chapter: Chapter): number {
    if (chapter.peaks.length) return chapter.duration;
    return narrationSeconds(chapter.text);
}

export function projectDuration(project: Project): number {
    return project.chapters.reduce((total, chapter) => total + chapterClock(chapter), 0);
}

export function formatClock(seconds: number): string {
    const whole = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(whole / 60);
    const remain = whole % 60;
    return `${minutes}:${String(remain).padStart(2, '0')}`;
}

export function formatTimecode(seconds: number): string {
    const safe = Math.max(0, seconds);
    const minutes = Math.floor(safe / 60);
    const remain = Math.floor(safe % 60);
    const frames = Math.floor((safe % 1) * 100);
    return `${String(minutes).padStart(2, '0')}:${String(remain).padStart(2, '0')}.${String(frames).padStart(2, '0')}`;
}

export function formatRuntime(seconds: number): string {
    const whole = Math.max(0, Math.round(seconds));
    const hours = Math.floor(whole / 3600);
    const minutes = Math.floor((whole % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${whole}s`;
}

export const chapterStateLabel: Record<ChapterState, string> = {
    empty: 'Empty',
    draft: 'Not rendered',
    stale: 'Out of date',
    ready: 'Current',
};

export const projectStatusLabel: Record<ProjectStatus, string> = {
    draft: 'Draft',
    'in-progress': 'In progress',
    ready: 'Ready',
};
