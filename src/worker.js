import { KokoroTTS } from "kokoro-js";

async function detectWebGPU() {
    try {
        const adapter = await navigator.gpu.requestAdapter();
        return !!adapter;
    } catch {
        return false;
    }
}

const device = (await detectWebGPU()) ? "webgpu" : "wasm";
self.postMessage({ status: "device", device });

const queue = [];
let tts = null;
let modelError = null;
let modelSettled = false;
let processing = false;

self.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.action !== "synthesize") return;
    queue.push(data);
    processQueue();
});

async function processQueue() {
    if (processing || !modelSettled) return;
    processing = true;
    try {
        while (queue.length > 0) {
            const job = queue.shift();
            if (!job) continue;

            if (!tts) {
                self.postMessage({
                    status: "error",
                    message: modelError || "The speech model is not available.",
                    requestId: job.requestId,
                });
                continue;
            }

            try {
                const audio = await tts.generate(job.text, { voice: job.voiceID });
                const buffer = await audio.toBlob().arrayBuffer();
                self.postMessage({
                    status: "complete",
                    audio: buffer,
                    requestId: job.requestId,
                }, [buffer]);
            } catch (error) {
                self.postMessage({
                    status: "error",
                    message: error instanceof Error ? error.message : String(error),
                    requestId: job.requestId,
                });
            }
        }
    } finally {
        processing = false;
        if (queue.length > 0) processQueue();
    }
}

const modelID = "onnx-community/Kokoro-82M-v1.0-ONNX";
try {
    tts = await KokoroTTS.from_pretrained(modelID, {
        dtype: device === "wasm" ? "q8" : "fp32",
        device,
    });
    self.postMessage({ status: "ready", voices: tts.voices, device });
} catch (error) {
    modelError = error instanceof Error ? error.message : String(error);
    self.postMessage({ status: "error", message: modelError });
} finally {
    modelSettled = true;
    processQueue();
}
