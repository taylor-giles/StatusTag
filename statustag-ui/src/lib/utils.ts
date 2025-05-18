import {Jimp} from 'jimp';
import { Buffer } from 'buffer';
import { parseGIF, decompressFrames } from 'gifuct-js';

/**
 * Converts a Buffer to a Base64 string.
 * @param buffer - The Buffer to convert.
 * @returns The Base64 string representation of the buffer.
 */
export function bufferToBase64(buffer: Buffer): string {
    return buffer.toString('base64');
}

/**
 * Crops and resizes an image to the specified dimensions, focusing on the center.
 * @param image - The input image as a URL string.
 * @param height - The desired height in pixels.
 * @param width - The desired width in pixels.
 * @returns The cropped and resized image in the same format as the input.
 */
export async function resizeImage(image: string, height: number, width: number): Promise<string> {
    const jimpImage = await Jimp.read(image);
    jimpImage.cover({w: width, h: height});
    return await jimpImage.getBase64("image/png");
}

export function isGif(base64String: string): boolean {
    const header = base64String.split(",")[1].substring(0, 30);
    return header.includes("R0lGODlh") || header.includes("R0lGODdj");
}

// Function to extract frames from a GIF using gifuct-js, maintaining frame stacking
async function extractGifFrames(base64Image: string, width: number, height: number): Promise<string[]> {
    const binaryData = Buffer.from(base64Image.split(",")[1], "base64");
    const gif = parseGIF(binaryData.buffer);
    const frames = decompressFrames(gif, true);

    console.log(frames[0].colorTable);

    // Persistent Canvas to maintain frame stacking
    const canvas = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(width, height) : document.createElement("canvas");
    const tempCanvas = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(width, height) : document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    const tempCtx = tempCanvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");
    if (!tempCtx) throw new Error("Failed to get temporary canvas context");

    const extractedFrames: string[] = [];

    let needsDisposal = false;

    for (const frame of frames) {
        if (needsDisposal) { // Clear frame (dispose to background)
            ctx.clearRect(0, 0, width, height);
            needsDisposal = false;
        }
        tempCanvas.width = frame.dims.width;
        tempCanvas.height = frame.dims.height;
        const imageData = tempCtx.createImageData(frame.dims.width, frame.dims.height);
        imageData.data.set(frame.patch);
        tempCtx.putImageData(imageData, 0, 0);
        ctx.drawImage(tempCanvas, frame.dims.left - width/2, frame.dims.top);
        needsDisposal = (frame.disposalType === 2);
        console.log("Delay:", frame.delay);

        if (typeof OffscreenCanvas !== "undefined" && canvas instanceof OffscreenCanvas) {
            const blob = await canvas.convertToBlob();
            extractedFrames.push(await blobToBase64(blob));
        } else {
            extractedFrames.push((canvas as HTMLCanvasElement).toDataURL("image/png"));
        }
    }

    return extractedFrames;
}
// Helper: Convert Blob to Base64
async function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
    });
}

/**
 * Calls the /api/utils/gifResize endpoint to resize a GIF on the server.
 * @param gifBase64 - The input GIF as a base64 string (with or without data URI prefix).
 * @param width - The desired width in pixels.
 * @param height - The desired height in pixels.
 * @returns The resized GIF as a base64 string (data URI).
 */
export async function resizeGif(gifBase64: string, width: number, height: number): Promise<string> {
    // Remove data URI prefix if present
    const base64 = gifBase64.startsWith('data:') ? gifBase64.split(',')[1] : gifBase64;
    const response = await fetch('/api/utils/gifResize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buffer: base64, width, height })
    });
    if (!response.ok) {
        throw new Error('Failed to resize GIF');
    }
    const data = await response.json();
    console.log(data);
    // Return as data URI
    return `data:image/gif;base64,${data.buffer}`;
}

/**
 * Prepares an image by resizing it to the specified dimensions.
 * @param image - The input image as a Base64 string.
 * @param height - The desired height in pixels.
 * @param width - The desired width in pixels.
 * @returns The resized image as a Base64 string.
 */
export async function prepareImage(image: string, height: number, width: number): Promise<string> {
    if (isGif(image)) {
        console.log("Detected GIF");
        // const frames = await extractGifFrames(image, width, height);
        return resizeGif(image, width, height)
        // return frames[5];
        // const resizedFrames = await Promise.all(frames.map(frame => resizeImage(frame, height, width)));
        // return await stitchImagesToGif(frames, width, height);
    } else {
        return await resizeImage(image, height, width);
    }
}