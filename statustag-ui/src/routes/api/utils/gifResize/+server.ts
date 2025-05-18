import { json } from '@sveltejs/kit';
import { coverGif } from '$lib/server/serverUtils';

export async function POST({ request }) {
    try {
        const { buffer, width, height } = await request.json();
        if (!buffer || !width || !height) {
            return json({ error: 'Missing required fields' }, { status: 400 });
        }
        // Convert base64 string to Buffer if needed
        const gifBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer, 'base64');
        const resizedBuffer = await coverGif(gifBuffer, width, height);
        
        return json({ buffer: resizedBuffer.toString('base64') });
    } catch (error) {
        console.error('Error resizing GIF:', error);
        return json({ error: 'Failed to resize GIF' }, { status: 500 });
    }
}
