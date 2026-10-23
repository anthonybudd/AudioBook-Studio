<template>
    <section
        class="flex shrink-0 flex-col border-t bg-background"
        :style="{ height: `${height}px` }"
    >
        <div
            class="h-1.5 shrink-0 cursor-row-resize border-b border-transparent hover:border-foreground/30"
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize audio editor"
            @pointerdown="startResize"
        />
        <div class="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b px-3 py-1.5">
            <div class="inline-flex items-center rounded-sm border">
                <Button
                    variant="ghost"
                    size="icon-sm"
                    class="rounded-none"
                    title="Back to start"
                    @click="seek(0)"
                >
                    <SkipBack />
                </Button>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    class="rounded-none border-x"
                    :title="playing ? 'Pause (Space)' : 'Play (Space)'"
                    :disabled="!hasAudio"
                    @click="togglePlay"
                >
                    <Pause v-if="playing" />
                    <Play v-else />
                </Button>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    class="rounded-none"
                    title="Go to end"
                    @click="seek(chapter.duration)"
                >
                    <SkipForward />
                </Button>
            </div>

            <div class="flex items-baseline gap-1.5 font-mono text-[12px] tabular-nums">
                <span>{{ formatTimecode(currentTime) }}</span>
                <span class="text-muted-foreground">/</span>
                <span class="text-muted-foreground">{{ formatTimecode(chapter.duration) }}</span>
            </div>

            <p class="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {{ label }}
            </p>

            <div
                v-if="selection"
                class="flex items-center gap-2 text-[11px] text-muted-foreground tabular-nums"
            >
                <span class="font-mono">Sel {{ formatClock(selection.end - selection.start) }}</span>
                <button
                    type="button"
                    class="hover:text-foreground"
                    @click="selection = null"
                >
                    Clear
                </button>
            </div>

            <Separator
                orientation="vertical"
                class="hidden h-4 sm:block"
            />

            <Button
                variant="ghost"
                size="icon-sm"
                title="Loop playback"
                :aria-pressed="loop"
                :class="loop ? 'bg-accent text-foreground' : 'text-muted-foreground'"
                @click="loop = !loop"
            >
                <Repeat />
            </Button>

            <button
                type="button"
                class="h-7 rounded-sm px-1.5 font-mono text-[11px] tabular-nums text-muted-foreground hover:bg-accent hover:text-foreground"
                title="Playback speed"
                @click="cycleSpeed"
            >
                {{ speed.toFixed(2) }}×
            </button>

            <label class="flex items-center gap-2 text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                Gain
                <input
                    class="gain"
                    type="range"
                    min="0.4"
                    max="1.6"
                    step="0.01"
                    :value="chapter.gain"
                    :aria-valuetext="chapter.gain.toFixed(2)"
                    @input="onGain"
                />
                <span class="w-8 font-mono text-[11px] tracking-normal tabular-nums normal-case">{{ chapter.gain.toFixed(2) }}</span>
            </label>

            <div class="inline-flex items-center">
                <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Zoom out"
                    :disabled="zoom <= 1"
                    @click="setZoom(zoom / 1.35)"
                >
                    <ZoomOut />
                </Button>
                <span class="w-9 text-center font-mono text-[11px] text-muted-foreground tabular-nums">
                    {{ zoom <= 1.01 ? 'Fit' : `${zoom.toFixed(1)}×` }}
                </span>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Zoom in"
                    @click="setZoom(zoom * 1.35)"
                >
                    <ZoomIn />
                </Button>
            </div>
        </div>

        <div class="relative min-h-0 flex-1">
            <canvas
                ref="canvasRef"
                class="block h-full w-full touch-none focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                role="slider"
                tabindex="0"
                aria-label="Chapter waveform"
                :aria-valuemin="0"
                :aria-valuemax="Math.round(chapter.duration)"
                :aria-valuenow="Math.round(currentTime)"
                :aria-valuetext="formatTimecode(currentTime)"
                @pointerdown="onPointerDown"
                @pointermove="onPointerMove"
                @pointerup="onPointerUp"
                @pointercancel="onPointerUp"
                @wheel.prevent="onWheel"
            />
            <div
                v-if="!hasAudio"
                class="pointer-events-none absolute inset-0 grid place-items-center"
            >
                <p class="text-xs text-muted-foreground">
                    Synthesize this chapter to build a waveform
                </p>
            </div>
            <p
                v-else-if="stale"
                class="pointer-events-none absolute top-2 right-3 text-[10px] font-medium tracking-[0.14em] text-amber-600 uppercase dark:text-amber-400"
            >
                Out of date
            </p>
            <div
                v-if="synthesizing"
                class="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-foreground/10"
            >
                <div class="load-bar h-full w-1/3 bg-foreground" />
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatClock, formatTimecode } from '@/lib/audio';
import type { Chapter } from '@/lib/types';
import { useColorMode } from '@vueuse/core';
import { Pause, Play, Repeat, SkipBack, SkipForward, ZoomIn, ZoomOut } from 'lucide-vue-next';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps<{
    chapter: Chapter;
    label: string;
    stale: boolean;
    synthesizing: boolean;
    src?: string;
}>();

