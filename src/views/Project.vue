<template>
    <div
        v-if="project && chapter"
        class="flex h-full min-h-0 flex-col"
    >
        <header class="flex h-11 shrink-0 items-center gap-2 border-b px-2">
            <Button
                variant="ghost"
                size="icon-sm"
                class="md:hidden"
                aria-label="Chapters"
                @click="sidebarOpen = !sidebarOpen"
            >
                <PanelLeft />
            </Button>

            <div class="hidden md:flex min-w-0 items-center gap-2">
                <input
                    :value="project.title"
                    aria-label="Project title"
                    class="h-7 w-50 truncate rounded-sm border border-transparent bg-transparent px-1.5 text-sm font-medium outline-none hover:border-border focus:border-ring"
                    @input="onProjectTitle"
                />

                <span class="text-muted-foreground/50">/</span>
                <input
                    :value="project.author"
                    aria-label="Author"
                    class="h-7 w-20 truncate rounded-sm border border-transparent bg-transparent px-1.5 text-xs text-muted-foreground outline-none hover:border-border focus:border-ring sm:w-40"
                    @input="onProjectAuthor"
                />
                <span class="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground ">
                    <span
                        class="size-1.5 rounded-full"
                        :class="statusDot[status]"
                    />
                    {{ projectStatusLabel[status] }}
                </span>
            </div>

            <div class="ml-auto flex items-center gap-2">
                <Button
                    size="sm"
                    :variant="needsRender ? 'default' : 'outline'"
                    :disabled="!wordCount(chapter.text) || synthesizingID !== null"
                    title="Synthesize (⌘Enter)"
                    @click="synthesize"
                >
                    <Loader2
                        v-if="synthesizingID === chapter.id"
                        class="animate-spin"
                    />
                    <AudioLines v-else />
                    Synthesize
                </Button>
                <Button
                    @click="exportChapter"
                    variant="outline"
                    size="sm"
                >
                    <Download />
                    Export
                </Button>
            </div>
        </header>

        <div class="relative flex min-h-0 flex-1 overflow-hidden">
            <button
                v-if="sidebarOpen"
                type="button"
                class="absolute inset-0 z-10 bg-black/40 md:hidden"
                aria-label="Close chapters"
                @click="sidebarOpen = false"
            ></button>

            <aside
                class="z-20 w-64 shrink-0 flex-col border-r bg-background"
                :class="sidebarOpen ? 'absolute inset-y-0 left-0 flex md:static' : 'hidden md:flex'"
            >
                <div class="flex h-9 shrink-0 items-center justify-between border-b px-3">
                    <span class="text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">Chapters</span>
                    <span class="text-[11px] text-muted-foreground tabular-nums">{{ project.chapters.length }}</span>
                </div>
                <div class="min-h-0 flex-1 overflow-y-auto">
                    <div
                        v-for="(item, index) in project.chapters"
                        :id="`chapter-${item.id}`"
                        :key="item.id"
                        draggable="true"
                        class="group flex cursor-pointer items-start gap-1 border-l-2 px-2 py-2"
                        :class="[
                            item.id === chapter.id ? 'border-foreground bg-accent' : 'border-transparent hover:bg-accent/60',
                            dragOverId === item.id && draggingId !== item.id ? 'shadow-[inset_0_2px_0_0_var(--foreground)]' : '',
                            draggingId === item.id ? 'opacity-40' : '',
                        ]"
                        role="button"
                        tabindex="0"
                        :aria-current="item.id === chapter.id ? 'true' : undefined"
                        @click="selectChapter(item.id)"
                        @keydown.enter="selectChapter(item.id)"
                        @keydown.space.stop.prevent="selectChapter(item.id)"
                        @dragstart="onDragStart($event, item.id)"
                        @dragover.prevent="dragOverId = item.id"
                        @drop="onDrop(item.id)"
                        @dragend="clearDrag"
                    >
                        <span class="mt-0.5 w-6 shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
                            {{ String(index + 1).padStart(2, '0') }}
                        </span>
                        <span class="min-w-0 flex-1">
                            <span class="flex items-baseline justify-between gap-2">
                                <span class="truncate text-sm">{{ item.title || 'Untitled' }}</span>
                                <span class="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
                                    {{ durationLabel(item) }}
                                </span>
                            </span>
                            <span class="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <span
                                    class="size-1.5 rounded-full"
                                    :class="dotClass(chapterState(item))"
                                />
                                {{ chapterStateLabel[chapterState(item)] }}
                            </span>
                        </span>
                        <DropdownMenu>
                            <DropdownMenuTrigger as-child>
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    class="mt-0.5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                                    aria-label="Chapter actions"
                                    data-chapter-menu
                                    @click.stop
                                >
                                    <MoreHorizontal />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    :disabled="index === 0"
                                    @click="moveChapter(index, -1)"
                                >
                                    Move up
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    :disabled="index === project.chapters.length - 1"
                                    @click="moveChapter(index, 1)"
                                >
                                    Move down
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    variant="destructive"
                                    :disabled="project.chapters.length <= 1"
                                    @click="askRemoveChapter(item)"
                                >
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <button
                    type="button"
                    class="flex h-8 shrink-0 items-center gap-2 border-t px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                    @click="addChapter"
                >
                    <Plus class="size-3.5" />
                    Add chapter
                </button>
            </aside>

            <section class="flex min-h-0 min-w-0 flex-1 flex-col">
                <div class="mx-auto flex w-full max-w-3xl min-h-0 flex-1 flex-col px-6 pt-8 pb-4 sm:px-10">
                    <input
                        :value="chapter.title"
                        aria-label="Chapter title"
                        placeholder="Chapter title"
                        class="font-manuscript w-full shrink-0 bg-transparent text-[1.75rem] leading-tight tracking-tight outline-none placeholder:text-muted-foreground/50"
                        @input="onChapterTitle"
                    />
                    <textarea
                        :value="chapter.text"
                        aria-label="Manuscript"
                        spellcheck="true"
                        placeholder="Write the chapter here. Synthesis builds a waveform from this text."
                        class="font-manuscript mt-4 min-h-0 w-full flex-1 resize-none bg-transparent text-[1.125rem] leading-[1.7] outline-none placeholder:text-muted-foreground/50"
                        @input="onChapterText"
                    />
                </div>
                <div class="flex h-8 shrink-0 items-center gap-4 border-t px-4 text-[11px] text-muted-foreground tabular-nums">
                    <span>Ch {{ chapterIndex }}</span>
                    <span>{{ wordCount(chapter.text).toLocaleString('en-US') }} words</span>
                    <span>{{ formatClock(narrationSeconds(chapter.text)) }}</span>
                    <span class="hidden sm:inline">{{ voiceName }}</span>
                    <span
                        class="ml-auto"
                        :class="state === 'stale' ? 'text-amber-600 dark:text-amber-400' : ''"
                    >
                        {{ chapterStateLabel[state] }}
                    </span>
                </div>
            </section>
        </div>

        <AudioEditor
            :key="chapter.id"
            :chapter="chapter"
            :src="chapterAudio[chapter.id]"
            :label="`Ch ${chapterIndex}  ${chapter.title || 'Untitled'}`"
            :stale="state === 'stale'"
            :synthesizing="synthesizingID === chapter.id"
            @update:gain="onGain"
        />

        <Dialog v-model:open="confirming">
            <DialogContent class="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Delete chapter</DialogTitle>
                    <DialogDescription>
                        {{ pendingChapter?.title }} will be removed from this project.
                        <div class="flex items-center gap-3 mt-2">
                            <Checkbox
                                id="resetChapterNamesterms"
                                v-model="resetChapterNames"
                            />
                            <Label for="resetChapterNames">Reset chapter names</Label>
                        </div>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        variant="outline"
                        @click="confirming = false"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        @click="removeChapter"
                    >
                        Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
    <div
        v-else
        class="grid h-full place-items-center px-6 text-center"
    >
        <div>
            <p class="text-sm font-medium">This project is not in the library</p>
            <Button
                class="mt-4"
                size="sm"
                as-child
            >
                <router-link to="/">Back to library</router-link>
            </Button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { chapterClock, chapterState, chapterStateLabel, formatClock, narrationSeconds, projectStatus, projectStatusLabel, wordCount } from '@/lib/audio';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AudioLines, Download, Loader2, MoreHorizontal, PanelLeft, Plus } from 'lucide-vue-next';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { Chapter, Project, ProjectStatus, Voice } from '@/lib/types';
