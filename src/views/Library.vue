<template>
    <div class="h-full overflow-y-auto">
        <div class="mx-auto max-w-7xl px-6 py-8">
            <header class="border-b pb-8">
                <p class="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                    Welcome
                </p>
                <h1 class="mt-2 max-w-xl text-3xl font-medium tracking-tight">
                    Audiobook Studio
                </h1>
                <p class="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    Audiobook Studio is a client-side PDF to AudioBook Generator. This app does not use any Ai platfroms like OpenAI or Anthropic. All processing is done locally in your browser. <a
                        href="https://github.com/anthonybudd/audiobook-studio"
                        target="_blank"
                        rel="noopener"
                        class="text-foreground hover:underline"
                    >Code on GitHub</a>
                </p>
            </header>

            <div class="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 class="text-2xl font-medium tracking-tight">Library</h2>
                    <p class="mt-1 text-sm text-muted-foreground tabular-nums">
                        {{ projects.length }} {{ projects.length === 1 ? 'project' : 'projects' }}
                        · {{ chapterTotal }} {{ chapterTotal === 1 ? 'chapter' : 'chapters' }}
                        · {{ runtime }}
                    </p>
                </div>
                <div class="flex items-center gap-2">
                    <div class="relative w-full sm:w-64">
                        <Search class="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            v-model="query"
                            placeholder="Search library"
                            class="h-8 pl-8"
                            aria-label="Search library"
                        />
                    </div>

                    <Dialog>
                        <DialogTrigger as-child>
                            <Button variant="outline">
                                <Plus />
                                New project
                            </Button>
                        </DialogTrigger>
                        <NewProjectDialog />
                    </Dialog>
                </div>
            </div>

            <div class="mt-8 flex items-end gap-5 border-b">
                <button
                    v-for="item in filters"
                    :key="item.id"
                    type="button"
                    class="-mb-px border-b pb-2 text-sm cursor-pointer"
                    :class="filter === item.id ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'"
                    @click="filter = item.id"
                >
                    {{ item.label }}
                    <span class="ml-1.5 text-xs tabular-nums text-muted-foreground">{{ counts[item.id] }}</span>
                </button>
                <span class="mb-2 ml-auto hidden text-xs text-muted-foreground sm:inline">Last edited</span>
            </div>

            <div
                v-if="filtered.length"
                class="mt-6 grid grid-cols-2 gap-x-5 gap-y-8 lg:grid-cols-3 xl:grid-cols-4"
            >
                <Book
                    v-for="project in filtered"
                    :key="project.id"
                    :project="project"
                />
            </div>
            <div
                v-else
                class="mt-16 border border-dashed px-6 py-16 text-center"
            >
                <p class="text-sm font-medium">
                    {{ projects.length ? 'No projects found' : 'The library is empty' }}
                </p>
                <p class="mt-1 text-sm text-muted-foreground">
                    {{ projects.length ? 'Try another search or filter.' : '' }}
                </p>
                <Dialog v-if="!projects.length">
                    <DialogTrigger as-child>
                        <Button
                            class="mt-4"
                            size="sm"
                        >
                            <Plus />
                            New Project
                        </Button>
                    </DialogTrigger>
                    <NewProjectDialog />
                </Dialog>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { formatRuntime, projectDuration, projectStatus } from '@/lib/audio';
import NewProjectDialog from '@/components/studio/NewProjectDialog.vue';
import { Dialog, DialogTrigger, } from '@/components/ui/dialog';
import type { Project, ProjectStatus } from '@/lib/types';
import Book from '@/components/library/Book.vue';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-vue-next';
import { Input } from '@/components/ui/input';
import { computed, ref } from 'vue';
import { useStore } from 'vuex';

const store = useStore();
const query = ref('');
const filter = ref<ProjectStatus | 'all'>('all');

const filters: { id: ProjectStatus | 'all'; label: string; }[] = [
    { id: 'all', label: 'All' },
    { id: 'draft', label: 'Drafts' },
    { id: 'in-progress', label: 'In progress' },
    { id: 'ready', label: 'Ready' },
];

const projects = computed(() => store.getters.projectsByRecent as Project[]);
const chapterTotal = computed(() => projects.value.reduce((total, project) => total + project.chapters.length, 0));
const runtime = computed(() => formatRuntime(projects.value.reduce((total, project) => total + projectDuration(project), 0)));

const counts = computed(() => ({
    all: projects.value.length,
    draft: projects.value.filter((project) => projectStatus(project) === 'draft').length,
    'in-progress': projects.value.filter((project) => projectStatus(project) === 'in-progress').length,
    ready: projects.value.filter((project) => projectStatus(project) === 'ready').length,
}));

const filtered = computed(() => {
    const term = query.value.trim().toLowerCase();
    return projects.value.filter((project) => {
        if (filter.value !== 'all' && projectStatus(project) !== filter.value) return false;
        if (!term) return true;
        return project.title.toLowerCase().includes(term) || project.author.toLowerCase().includes(term);
    });
});
</script>