const emit = defineEmits<{
    'update:gain': [gain: number];
}>();

const speeds = [0.75, 1, 1.25, 1.5, 2];
const theme = useColorMode();
const canvasRef = ref<HTMLCanvasElement | null>(null);
const height = ref(248);
const playing = ref(false);
const currentTime = ref(0);
const speed = ref(1);
const loop = ref(false);
const zoom = ref(1);
const viewStart = ref(0);
const selection = ref<{ start: number; end: number } | null>(null);
const hoverTime = ref<number | null>(null);

const hasAudio = computed(() => props.chapter.duration > 0 && (Boolean(props.src) || props.chapter.peaks.length > 0));

type Drag =
    | { kind: 'pending'; anchorTime: number; anchorX: number }
    | { kind: 'select'; anchorTime: number }
    | { kind: 'trim-start' }
    | { kind: 'trim-end' }
    | { kind: 'overview' };

let drag: Drag | null = null;
let frame = 0;
let lastTick = 0;
let observer: ResizeObserver | null = null;
let media: HTMLAudioElement | null = null;
let audioContext: AudioContext | null = null;
let mediaGain: GainNode | null = null;

function paint(variable: string, alpha = 1) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || 'oklch(0.2 0 0)';
    if (alpha >= 1) return value;
    return `color-mix(in oklch, ${value} ${Math.round(alpha * 100)}%, transparent)`;
}

function viewSpan() {
    return props.chapter.duration / zoom.value;
}

function clampView() {
    const duration = props.chapter.duration;
    if (duration <= 0) {
        viewStart.value = 0;
        return;
    }
    const span = duration / zoom.value;
    const max = Math.max(0, duration - span);
    viewStart.value = Math.min(Math.max(0, viewStart.value), max);
}

function setZoom(next: number, anchorRatio = 0.5) {
    const duration = props.chapter.duration;
    if (duration <= 0) return;
    const previousSpan = duration / zoom.value;
    const anchor = viewStart.value + previousSpan * anchorRatio;
    zoom.value = Math.min(48, Math.max(1, next));
    const span = duration / zoom.value;
    viewStart.value = anchor - span * anchorRatio;
    clampView();
    draw();
}

function cycleSpeed() {
    const index = speeds.findIndex((value) => Math.abs(value - speed.value) < 0.001);
    const next = speeds[(index + 1) % speeds.length];
    if (next !== undefined) speed.value = next;
}

function seek(time: number) {
    if (props.src) ensureMedia(props.src);
    const duration = playbackDuration();
    const next = Math.min(Math.max(0, time), duration || 0);
    currentTime.value = next;
    if (media && Math.abs(media.currentTime - next) > 0.05) {
        media.currentTime = next;
    }
}

function playbackDuration() {
    if (media && Number.isFinite(media.duration) && media.duration > 0) return media.duration;
    return props.chapter.duration;
}

