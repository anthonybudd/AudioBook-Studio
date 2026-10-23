// AudioGenerator.ts

// This class uses the worker to generate audio from a book's text content.
// It chunks the text, generates audio for each chunk, then combines them into one audio blob.

type GenerateOptions = {
    text: string;
    voiceID: string;
    chunkSize?: number; // Number of characters per chunk
    onProgress?: (progress: { current: number; total: number; }) => void;
};

type SynthesizeResponse = {
    status?: string;
    audio?: ArrayBuffer;
    message?: string;
    error?: string;
    requestId?: number;
};

export class AudioGenerator {
    private worker: Worker;
    private requestId = 0;

    constructor() {
        this.worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    }

    async generate({ text, voiceID, chunkSize = 400, onProgress }: GenerateOptions): Promise<Blob> {
        const chunks = this.chunkText(text, chunkSize);
        const audioBuffers: ArrayBuffer[] = [];

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            if (!chunk) continue;

            const arrayBuffer = await this.synthesizeChunk(chunk, voiceID);
            audioBuffers.push(arrayBuffer);

            if (onProgress) {
                onProgress({ current: i + 1, total: chunks.length });
            }
        }

        return this.combine(audioBuffers);
    }

    async saveToOPFS(blob: Blob, projectID: string, chapterID: string): Promise<void> {
        try {
            if ('storage' in navigator && 'getDirectory' in (navigator.storage as any)) {
                // @ts-ignore: OPFS types are not yet in TS
                const root = await (navigator.storage as any).getDirectory();
                const projectsDir = await root.getDirectoryHandle('audiobook_projects', { create: true });
                const projectDir = await projectsDir.getDirectoryHandle(projectID, { create: true });
                const chaptersDir = await projectDir.getDirectoryHandle('chapters', { create: true });
                const fileHandle = await chaptersDir.getFileHandle(`${chapterID}.webm`, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
            }
        } catch (e) {
            console.warn('OPFS save failed', e);
        }
    }

    async loadFromOPFS(projectID: string, chapterID: string): Promise<Blob | undefined> {
        try {
            if ('storage' in navigator && 'getDirectory' in (navigator.storage as any)) {
                // @ts-ignore: OPFS types are not yet in TS
                const root = await (navigator.storage as any).getDirectory();
                const projectsDir = await root.getDirectoryHandle('audiobook_projects', { create: true });
                const projectDir = await projectsDir.getDirectoryHandle(projectID, { create: true });
                const chaptersDir = await projectDir.getDirectoryHandle('chapters', { create: true });
                const fileHandle = await chaptersDir.getFileHandle(`${chapterID}.webm`, { create: true });
                const blob = await fileHandle.getFile();
                return blob;
            }
        } catch (e) {
            console.warn('OPFS load failed', e);
        }
    }

    close() {
        this.worker.terminate();
    }

    private chunkText(text: string, chunkSize: number): string[] {
        const chunks: string[] = [];
        let current = '';
        let words = text.split(/\s+/);
        if (!words) return chunks;
        if (words.length === 0) return chunks;

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const next = current.length ? current + " " + word : word;
            if (next && next.length > chunkSize) {
                if (current.length > 0) {
                    chunks.push(current);
                    current = word ?? '';
                } else {
                    chunks.push(word ?? '');
                    current = '';
                }
            } else {
                current = next ?? '';
            }
        }
        if (current.length > 0) {
            chunks.push(current);
        }
        return chunks;
    }

    private synthesizeChunk(chunk: string, voiceID: string): Promise<ArrayBuffer> {
        const requestId = ++this.requestId;
        return new Promise((resolve, reject) => {
            const finish = () => {
                this.worker.removeEventListener('message', handleMessage);
                this.worker.removeEventListener('error', handleError);
            };
            const handleMessage = (event: MessageEvent<SynthesizeResponse>) => {
                const data = event.data;
                if (!data || data.requestId !== requestId) return;
                finish();
                if (data.status === 'complete' && data.audio) {
                    resolve(data.audio);
                    return;
                }
                reject(new Error(data.message || data.error || 'Synthesis failed'));
            };
            const handleError = (event: ErrorEvent) => {
                finish();
                reject(event.error || new Error(event.message));
            };

            this.worker.addEventListener('message', handleMessage);
            this.worker.addEventListener('error', handleError);

            this.worker.postMessage({
                action: 'synthesize',
                text: chunk,
                voiceID,
                requestId,
            });
        });
    }

    private async combine(buffers: ArrayBuffer[]): Promise<Blob> {
        if (buffers.length === 0) throw new Error('Nothing to synthesize');
        const only = buffers[0];
        if (buffers.length === 1 && only) {
            return new Blob([only], { type: audioMime(only) });
        }
        if (buffers.every((buffer) => audioMime(buffer) === 'audio/mpeg')) {
            return new Blob(buffers, { type: 'audio/mpeg' });
        }

        const context = new AudioContext();
        try {
            const decoded: AudioBuffer[] = [];
            for (const buffer of buffers) {
                decoded.push(await context.decodeAudioData(buffer.slice(0)));
            }
            const first = decoded[0];
            if (!first) throw new Error('Nothing to synthesize');
            const channels = first.numberOfChannels;
            const length = decoded.reduce((total, item) => total + item.length, 0);
            const output = context.createBuffer(channels, length, first.sampleRate);
            let offset = 0;
            for (const item of decoded) {
                for (let channel = 0; channel < channels; channel += 1) {
                    const source = item.getChannelData(Math.min(channel, item.numberOfChannels - 1));
                    output.getChannelData(channel).set(source, offset);
                }
                offset += item.length;
            }
            return encodeWav(output);
        } finally {
            await context.close();
        }
    }
}

function audioMime(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength));
    if (bytes.length >= 4 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
        return 'audio/wav';
    }
    if (bytes.length >= 3 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
        return 'audio/mpeg';
    }
    if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1]! & 0xe0) === 0xe0) {
        return 'audio/mpeg';
    }
    return 'audio/wav';
}

function encodeWav(audio: AudioBuffer): Blob {
    const channels = audio.numberOfChannels;
    const sampleRate = audio.sampleRate;
    const length = audio.length;
    const blockAlign = channels * 2;
    const dataLength = length * blockAlign;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    const channelData = Array.from({ length: channels }, (_, index) => audio.getChannelData(index));
    let offset = 44;
    for (let index = 0; index < length; index += 1) {
        for (let channel = 0; channel < channels; channel += 1) {
            const sample = Math.max(-1, Math.min(1, channelData[channel]?.[index] ?? 0));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
            offset += 2;
        }
    }

    return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, value: string) {
    for (let index = 0; index < value.length; index += 1) {
        view.setUint8(offset + index, value.charCodeAt(index));
    }
}
