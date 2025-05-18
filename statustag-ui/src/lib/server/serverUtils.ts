import gifResize from '@gumlet/gif-resize';
import { parseGIF } from 'gifuct-js';

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
    let expandGif = gifResize({width: Math.max(width, height), height: Math.max(width, height), stretch: true});
    let doCover = async (gifBuffer: Buffer) => {
        let dims = getGifDimensions(gifBuffer);
        let cropDims = [Math.round(Math.max(0, (dims.width - width)/2)), Math.round(Math.max(0, (dims.height - height)/2)), width, height];
        console.log(dims, cropDims)
        return gifResize({crop: cropDims})(gifBuffer);
    }
    return await expandGif(gifBuffer).then(doCover);
}