function ensureMedia(src: string) {
    if (!media) {
        media = new Audio();
        media.preload = 'auto';
        audioContext = new AudioContext();
        mediaGain = audioContext.createGain();
        const source = audioContext.createMediaElementSource(media);
        source.connect(mediaGain);
        mediaGain.connect(audioContext.destination);
        media.addEventListener('ended', onMediaEnded);
    }
    if (mediaGain) mediaGain.gain.value = props.chapter.gain;
    media.playbackRate = speed.value;
    if (media.src === src) return;
    media.pause();
    playing.value = false;
    media.src = src;
    currentTime.value = 0;
}

function onMediaEnded() {
    if (!media) return;
    if (loop.value) {
        const { start } = bounds();
        media.currentTime = start;
        currentTime.value = start;
        void media.play();
        return;
    }
    playing.value = false;
}

function bounds() {
    const duration = props.chapter.duration;
    if (loop.value && selection.value && selection.value.end - selection.value.start > 0.05) {
        return { start: selection.value.start, end: selection.value.end };
    }
    return { start: 0, end: duration };
}

async function togglePlay() {
    if (!hasAudio.value) return;
    if (props.src) {
        ensureMedia(props.src);
        if (!media) return;
        if (!media.paused && !media.ended) {
            media.pause();
            playing.value = false;
            return;
        }
        const { start, end } = bounds();
        if (media.currentTime >= end - 0.05 || (loop.value && selection.value && media.currentTime < start)) {
            media.currentTime = start;
            currentTime.value = start;
        }
        if (audioContext?.state === 'suspended') await audioContext.resume();
        try {
            await media.play();
            playing.value = true;
        } catch {
            playing.value = false;
        }
        return;
    }
    const { start, end } = bounds();
    if (!playing.value && currentTime.value >= end - 0.05) currentTime.value = start;
    playing.value = !playing.value;
}

function onGain(event: Event) {
    emit('update:gain', Number((event.target as HTMLInputElement).value));
}

function timeAt(clientX: number) {
    const canvas = canvasRef.value;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return viewStart.value + ratio * viewSpan();
}

function xForTime(time: number, width: number) {
    const span = viewSpan() || 1;
    return ((time - viewStart.value) / span) * width;
}

function localPoint(event: PointerEvent) {
    const canvas = canvasRef.value!;
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top, width: rect.width, height: rect.height };
}

function onPointerDown(event: PointerEvent) {
    if (!hasAudio.value || !canvasRef.value) return;
    canvasRef.value.setPointerCapture(event.pointerId);
    const point = localPoint(event);
    const overview = zoom.value > 1.01 ? 18 : 0;
    if (overview && point.y > point.height - overview) {
        drag = { kind: 'overview' };
        panOverview(point.x, point.width);
        return;
    }
    const time = timeAt(event.clientX);
    const current = selection.value;
    if (current) {
        const startX = xForTime(current.start, point.width);
        const endX = xForTime(current.end, point.width);
        if (Math.abs(point.x - startX) < 6) {
            drag = { kind: 'trim-start' };
            return;
        }
        if (Math.abs(point.x - endX) < 6) {
            drag = { kind: 'trim-end' };
            return;
        }
    }
    drag = { kind: 'pending', anchorTime: time, anchorX: point.x };
}

function onPointerMove(event: PointerEvent) {
    if (!hasAudio.value) return;
    const point = localPoint(event);
    if (!drag) {
        const current = selection.value;
        if (current) {
            const startX = xForTime(current.start, point.width);
            const endX = xForTime(current.end, point.width);
            canvasRef.value!.style.cursor = Math.abs(point.x - startX) < 6 || Math.abs(point.x - endX) < 6 ? 'ew-resize' : 'crosshair';
        } else {
            canvasRef.value!.style.cursor = 'crosshair';
        }
        hoverTime.value = timeAt(event.clientX);
        draw();
        return;
    }
    const time = Math.min(Math.max(0, timeAt(event.clientX)), props.chapter.duration);
    if (drag.kind === 'overview') {
        panOverview(point.x, point.width);
        return;
    }
    if (drag.kind === 'pending' && Math.abs(point.x - drag.anchorX) > 4) {
        drag = { kind: 'select', anchorTime: drag.anchorTime };
    }
    if (drag.kind === 'select') {
        selection.value = {
            start: Math.min(drag.anchorTime, time),
            end: Math.max(drag.anchorTime, time),
        };
    } else if (drag.kind === 'trim-start' && selection.value) {
        selection.value = {
            start: Math.min(time, selection.value.end - 0.05),
            end: selection.value.end,
        };
    } else if (drag.kind === 'trim-end' && selection.value) {
        selection.value = {
            start: selection.value.start,
            end: Math.max(time, selection.value.start + 0.05),
        };
    }
    hoverTime.value = time;
    draw();
}

