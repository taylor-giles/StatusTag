/**
 * Converts a Buffer to a Base64 string.
 * @param buffer - The Buffer to convert.
 * @returns The Base64 string representation of the buffer.
 */
export function bufferToBase64(buffer: Buffer): string {
    return buffer.toString('base64');
}
