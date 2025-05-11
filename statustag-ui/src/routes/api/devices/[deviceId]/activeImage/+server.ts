import { json } from '@sveltejs/kit';
import db from '$lib/server/db';
import { validateRequest } from '$lib/server/auth';

export async function POST({ request, params }: { request: Request; params: { deviceId: string } }) {
	const userId = validateRequest(request);
	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { imageId } = await request.json();

	// Check if the image belongs to the user
	const image = db.prepare('SELECT 1 FROM images WHERE id = ? AND user_id = ?').get(imageId, userId);
	if (!image) {
		return json({ error: 'Image not found' }, { status: 404 });
	}

	// Update active device if the device is registered to the user
	const device = db.prepare(
		'UPDATE devices SET active_image = ? WHERE id = ? AND id IN (SELECT device_id FROM user_devices WHERE user_id = ?)'
	).run(imageId, params.deviceId, userId);

	if (device.changes === 0) {
		return json({ error: 'Device not found' }, { status: 404 });
	}

	return json({ success: true });
}
