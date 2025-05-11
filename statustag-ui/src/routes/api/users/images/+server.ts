import type { Image } from '$lib/types';
import db from '$lib/server/db';
import { json } from '@sveltejs/kit';
import { validateRequest } from '$lib/server/auth';

export async function GET({ request }: { request: Request }) {
	const userId = validateRequest(request);
	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const images: Image[] = db.prepare('SELECT * FROM images WHERE user_id = ?').all(userId) as Image[];
	const encodedImages = images.map(image => ({
		...image,
		image_data: image.image_data.toString('base64')
	}));

	return json(encodedImages);
}

export async function POST({ request }: { request: Request }) {
	const userId = validateRequest(request);
	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const formData = await request.formData();
	const imageFile = formData.get('image') as File;
	if (!imageFile) {
		return json({ error: 'No image file provided' }, { status: 400 });
	}

	const imageBuffer = await imageFile.arrayBuffer();
	db.prepare('INSERT INTO images (user_id, image_data) VALUES (?, ?)').run(userId, Buffer.from(imageBuffer));

	return json({ success: true });
}