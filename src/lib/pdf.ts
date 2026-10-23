import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerUrl;

export function isPdf(file: File) {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

export async function extractPdfText(file: File) {
    const data = new Uint8Array(await file.arrayBuffer());
    const loadingTask = getDocument({ data });
    const pages: string[] = [];

    try {
        const pdf = await loadingTask.promise;
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
            const page = await pdf.getPage(pageNumber);
            const content = await page.getTextContent();
            let pageText = '';

            for (const item of content.items) {
                if (!('str' in item)) continue;
                pageText += item.str;
                pageText += item.hasEOL ? '\n' : ' ';
            }

            const trimmed = pageText
                .split('\n')
                .map((line) => line.trim())
                .join('\n')
                .trim();
            if (trimmed) pages.push(trimmed);
        }
    } finally {
        await loadingTask.destroy();
    }

    return pages.join('\n\n');
}
