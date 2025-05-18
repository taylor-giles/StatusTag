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

// Converts a color table (array of [r,g,b] arrays) to RGB565 format
export function convertColorTable(colorTable: [number, number, number][]): number[] {
    // Each color is [r, g, b] (0-255)
    // RGB565: 5 bits red, 6 bits green, 5 bits blue
    return colorTable.map(([r, g, b]) => {
        const r5 = (r >> 3) & 0x1F;
        const g6 = (g >> 2) & 0x3F;
        const b5 = (b >> 3) & 0x1F;
        // Pack into 16 bits: rrrrrggggggbbbbb
        return (r5 << 11) | (g6 << 5) | b5;
    });
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
    const frames = decompressFrames(gif, true);

    const gct = convertColorTable(gif.gct)
    const patches: (Uint16Array | number)[] = [];

    for (const frame of frames) {
        let colorTable = frame.colorTable == gif.gct ? gct : convertColorTable(frame.colorTable);
        let rowsPerBatch = Math.floor(batchSize / (frame.dims.width * 2));
        let remainingRows = frame.dims.height;
        while (remainingRows > 0) {
            const rows = Math.min(rowsPerBatch, remainingRows);
            const patchData = new Uint16Array(frame.dims.width * rows + 4);
            patchData[0] = frame.dims.left;
            patchData[1] = frame.dims.top + (frame.dims.height - remainingRows);
            patchData[2] = frame.dims.width;
            patchData[3] = rows;
            for (let i = 0; i < frame.dims.width * rows; i++) {
                patchData[i + 4] = colorTable[frame.patch[i]];
            }
            patches.push(patchData);
            remainingRows -= rows;
        }
        patches.push(frame.delay);
    }
    return patches;
}

/**
 * Breaks an image into patches with regulated size
 * @param imageBuffer - The input image as a Buffer.
 * @param batchSize - The maximum size of each batch, in bytes.
 * @returns A list of patches, each represented as a Uint16Array, separated by the delay (time to show that patch)
 */
export async function getImagePatches(imageBuffer: Buffer, batchSize: number = 2500): Promise<(Uint16Array | number)[]> {
    console.log("Calculating image patches");
    const imageData = new Uint16Array(imageBuffer.length / 2 + 4);
    const patches: (Uint16Array | number)[] = [];
    let dims = await getImageDimensions(imageBuffer);
    let rowsPerBatch = Math.floor(batchSize / (dims.width * 2));
    let remainingRows = dims.height;
    while (remainingRows > 0) {
        const rows = Math.min(rowsPerBatch, remainingRows);
        const patchData = new Uint16Array(dims.width * rows + 4);
        patchData[0] = 0;
        patchData[1] = (dims.height - remainingRows);
        patchData[2] = dims.width;
        patchData[3] = rows;
        for (let i = 0; i < dims.width * rows; i++) {
            patchData[i + 4] = imageData[i];
        }
        patches.push(patchData);
        remainingRows -= rows;
    }
    patches.push(60000);
    return patches;
}