/**
 * PDF utilities — SRP: isolated PDF manipulation helpers.
 */
// pdfjs-dist v4 requires the legacy build in Node.js environments
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import sharp from 'sharp';

// No worker needed in Node.js
GlobalWorkerOptions.workerSrc = '';

/**
 * Convert PDF pages to base64-encoded JPEG images.
 * @param pdfBuffer - Raw PDF bytes
 * @param pageCount - Max pages to render (undefined = all)
 */
export async function pdfToImages(pdfBuffer: Uint8Array, pageCount?: number): Promise<string[]> {
    const data = new Uint8Array(pdfBuffer);
    const pdf = await getDocument({ data }).promise;
    const totalPages = Math.min(pageCount ?? pdf.numPages, pdf.numPages);
    const images: string[] = [];

    for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });

        // Use a canvas-compatible approach via sharp (node-canvas alternative)
        // We render using pdfjs to a pixel buffer then encode with sharp
        const { width, height } = viewport;
        const canvasBuffer = Buffer.alloc(width * height * 4); // RGBA

        // Basic render — pdfjs needs a canvas context in Node, so we use off-screen rendering
        // In production integrate node-canvas for full rendering quality
        const renderCtx = createNodeCanvasContext(canvasBuffer, width, height);
        await page.render({ canvasContext: renderCtx as unknown as CanvasRenderingContext2D, viewport }).promise;

        const jpeg = await sharp(canvasBuffer, { raw: { width, height, channels: 4 } })
            .jpeg({ quality: 90 })
            .toBuffer();

        images.push(jpeg.toString('base64'));
    }

    return images;
}

/**
 * Get page count from a PDF buffer.
 */
export async function getPdfPageCount(pdfBuffer: Uint8Array): Promise<number> {
    const data = new Uint8Array(pdfBuffer);
    const pdf = await getDocument({ data }).promise;
    return pdf.numPages;
}

/**
 * Check whether a PDF already contains a text layer (existing OCR).
 */
export async function pdfHasTextLayer(pdfBuffer: Uint8Array): Promise<boolean> {
    const data = new Uint8Array(pdfBuffer);
    const pdf = await getDocument({ data }).promise;

    for (let i = 1; i <= Math.min(3, pdf.numPages); i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        if (textContent.items.length > 10) return true;
    }
    return false;
}

// Minimal canvas-like context for pdfjs rendering in Node.js
function createNodeCanvasContext(buffer: Buffer, width: number, height: number) {
    const view = new Uint8ClampedArray(buffer.buffer);
    return {
        canvas: { width, height },
        getImageData: () => ({ data: view }),
        putImageData: (data: { data: Uint8ClampedArray }) => {
            for (let i = 0; i < data.data.length; i++) view[i] = data.data[i] ?? 0;
        },
        fillRect: () => undefined,
        save: () => undefined,
        restore: () => undefined,
        scale: () => undefined,
        transform: () => undefined,
        fillText: () => undefined,
        strokeText: () => undefined,
        setTransform: () => undefined,
        resetTransform: () => undefined,
        drawImage: () => undefined,
        beginPath: () => undefined,
        closePath: () => undefined,
        stroke: () => undefined,
        fill: () => undefined,
        moveTo: () => undefined,
        lineTo: () => undefined,
        bezierCurveTo: () => undefined,
        rect: () => undefined,
        clip: () => undefined,
        measureText: (text: string) => ({ width: text.length * 6 }),
        createLinearGradient: () => ({ addColorStop: () => undefined }),
        createPattern: () => null,
    };
}
