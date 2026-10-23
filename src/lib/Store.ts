import { projects as seedProjects, voices } from '@/lib/appData';
import type { Chapter, CoverId, Project, Voice } from '@/lib/types';
import { createStore, type Store, type MutationPayload, type Context } from 'vuex';

const PROJECTS_KEY = 'audiobook.projects';

export interface State {
    projects: Project[];
    voices: Voice[];
}

const coverCycle: CoverId[] = ['ink', 'wine', 'moss', 'sand', 'dusk', 'copper'];

function touch(project: Project) {
    project.updatedAt = new Date().toISOString();
}

function findProject(state: State, projectID: string) {
    return state.projects.find((project) => project.id === projectID) ?? null;
}

function findChapter(project: Project, chapterID: string) {
    return project.chapters.find((chapter) => chapter.id === chapterID) ?? null;
}

function slugify(title: string) {
    const base = title
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    return base || 'project';
}

function uniqueSlug(projects: Project[], title: string) {
    const base = slugify(title);
    const taken = new Set(projects.map((project) => project.slug));
    if (!taken.has(base)) return base;
    let index = 2;
    while (taken.has(`${base}-${index}`)) index += 1;
    return `${base}-${index}`;
}

function isStoredProject(value: unknown): value is Project {
    if (!value || typeof value !== 'object') return false;
    const project = value as Project;
    return typeof project.id === 'string' && typeof project.slug === 'string' && typeof project.title === 'string' && Array.isArray(project.chapters);
}

function loadProjects(): Project[] {
    try {
        const raw = localStorage.getItem(PROJECTS_KEY);
        if (!raw) return seedProjects;
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed) || !parsed.every(isStoredProject)) return seedProjects;
        return parsed;
    } catch {
        return seedProjects;
    }
}

function persistProjects(store: Store<State>) {
    store.subscribe((mutation: MutationPayload, state: State) => {
        try {
            localStorage.setItem(PROJECTS_KEY, JSON.stringify(state.projects));
        } catch {
            // Storage can fail when it is full or unavailable.
        }
    });
}

