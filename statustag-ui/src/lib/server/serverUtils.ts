import gifResize from '@gumlet/gif-resize';
import { decompressFrames, parseGIF } from 'gifuct-js';
import { Jimp } from 'jimp';

/**
 * Returns the width and height of a GIF buffer.
 * @param gifBuffer - The input GIF as a Buffer.
 * @returns An object with width and height properties.
 */
export function getGifDimensions(gifBuffer: Buffer): { width: number; height: number } {
    // Convert Buffer to ArrayBuffer for parseGIF (force ArrayBuffer type)
    const arrayBuffer = gifBuffer.buffer.slice(gifBuffer.byteOffset, gifBuffer.byteOffset + gifBuffer.byteLength);
    const ab = arrayBuffer instanceof ArrayBuffer ? arrayBuffer : new Uint8Array(arrayBuffer).buffer;
    const gif = parseGIF(ab as ArrayBuffer);
    return {
        width: gif.lsd.width,
        height: gif.lsd.height
    };
}

/**
 * Returns the width and height of an image buffer (PNG, JPEG, etc).
 * @param imageBuffer - The input image as a Buffer.
 * @returns An object with width and height properties.
 */
export async function getImageDimensions(imageBuffer: Buffer): Promise<{ width: number; height: number }> {
    const image = await Jimp.read(imageBuffer);
    return {
        width: image.bitmap.width,
        height: image.bitmap.height
    };
}

/**
 * "Contains" a GIF to the specified width and height using @gumlet/gif-resize.
 * @param gifBuffer - The input GIF as a Buffer.
 * @param width - The desired width in pixels.
 * @param height - The desired height in pixels.
 * @returns A Promise that resolves to a Buffer containing the resized GIF.
 */
export async function containGif(gifBuffer: Buffer, width: number, height: number): Promise<Buffer> {
    let resizedGif = await gifResize({
        width: width <= height ? width : undefined,
        height: height <= width ? height : undefined,
        stretch: false
    })(gifBuffer);

    return resizedGif;
};


/**
 * "Covers" a GIF to the specified width and height using @gumlet/gif-resize.
 * @param gifBuffer - The input GIF as a Buffer.
 * @param width - The desired width in pixels.
 * @param height - The desired height in pixels.
 * @returns A Promise that resolves to a Buffer containing the resized GIF.
 */
export async function coverGif(gifBuffer: Buffer, width: number, height: number): Promise<Buffer> {
    let expandGif = async (gifBuffer: Buffer) => {
        let dims = getGifDimensions(gifBuffer);
        return gifResize({
            width: dims.width <= dims.height ? width : undefined,
            height: dims.height <= dims.width ? height : undefined,
            stretch: true
        })(gifBuffer);
    }
    let doCover = async (gifBuffer: Buffer) => {
        let dims = getGifDimensions(gifBuffer);
        let cropDims = [Math.round(Math.max(0, (dims.width - width) / 2)), Math.round(Math.max(0, (dims.height - height) / 2)), width, height];
        return gifResize({ crop: cropDims })(gifBuffer);
    }
    return await expandGif(gifBuffer).then(doCover);
}

/**
 * Crops and resizes an image to the specified dimensions, focusing on the center.
 * @param image - The input image buffer.
 * @param height - The desired height in pixels.
 * @param width - The desired width in pixels.
 * @returns The cropped and resized image as a buffer.
 */
export async function coverImage(image: Buffer, width: number, height: number): Promise<Buffer> {
    const jimpImage = await Jimp.read(image);
    jimpImage.cover({w: width, h: height});
    return jimpImage.getBuffer("image/png");
}

/**
 * Breaks a gif into patches with regulated size
 * @param gifBuffer - The input gif as a Buffer.
 * @param batchSize - The maximum size of each batch, in bytes.
 * @returns A list of patches, each represented as a Uint16Array, separated by the delay (time to show that patch)
 */