import AudioEditor from '@/components/studio/AudioEditor.vue';
import { Checkbox } from '@/components/ui/checkbox';
import { AudioGenerator } from '@/AudioGenerator';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useRoute } from 'vue-router';
import { toast } from 'vue-sonner';
import { useStore } from 'vuex';


const store = useStore();
const route = useRoute();
const sidebarOpen = ref(true);
const resetChapterNames = ref(false);
const synthesizingID = ref<string | null>(null);
const draggingId = ref<string | null>(null);
const dragOverId = ref<string | null>(null);
const confirming = ref(false);
const pendingChapter = ref<{ id: string; title: string; } | null>(null);
const chapterAudio = ref<Record<string, string>>({});
const audioGenerator = new AudioGenerator();


const chapter = ref<Chapter | null>(null);
const slug = computed(() => {
    const value = route.params.projectSlug;
    return Array.isArray(value) ? value[0] : value;
});
const project = computed(() => store.getters.projectBySlug(slug.value) as Project);
const voices = computed(() => store.state.voices as Voice[]);
const state = computed(() => chapter.value ? chapterState(chapter.value) : 'empty');
const status = computed(() => project.value ? projectStatus(project.value) : 'draft');
const needsRender = computed(() => state.value === 'draft' || state.value === 'stale');
const chapterIndex = computed(() => {
    if (!project.value || !chapter.value) return '01';
    const index = project.value.chapters.findIndex((item) => item.id === chapter.value?.id);
    return String(index + 1).padStart(2, '0');
});
const voiceName = computed(() => voices.value.find((voice) => voice.id === chapter.value?.voiceID)?.name ?? '');