function onPointerUp(event: PointerEvent) {
    if (drag?.kind === 'pending') {
        selection.value = null;
        seek(drag.anchorTime);
    }
    drag = null;
    if (canvasRef.value?.hasPointerCapture(event.pointerId)) {
        canvasRef.value.releasePointerCapture(event.pointerId);
    }
    draw();
}

function panOverview(x: number, width: number) {
    const duration = props.chapter.duration;
    const span = viewSpan();
    const ratio = Math.min(1, Math.max(0, x / width));
    viewStart.value = ratio * duration - span / 2;
    clampView();
    draw();
}

function onWheel(event: WheelEvent) {
    if (!hasAudio.value || !canvasRef.value) return;
    const rect = canvasRef.value.getBoundingClientRect();
    if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        const delta = event.deltaX || event.deltaY;
        viewStart.value += (delta / rect.width) * viewSpan();
        clampView();
        draw();
        return;
    }
    const ratio = (event.clientX - rect.left) / rect.width;
    setZoom(zoom.value * (event.deltaY > 0 ? 1 / 1.12 : 1.12), ratio);
}

function draw() {
    const canvas = canvasRef.value;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const width = parent.clientWidth;
    const cssHeight = parent.clientHeight;
    if (width < 2 || cssHeight < 2) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(cssHeight * dpr);
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, cssHeight);

    const ruler = 22;
    const overview = zoom.value > 1.01 && hasAudio.value ? 16 : 0;
    const waveTop = ruler;
    const waveHeight = Math.max(8, cssHeight - ruler - overview);
    const mid = waveTop + waveHeight / 2;
    const duration = props.chapter.duration;
    const peaks = props.chapter.peaks;
    const gain = props.chapter.gain;

    context.fillStyle = paint('--muted-foreground', 0.9);
    context.font = '10px "Plus Jakarta Sans", ui-sans-serif, sans-serif';
    context.textBaseline = 'top';
    context.strokeStyle = paint('--border', 1);
    context.beginPath();
    context.moveTo(0, ruler - 0.5);
    context.lineTo(width, ruler - 0.5);
    context.stroke();

    if (duration > 0) {
        const span = viewSpan();
        const steps = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
        let step = steps[steps.length - 1] ?? 300;
        for (const candidate of steps) {
            if (span / candidate <= width / 90) {
                step = candidate;
                break;
            }
        }
        const first = Math.ceil(viewStart.value / step) * step;
        for (let tick = first; tick < viewStart.value + span; tick += step) {
            const x = xForTime(tick, width);
            context.strokeStyle = paint('--border', 1);
            context.beginPath();
            context.moveTo(x, 14);
            context.lineTo(x, ruler);
            context.stroke();
            const label = step < 1
                ? `${Math.floor(tick / 60)}:${String(Math.floor(tick % 60)).padStart(2, '0')}.${Math.round((tick % 1) * 10)}`
                : formatClock(tick);
            context.fillStyle = paint('--muted-foreground', 0.9);
            context.fillText(label, x + 4, 2);
        }
    }

    const drawBars = (alpha: number, clipRight?: number) => {
        context.save();
        if (clipRight !== undefined) {
            context.beginPath();
            context.rect(0, waveTop, clipRight, waveHeight);
            context.clip();
        }
        context.fillStyle = paint('--foreground', alpha);
        if (peaks.length && duration > 0) {
            const startIndex = Math.max(0, Math.floor((viewStart.value / duration) * peaks.length));
            const endIndex = Math.min(peaks.length, Math.ceil(((viewStart.value + viewSpan()) / duration) * peaks.length));
            const visible = Math.max(1, endIndex - startIndex);
            const barWidth = width / visible;
            for (let index = startIndex; index < endIndex; index += 1) {
                const amplitude = Math.min(1, (peaks[index] ?? 0) * gain);
                const bar = Math.max(1, amplitude * (waveHeight / 2 - 2));
                const x = (index - startIndex) * barWidth;
                const thickness = barWidth > 2.2 ? Math.max(1, barWidth - 0.8) : barWidth;
                context.fillRect(x, mid - bar, thickness, bar * 2);
            }
        }
        context.restore();
    };

    drawBars(props.synthesizing ? 0.12 : 0.28);
    if (hasAudio.value) {
        const playhead = xForTime(currentTime.value, width);
        if (playhead > 0) drawBars(props.synthesizing ? 0.35 : 0.92, playhead);
    }

    context.strokeStyle = paint('--foreground', 0.16);
    context.beginPath();
    context.moveTo(0, mid);
    context.lineTo(width, mid);
    context.stroke();

    if (selection.value && duration > 0) {
        const left = xForTime(selection.value.start, width);
        const right = xForTime(selection.value.end, width);
        context.fillStyle = paint('--foreground', 0.08);
        context.fillRect(left, 0, right - left, cssHeight - overview);
        context.fillStyle = paint('--foreground', 0.85);
        context.fillRect(left, 0, 1, cssHeight - overview);
        context.fillRect(right, 0, 1, cssHeight - overview);
    }

    if (hoverTime.value !== null && !drag && duration > 0) {
        const x = xForTime(hoverTime.value, width);
        context.strokeStyle = paint('--foreground', 0.2);
        context.beginPath();
        context.moveTo(x, ruler);
        context.lineTo(x, cssHeight - overview);
        context.stroke();
    }

    if (hasAudio.value) {
        const playhead = xForTime(currentTime.value, width);
        if (playhead >= -8 && playhead <= width + 8) {
            context.fillStyle = paint('--foreground', 1);
            context.fillRect(playhead, ruler, 1, cssHeight - ruler - overview);
            context.beginPath();
            context.moveTo(playhead - 4.5, 1);
            context.lineTo(playhead + 4.5, 1);
            context.lineTo(playhead, 8);
            context.closePath();
            context.fill();
        }
    }

    if (overview && duration > 0) {
        const top = cssHeight - overview;
        context.fillStyle = paint('--muted', 0.65);
        context.fillRect(0, top, width, overview);
        context.fillStyle = paint('--foreground', 0.35);
        const sample = 80;
        for (let index = 0; index < sample; index += 1) {
            const peak = peaks[Math.floor((index / sample) * peaks.length)] ?? 0;
            const bar = Math.max(1, peak * (overview - 4));
            context.fillRect((index / sample) * width, top + (overview - bar) / 2, width / sample - 0.4, bar);
        }
        const left = (viewStart.value / duration) * width;
        const viewport = (viewSpan() / duration) * width;
        context.strokeStyle = paint('--foreground', 0.8);
        context.strokeRect(left + 0.5, top + 0.5, Math.max(4, viewport - 1), overview - 1);
    }
}

