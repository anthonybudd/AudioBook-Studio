<template>
    <div class="group relative">
        <router-link
            :to="`/project/${project.slug}`"
            class="block rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            <div
                class="relative aspect-[3/4] overflow-hidden border border-border transition-colors group-hover:border-foreground/30"
                :style="{ background: `linear-gradient(165deg, ${covers[project.cover].from}, ${covers[project.cover].to})` }"
            >
                <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.16),transparent_42%)]" />
                <p class="absolute top-3 left-3 text-[10px] font-medium tracking-[0.16em] text-white/65 uppercase">
                    {{ projectStatusLabel[projectStatus(project)] }}
                </p>
                <p class="font-manuscript absolute right-4 bottom-12 text-6xl leading-none text-white/90">
                    {{ initial(project.title) }}
                </p>
                <svg
                    class="absolute right-3 bottom-3 h-6 w-16 text-white/70"
                    :viewBox="`0 0 16 20`"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                >
                    <rect
                        v-for="(peak, index) in thumbnail(project)"
                        :key="index"
                        :x="index"
                        :y="10 - peak * 8"
                        width="0.62"
                        :height="Math.max(0.8, peak * 16)"
                        fill="currentColor"
                    />
                </svg>
            </div>
            <div class="mt-2.5 flex items-start justify-between gap-3">
                <div class="min-w-0">
                    <h2 class="truncate text-sm font-medium">{{ project.title }}</h2>
                    <p class="truncate text-xs text-muted-foreground">{{ project.author }}</p>
                </div>
            </div>
            <p class="mt-1 text-[11px] text-muted-foreground tabular-nums">
                {{ project.chapters.length }} {{ project.chapters.length === 1 ? 'chapter' : 'chapters' }}
                · {{ formatRuntime(projectDuration(project)) }}
                · {{ edited(project.updatedAt) }}
            </p>
        </router-link>
        <DropdownMenu>
            <DropdownMenuTrigger as-child>
                <Button
                    variant="secondary"
                    size="icon-sm"
                    class="absolute top-2 right-2 z-10 opacity-100 sm:pointer-events-none sm:opacity-0 sm:group-hover:pointer-events-auto sm:group-hover:opacity-100 sm:group-focus-within:pointer-events-auto sm:group-focus-within:opacity-100"
                    aria-label="Project actions"
                    @click.prevent
                >
                    <MoreHorizontal />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem @click="router.push(`/project/${project.slug}`)">
                    Open
                </DropdownMenuItem>
                <Dialog>
                    <DialogTrigger as-child>
                        <div
                            class="cursor-pointer select-none relative flex items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-accent text-destructive"
                            role="menuitem"
                            tabindex="0"
                        >
                            Delete
                        </div>
                    </DialogTrigger>
                    <DialogContent class="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Delete project</DialogTitle>
                            <DialogDescription>
                                {{ project.title }} will be removed from the library.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <DialogClose as-child>
                                <Button variant="outline">
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button
                                variant="destructive"
                                @click="removeProject(project)"
                            >
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </DropdownMenuContent>
        </DropdownMenu>
    </div>
</template>

<script setup lang="ts">
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatRuntime, projectDuration, projectStatus, projectStatusLabel } from '@/lib/audio';
import { MoreHorizontal } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import type { Project } from '@/lib/types';
import { useRouter } from 'vue-router';
import { covers } from '@/lib/covers';
import { toast } from 'vue-sonner';
import { useStore } from 'vuex';
import dayjs from 'dayjs';

const router = useRouter();
const store = useStore();

const props = defineProps<{
    project: Project;
}>();


function edited(timestamp: string) {
    return dayjs(timestamp).fromNow();
}

function initial(title: string) {
    const letter = title.replace(/[^A-Za-z]/g, '').charAt(0);
    return letter || 'A';
}

function thumbnail(project: Project) {
    const peaks = project.chapters.find((chapter) => chapter.peaks.length)?.peaks ?? [];
    if (!peaks.length) return Array.from({ length: 16 }, () => 0.18);
    const step = peaks.length / 16;
    return Array.from({ length: 16 }, (_, index) => peaks[Math.floor(index * step)] ?? 0.18);
}

function removeProject(project: Project) {
    store.commit('removeProject', project.id);
    toast('Project Removed', {
        description: project.title,
    });
}
</script>