const statusDot: Record<ProjectStatus, string> = {
    draft: 'bg-muted-foreground/50',
    'in-progress': 'bg-amber-500',
    ready: 'bg-foreground',
};

watch(project, (current) => {
    document.title = current ? `${current.title} — Audiobook Studio` : 'Audiobook Studio';
    if (!current) return;
    if (!current.chapters.some((item) => item.id === current.activechapterID) && current.chapters[0]) {
        store.commit('setActiveChapter', { projectID: current.id, chapterID: current.chapters[0].id });
    }
}, { immediate: true });

watch(() => project.value?.activechapterID, async (chapterID) => {
    if (!chapterID) return;
    await nextTick();
    document.getElementById(`chapter-${chapterID}`)?.scrollIntoView({ block: 'nearest' });
});

onMounted(async () => {
    if (window.innerWidth < 768) sidebarOpen.value = false;
    window.addEventListener('keydown', onKeyDown);

    if (!project.value || project.value.chapters.length === 0) {
        const newChapter = await store.dispatch('addChapter', {
            projectID: project.value?.id || '',
            title: 'Chapter 1',
            text: '',
            voiceID: project.value?.voiceID || '',
        }) as Chapter;
        chapter.value = newChapter;
    } else {
        chapter.value = project.value.chapters[0] as Chapter;
        if (chapter.value?.id && project.value?.id) {
            audioGenerator.loadFromOPFS(project.value.id, chapter.value.id).then((blob) => {
                if (blob && chapter.value?.id) chapterAudio.value[chapter.value.id] = URL.createObjectURL(blob);
            });
        }
    }
});

onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeyDown);
    audioGenerator.close();
    for (const url of Object.values(chapterAudio.value)) URL.revokeObjectURL(url);
});

function dotClass(value: ReturnType<typeof chapterState>) {
    if (value === 'ready') return 'bg-foreground';
    if (value === 'stale') return 'bg-amber-500';
    if (value === 'draft') return 'bg-muted-foreground/60';
    return 'bg-transparent ring-1 ring-muted-foreground/50';
}

function durationLabel(item: Chapter) {
    const seconds = chapterClock(item);
    if (!seconds) return '—';
    const clock = formatClock(seconds);
    return item.peaks.length ? clock : `~${clock}`;
}

function selectChapter(chapterID: string) {
    if (!project.value) return;
    const c = project.value.chapters.find((item) => item.id === chapterID) as Chapter;
    if (c) chapter.value = c;
    if (window.innerWidth < 768) sidebarOpen.value = false;
    audioGenerator.loadFromOPFS(project.value?.id || '', chapterID).then((blob) => {
        if (blob) chapterAudio.value[chapterID] = URL.createObjectURL(blob);
    });
}

function onProjectTitle(event: Event) {
    if (!project.value) return;
    store.commit('updateProjectTitle', {
        projectID: project.value.id,
        title: (event.target as HTMLInputElement).value,
    });
}

function onProjectAuthor(event: Event) {
    if (!project.value) return;
    store.commit('updateProjectAuthor', {
        projectID: project.value.id,
        author: (event.target as HTMLInputElement).value,
    });
}

function onChapterTitle(event: Event) {
    if (!project.value || !chapter.value) return;
    store.commit('updateChapterTitle', {
        projectID: project.value.id,
        chapterID: chapter.value.id,
        title: (event.target as HTMLInputElement).value,
    });
}

function onChapterText(event: Event) {
    if (!project.value || !chapter.value) return;
    store.commit('updateChapterText', {
        projectID: project.value.id,
        chapterID: chapter.value.id,
        text: (event.target as HTMLTextAreaElement).value,
    });
}

function onGain(gain: number) {
    if (!project.value || !chapter.value) return;
    store.commit('updateChapterGain', {
        projectID: project.value.id,
        chapterID: chapter.value.id,
        gain,
    });
}

function addChapter() {
    if (!project.value) return;
    store.dispatch('addChapter', {
        projectID: project.value.id,
        title: `Chapter ${project.value.chapters.length + 1}`,
        text: '',
        voiceID: project.value?.voiceID || '',
    }) as Chapter;
}