export async function getGifPatches(gifBuffer: Buffer, batchSize: number = 2500): Promise<(Uint16Array | number)[]> {
    console.log("Calculating GIF patches");
    const arrayBuffer = gifBuffer.buffer.slice(gifBuffer.byteOffset, gifBuffer.byteOffset + gifBuffer.byteLength);
    const ab = arrayBuffer instanceof ArrayBuffer ? arrayBuffer : new Uint8Array(arrayBuffer).buffer;
    const gif = parseGIF(ab as ArrayBuffer);
    const frames = decompressFrames(gif, false); // Use false to get color indexes, not RGBA

    const gct = convertColorTable(gif.gct);
    const patches: (Uint16Array | number)[] = [];

    for (const frame of frames) {
        // Use the correct color table for this frame
        let colorTable = frame.colorTable !== gif.gct ? convertColorTable(frame.colorTable) : gct;
        let rowsPerBatch = Math.floor(batchSize / (frame.dims.width * 2));
        let remainingRows = frame.dims.height;
        let patchIdx = 0;
        patches.push(frame.delay);
        while (remainingRows > 0) {
            const rows = Math.min(rowsPerBatch, remainingRows);
            const patchData = new Uint16Array(frame.dims.width * rows + 4);
            patchData[0] = frame.dims.left;
            patchData[1] = frame.dims.top + (frame.dims.height - remainingRows);
            patchData[2] = frame.dims.width;
            patchData[3] = rows;
            for (let i = 0; i < frame.dims.width * rows; i++) {
                // Use the color index from the frame's pixels array
                const colorIdx = frame.pixels[patchIdx++];
                patchData[i + 4] = colorIdx === frame.transparentIndex ? 0xFFFE : colorTable[colorIdx];
            }
            patches.push(patchData);
            remainingRows -= rows;
        }
    }
    return patches;
}

/**
 * Breaks an image into patches with regulated size
 * @param imageBuffer - The input image as a Buffer.
 * @param batchSize - The maximum size of each batch, in bytes.
 * @returns A list of patches, each represented as a Uint16Array, separated by the delay (time to show that patch)
 */
export async function getImagePatches(imageBuffer: Buffer, batchSize: number = 2500): Promise<Uint16Array[]> {
    const image = await Jimp.read(imageBuffer);
    const { width, height, data } = image.bitmap; // data is a Uint8Array of RGBA values
    const patches: Uint16Array[] = [];
    let rowsPerBatch = Math.max(1, Math.floor((batchSize-8) / (width * 2)));
    let remainingRows = height;
    while (remainingRows > 0) {
        const rows = Math.min(rowsPerBatch, remainingRows);
        const patchData = new Uint16Array(width * rows + 4);
        patchData[0] = 0;
        patchData[1] = (height - remainingRows);
        patchData[2] = width;
        patchData[3] = rows;
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < width; col++) {
                const idx = ((height - remainingRows + row) * width + col) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                patchData[row * width + col + 4] = rgbToRgb565(r, g, b);
            }
        }
        patches.push(patchData);
        remainingRows -= rows;
    }
    return patches;
}

// Returns true iff the given buffer represents a GIF
export function isGif(buffer: Buffer): boolean {
    const header = buffer.toString('base64').substring(0, 30);
    return header.includes("R0lGODlh") || header.includes("R0lGODdj");
}

// Converts a color table (array of [r,g,b] arrays) to RGB565 format
export function convertColorTable(colorTable: [number, number, number][]): number[] {
    return colorTable.map(([r, g, b]) => rgbToRgb565(r, g, b));
}

export function rgbToRgb565(r: number, g: number, b: number): number {
    const color = ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3); // RGB565
    let result = ((color & 0xFF) << 8) | (color >> 8); // Swap bytes

    // 0xFFFE is used as a transparency indicator - replace it with something close
    if (result == 0xFFFE) {
        result = 0xFFFF;
    }
    return result;
}