function tick(now: number) {
    if (!playing.value) return;
    if (media && props.src) {
        const { start, end } = bounds();
        const time = media.currentTime;
        if (!Number.isFinite(time)) {
            frame = requestAnimationFrame(tick);
            return;
        }
        if (loop.value && selection.value && (time < start || time >= end - 0.03)) {
            media.currentTime = start;
            currentTime.value = start;
        } else if (time >= end - 0.03) {
            if (loop.value) {
                media.currentTime = start;
                currentTime.value = start;
            } else {
                media.pause();
                currentTime.value = Math.min(time, end);
                playing.value = false;
                return;
            }
        } else {
            currentTime.value = time;
        }
        frame = requestAnimationFrame(tick);
        return;
    }
    const delta = Math.min(0.05, (now - lastTick) / 1000) * speed.value;
    lastTick = now;
    const { start, end } = bounds();
    let next = currentTime.value + delta;
    if (loop.value && selection.value && (currentTime.value < start || currentTime.value > end)) {
        next = start;
    } else if (next >= end) {
        if (loop.value) next = start;
        else {
            next = end;
            playing.value = false;
        }
    }
    currentTime.value = next;
    if (playing.value) frame = requestAnimationFrame(tick);
}

function startResize(event: PointerEvent) {
    const startY = event.clientY;
    const startHeight = height.value;
    const move = (pointer: PointerEvent) => {
        height.value = Math.min(460, Math.max(176, startHeight - (pointer.clientY - startY)));
    };
    const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
}

