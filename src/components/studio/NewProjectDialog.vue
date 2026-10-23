<template>
    <DialogContent class="sm:max-w-md">
        <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
            <DialogDescription>
                A project holds the book text and synthesized audio.
            </DialogDescription>
        </DialogHeader>
        <form
            class="grid gap-4"
            @submit.prevent="create"
        >
            <div
                id="dropZone"
                @click="fileInput?.click()"
                @dragenter.prevent="onDragEnter"
                @dragover.prevent="onDragOver"
                @dragleave.prevent="onDragLeave"
                @drop.prevent="onDrop"
                class="mt-2 h-[120px] flex items-center justify-center text-center rounded-2xl border-2 border-dashed transition-[border-color,background-color] duration-200 cursor-pointer"
                :class="dragging
                    ? 'border-[#4da3ff] bg-[#181818]'
                    : 'border-[#555] hover:border-[#4da3ff] hover:bg-[#181818]'"
            >
                <div
                    id="dropText"
                    class="pointer-events-none px-4"
                >
                    <template v-if="file">
                        <strong style="word-break: break-all; white-space: pre-line;">{{ file.name }}</strong>
                        <br><br>
                        Drop another file to replace it
                    </template>

                    <template v-else>
                        <strong>{{ dragging ? 'Release to add this file' : 'Drop a .PDF or .TXT file here' }}</strong>
                        <br><br>
                        or click to select a file
                    </template>
                </div>
                <input
                    id="fileInput"
                    ref="fileInput"
                    accept=".pdf,.txt,application/pdf,text/plain"
                    @change="handleFileChange($event)"
                    type="file"
                    class="hidden"
                />
            </div>

            <div class="grid gap-2">
                <Label for="project-title">Title</Label>
                <Input
                    id="project-title"
                    v-model="title"
                    autofocus
                    placeholder="Working Title"
                    autocomplete="off"
                />
            </div>
            <div class="grid gap-2">
                <Label for="project-author">Author</Label>
                <Input
                    id="project-author"
                    v-model="author"
                    placeholder="Optional"
                    autocomplete="off"
                />
            </div>
            <div class="grid gap-2">
                <Label for="project-voice">Narrator</Label>
                <Select v-model="voiceID">
                    <SelectTrigger
                        id="project-voice"
                        class="w-full"
                    >
                        <SelectValue placeholder="Choose a voice" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem
                            v-for="voice in voices"
                            :key="voice.id"
                            :value="voice.id"
                        >
                            {{ voice.name }}
                        </SelectItem>
                        <SelectItem
                            value="disabled"
                            disabled
                        >
                            More Voices Coming Soon...
                        </SelectItem>
                    </SelectContent>
                </Select>
                <p class="text-xs text-muted-foreground">{{ selectedVoice?.detail }}</p>
            </div>
            <DialogFooter>
                <DialogClose as-child>
                    <Button
                        type="button"
                        variant="outline"
                    >
                        Cancel
                    </Button>
                </DialogClose>
                <Button
                    type="submit"
                    :disabled="!title.trim() || creating"
                >
                    {{ creating ? 'Creating…' : 'Create Project' }}
                </Button>
            </DialogFooter>
        </form>
    </DialogContent>
</template>

<script setup lang="ts">
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { extractPdfText, isPdf } from '@/lib/pdf';
import type { Project, Voice } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'vue-router';
import { computed, ref } from 'vue';
import { toast } from 'vue-sonner';
import { useStore } from 'vuex';

const store = useStore();
const router = useRouter();

const fileInput = ref<HTMLInputElement | null>(null);
const file = ref<File | null>(null);
const title = ref('');
const author = ref('');
const voiceID = ref('af_heart');
const creating = ref(false);
const dragging = ref(false);
let dragDepth = 0;

const voices = computed(() => store.state.voices as Voice[]);
const selectedVoice = computed(() => voices.value.find((voice) => voice.id === voiceID.value));

function isTextFile(file: File) {
    return file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt');
}

function setFile(next: File | null) {
    if (!next) return;
    if (!isPdf(next) && !isTextFile(next)) return toast.error('Choose a PDF or TXT file');
    file.value = next;
    if (title.value.trim() === '') title.value = next.name;
}

function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    setFile(input.files?.[0] ?? null);
}

function onDragEnter() {
    dragDepth += 1;
    dragging.value = true;
}

function onDragOver(event: DragEvent) {
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
}

function onDragLeave() {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) dragging.value = false;
}

function onDrop(event: DragEvent) {
    dragDepth = 0;
    dragging.value = false;
    setFile(event.dataTransfer?.files?.[0] ?? null);
}

async function create() {
    try {
        const name = title.value.trim();
        const narrator = voiceID.value || voices.value[0]?.id;
        if (!name || !narrator || creating.value) return;
        creating.value = true;

        const project = await store.dispatch('createProject', {
            title: name,
            author: author.value,
            voiceID: narrator,
        }) as Project;

        if (file.value) {
            let text = '';
            if (file.value && isPdf(file.value)) {
                text = await extractPdfText(file.value);
            } else if (file.value && isTextFile(file.value)) {
                text = await file.value.text();
            }

            if (text) {
                const regex = /(chapter[\s]*((\d+)|([ivxlc]+)))/gi;
                let splits: string[] = [];
                let match;
                let lastIndex = 0;
                while ((match = regex.exec(text)) !== null) {
                    if (match.index > lastIndex) {
                        const chunk = text.substring(lastIndex, match.index).trim();
                        if (chunk) splits.push(chunk);
                    }
                    lastIndex = match.index;
                }
                const finalChunk = text.substring(lastIndex).trim();
                if (finalChunk) splits.push(finalChunk);
                if (splits.length === 0) splits = [text.trim()];

                for (let i = 0; i < splits.length; i++) {
                    await store.dispatch('addChapter', {
                        projectID: project.id,
                        title: `Chapter ${i + 1}`,
                        text: splits[i],
                        voiceID: narrator,
                    });
                }

                const root = await navigator.storage.getDirectory();
                const extension = file.value?.name.split('.').pop() || 'txt';
                const source = `source-${project.id}.${extension}`;
                const pdfHandle = await root.getFileHandle(source, { create: true });
                const writable = await pdfHandle.createWritable();
                const arrayBuffer = await file.value.arrayBuffer();
                await writable.write(arrayBuffer);
                await writable.close();
                store.commit('updateProjectSource', { projectID: project.id, source });
            }
        }

        return router.push(`/project/${project.slug}`);
    } catch (error) {
        console.error(error);
        toast.error('Could not create project');
    } finally {
        creating.value = false;
    }
}
</script>
