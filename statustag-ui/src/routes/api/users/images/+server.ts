import type { Image } from '$lib/types';
import db from '$lib/server/db';
import { json } from '@sveltejs/kit';

export async function GET({ params }: { params: { userId: string } }) {
	const images: Image[] = db.prepare('SELECT * FROM images WHERE user_id = ?').all(params.userId) as Image[];
	return json(images);
}