import { json } from '@sveltejs/kit';
import db from '$lib/server/db';
import { validateRequest } from '$lib/server/auth';
import type { Image } from '$lib/types';

export async function GET({ request, params }: { request: Request; params: { imageId: string } }) {
	const userId = validateRequest(request);
	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const image = db.prepare('SELECT * FROM images WHERE id = ? AND user_id = ?').get(params.imageId, userId) as Image;
	if (!image) {
		return json({ error: 'Image not found or not authorized' }, { status: 404 });
	}

	return json({
		...image,
		image_data: image.image_data.toString('base64')
	});
}