function askRemoveChapter(item: Chapter) {
    pendingChapter.value = { id: item.id, title: item.title || 'Untitled' };
    confirming.value = true;
}

function removeChapter() {
    const target = pendingChapter.value;
    if (!project.value || !target) return;
    confirming.value = false;
    store.commit('removeChapter', { projectID: project.value.id, chapterID: target.id });

    if (resetChapterNames.value) {
        store.commit('resetChapterTitles', { projectID: project.value.id });
    }
}

function moveChapter(index: number, direction: number) {
    if (!project.value) return;
    const from = project.value.chapters[index];
    const to = project.value.chapters[index + direction];
    if (!from || !to) return;
    store.commit('reorderChapters', { projectID: project.value.id, fromId: from.id, toId: to.id });
}

async function synthesize() {
    if (!project.value || !chapter.value || synthesizingID.value) return;
    const text = chapter.value.text.trim();
    if (!text) return;
    const projectID = project.value.id;
    const chapterID = chapter.value.id;
    let voiceID = chapter.value.voiceID;
    if (!voices.value.some((voice) => voice.id === voiceID)) {
        voiceID = voices.value[0]?.id ?? 'af_heart';
        store.commit('updateChapterVoice', { projectID, chapterID, voiceID });
    }
    synthesizingID.value = chapterID;

    try {
        const blob = await audioGenerator.generate({ text, voiceID });
        const waveform = await readWaveform(blob);
        const url = URL.createObjectURL(blob);
        const previous = chapterAudio.value[chapterID];
        if (previous) URL.revokeObjectURL(previous);
        chapterAudio.value = { ...chapterAudio.value, [chapterID]: url };

        store.commit('synthesizeChapter', {
            projectID,
            chapterID,
            voiceID,
            text,
            duration: waveform.duration,
            peaks: waveform.peaks,
            audio: url,
        });
        toast('Chapter synthesized', {
            description: `${formatClock(waveform.duration)} rendered from the manuscript.`,
        });

        await audioGenerator.saveToOPFS(blob, projectID, chapterID);
    } catch (error) {
        console.error(error);
        toast('Synthesis failed', {
            description: error instanceof Error ? error.message : 'The chapter could not be rendered.',
        });
    } finally {
        if (synthesizingID.value === chapterID) synthesizingID.value = null;
    }
}

async function readWaveform(blob: Blob) {
    const context = new AudioContext();
    try {
        const decoded = await context.decodeAudioData(await blob.arrayBuffer());
        const channel = decoded.getChannelData(0);
        const bars = Math.max(220, Math.min(960, Math.round(decoded.duration * 14) || 220));
        const block = Math.max(1, Math.floor(channel.length / bars));
        const peaks = new Array<number>(bars);
        for (let index = 0; index < bars; index += 1) {
            let peak = 0;
            const start = index * block;
            const end = Math.min(channel.length, start + block);
            for (let cursor = start; cursor < end; cursor += 1) {
                const sample = Math.abs(channel[cursor] ?? 0);
                if (sample > peak) peak = sample;
            }
            peaks[index] = peak;
        }
        return { duration: decoded.duration, peaks };
    } finally {
        await context.close();
    }
}

async function exportChapter() {
    const target = chapter.value;
    if (!project.value || !target) return;
    if (!target.audio) {
        if (!target.text.trim()) {
            toast('Nothing to export', {
                description: 'Write the chapter before exporting.',
            });
            return;
        }
        await synthesize();
    }
    const audio = target.audio;
    if (!audio) return;
    try {
        const response = await fetch(audio);
        if (!response.ok) throw new Error('The chapter audio could not be read.');
        const blob = await response.blob();
        const extension = blob.type.includes('mpeg') ? 'mp3' : 'wav';
        const title = (target.title || 'Untitled chapter').replace(/[\\/:*?"<>|]+/g, '').trim() || 'chapter';
        downloadBlob(blob, `${title}.${extension}`);
    } catch (error) {
        toast('Export failed', {
            description: error instanceof Error ? error.message : 'The chapter audio could not be downloaded.',
        });
    }
}

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function onDragStart(event: DragEvent, chapterID: string) {
    if ((event.target as HTMLElement | null)?.closest('[data-chapter-menu]')) {
        event.preventDefault();
        return;
    }
    draggingId.value = chapterID;
    event.dataTransfer?.setData('text/plain', chapterID);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
}

function onDrop(targetId: string) {
    const fromId = draggingId.value;
    clearDrag();
    if (!project.value || !fromId || fromId === targetId) return;
    store.commit('reorderChapters', { projectID: project.value.id, fromId, toId: targetId });
}

function clearDrag() {
    draggingId.value = null;
    dragOverId.value = null;
}

function onKeyDown(event: KeyboardEvent) {
    if (document.querySelector('[role="dialog"]')) return;
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        synthesize();
    }
}
</script>