const store = createStore<State>({
    state: {
        voices,
        projects: loadProjects(),
    },
    plugins: [persistProjects],
    mutations: {
        setActiveChapter(state: State, payload: { projectID: string; chapterID: string; }) {
            const project = findProject(state, payload.projectID);
            if (!project) return;
            project.activechapterID = payload.chapterID;
        },
        addProject(state: State, project: Project) {
            state.projects.unshift(project);
        },
        removeProject(state: State, projectID: string) {
            const index = state.projects.findIndex((project) => project.id === projectID);
            if (index >= 0) state.projects.splice(index, 1);
        },
        insertProject(state: State, payload: { project: Project; index: number; }) {
            const index = Math.max(0, Math.min(payload.index, state.projects.length));
            state.projects.splice(index, 0, payload.project);
        },

        updateProjectTitle(state: State, payload: { projectID: string; title: string; }) {
            const project = findProject(state, payload.projectID);
            if (!project) return;
            project.title = payload.title;
            touch(project);
        },
        updateProjectAuthor(state: State, payload: { projectID: string; author: string; }) {
            const project = findProject(state, payload.projectID);
            if (!project) return;
            project.author = payload.author;
            touch(project);
        },

        updateChapterTitle(state: State, payload: { projectID: string; chapterID: string; title: string; }) {
            const project = findProject(state, payload.projectID);
            const chapter = project && findChapter(project, payload.chapterID);
            if (!project || !chapter) return;
            chapter.title = payload.title;
            touch(project);
        },
        updateChapterText(state: State, payload: { projectID: string; chapterID: string; text: string; }) {
            const project = findProject(state, payload.projectID);
            const chapter = project && findChapter(project, payload.chapterID);
            if (!project || !chapter) return;
            chapter.text = payload.text;
            touch(project);
        },
        updateChapterGain(state: State, payload: { projectID: string; chapterID: string; gain: number; }) {
            const project = findProject(state, payload.projectID);
            const chapter = project && findChapter(project, payload.chapterID);
            if (!project || !chapter) return;
            chapter.gain = payload.gain;
            touch(project);
        },
        updateProjectSource(state: State, payload: { projectID: string; source: string; }) {
            const project = findProject(state, payload.projectID);
            if (!project) return;
            project.source = payload.source;
            touch(project);
        },
        updateChapterVoice(state: State, payload: { projectID: string; chapterID: string; voiceID: string; }) {
            const project = findProject(state, payload.projectID);
            const chapter = project && findChapter(project, payload.chapterID);
            if (!project || !chapter) return;
            chapter.voiceID = payload.voiceID;
            project.voiceID = payload.voiceID;
            touch(project);
        },

        synthesizeChapter(state: State, payload: {
            projectID: string;
            chapterID: string;
            voiceID: string;
            text: string;
            duration: number;
            peaks: number[];
            audio: string;
        }) {
            const project = findProject(state, payload.projectID);
            const chapter = project && findChapter(project, payload.chapterID);
            if (!project || !chapter) return;
            chapter.synthesizedText = payload.text;
            chapter.synthesizedVoiceId = payload.voiceID;
            chapter.duration = payload.duration;
            chapter.peaks = payload.peaks;
            chapter.audio = payload.audio;
            touch(project);
        },
        removeChapter(state: State, payload: { projectID: string; chapterID: string; }) {
            const project = findProject(state, payload.projectID);
            if (!project || project.chapters.length <= 1) return;
            const index = project.chapters.findIndex((chapter) => chapter.id === payload.chapterID);
            if (index < 0) return;
            project.chapters.splice(index, 1);
            if (project.activechapterID === payload.chapterID) {
                const neighbor = project.chapters[Math.max(0, index - 1)];
                if (neighbor) project.activechapterID = neighbor.id;
            }
            touch(project);
        },
        resetChapterTitles(state: State, payload: { projectID: string; }) {
            const project = findProject(state, payload.projectID);
            if (!project) return;
            project.chapters.forEach((chapter, index) => {
                chapter.title = `Chapter ${index + 1}`;
            });
            touch(project);
        },
        reorderChapters(state: State, payload: { projectID: string; fromId: string; toId: string; }) {
            const project = findProject(state, payload.projectID);
            if (!project || payload.fromId === payload.toId) return;
            const from = project.chapters.findIndex((chapter) => chapter.id === payload.fromId);
            const to = project.chapters.findIndex((chapter) => chapter.id === payload.toId);
            if (from < 0 || to < 0) return;
            const [moved] = project.chapters.splice(from, 1);
            if (moved) project.chapters.splice(to, 0, moved);
            touch(project);
        },
    },
    actions: {
        async createProject(context: Context, payload: { title: string; author: string; voiceID: string; }) {
            const project: Project = {
                id: crypto.randomUUID(),
                slug: uniqueSlug(context.state.projects, payload.title),
                title: payload.title.trim(),
                author: payload.author.trim() || 'Unknown author',
                voiceID: payload.voiceID,
                cover: coverCycle[context.state.projects.length % coverCycle.length] ?? 'ink',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                activechapterID: '',
                chapters: []
            };
            context.commit('addProject', project);
            return project;
        },
        async addChapter(context: Context, payload: { projectID: string; title: string; text: string; voiceID: string; }) {
            const project = findProject(context.state, payload.projectID);
            if (!project) return;
            const next: Chapter = {
                id: crypto.randomUUID(),
                title: payload.title,
                text: payload.text,
                synthesizedText: null,
                synthesizedVoiceId: null,
                duration: 0,
                voiceID: payload.voiceID,
                peaks: [],
                gain: 1,
                audio: null,
            };
            project.chapters.push(next);
            project.activechapterID = next.id;
            touch(project);
            console.log('next', next);
            return next;
        },
    },
    getters: {
        projectsByRecent(state: State): Project[] {
            return [...state.projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        },
        projectBySlug: (state: State) => (slug: string) => state.projects.find((project) => project.slug === slug) ?? null,
    },
});

export default store;