function onKeyDown(event: KeyboardEvent) {
    if (document.querySelector('[role="dialog"]')) return;
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
    if (event.key === ' ') {
        if (tag === 'BUTTON' || tag === 'A') return;
        event.preventDefault();
        togglePlay();
    } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        seek(currentTime.value - (event.shiftKey ? 5 : 1));
    } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        seek(currentTime.value + (event.shiftKey ? 5 : 1));
    } else if (event.key === 'Home') {
        event.preventDefault();
        seek(0);
    } else if (event.key === 'End') {
        event.preventDefault();
        seek(props.chapter.duration);
    }
}

watch(playing, (isPlaying) => {
    cancelAnimationFrame(frame);
    if (!isPlaying) return;
    lastTick = performance.now();
    frame = requestAnimationFrame(tick);
});

watch(currentTime, (time) => {
    if (!playing.value || drag || zoom.value <= 1.01) return;
    const span = viewSpan();
    const pad = span * 0.08;
    if (time < viewStart.value + pad || time > viewStart.value + span - pad) {
        const max = Math.max(0, props.chapter.duration - span);
        viewStart.value = Math.min(Math.max(0, time - span * 0.18), max);
    }
});

watch(loop, (isLooping) => {
    if (!isLooping || !selection.value) return;
    if (currentTime.value < selection.value.start || currentTime.value > selection.value.end) {
        currentTime.value = selection.value.start;
    }
});

watch(() => props.chapter.peaks, () => {
    playing.value = false;
    media?.pause();
    currentTime.value = 0;
    if (media) media.currentTime = 0;
    selection.value = null;
    zoom.value = 1;
    viewStart.value = 0;
});

watch(() => props.src, (src) => {
    if (src) ensureMedia(src);
}, { immediate: true });

watch(speed, (value) => {
    if (media) media.playbackRate = value;
});

watch(() => props.chapter.gain, (gain) => {
    if (mediaGain) mediaGain.gain.value = gain;
});

watch([currentTime, zoom, viewStart, () => props.chapter.gain, () => props.chapter.duration, () => props.synthesizing, theme, selection], () => {
    draw();
});

onMounted(() => {
    observer = new ResizeObserver(() => draw());
    if (canvasRef.value?.parentElement) observer.observe(canvasRef.value.parentElement);
    window.addEventListener('keydown', onKeyDown);
    draw();
    document.fonts?.ready.then(() => draw());
});

onBeforeUnmount(() => {
    cancelAnimationFrame(frame);
    observer?.disconnect();
    window.removeEventListener('keydown', onKeyDown);
    media?.pause();
    media?.removeEventListener('ended', onMediaEnded);
    void audioContext?.close();
});
</script>

<style scoped>
.gain {
    width: 4.5rem;
    height: 2px;
    appearance: none;
    background: var(--border);
    border-radius: 999px;
}

.gain::-webkit-slider-thumb {
    appearance: none;
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: var(--foreground);
}

.gain::-moz-range-thumb {
    width: 10px;
    height: 10px;
    border: 0;
    border-radius: 999px;
    background: var(--foreground);
}

.load-bar {
    animation: load 0.9s ease-in-out infinite;
}

@keyframes load {
    0% { transform: translateX(-120%); }
    100% { transform: translateX(360%); }
}
</style>
