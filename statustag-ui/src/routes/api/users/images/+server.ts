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
	return json(images);
}