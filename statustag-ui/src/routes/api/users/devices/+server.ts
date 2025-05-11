import { json } from '@sveltejs/kit';
import db from '$lib/server/db';
import { validateRequest } from '$lib/server/auth';

export async function GET({ request }: { request: Request }) {
	const userId = validateRequest(request);
	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const devices = db.prepare(`
		SELECT d.* 
		FROM devices d
		JOIN user_devices ud ON d.id = ud.device_id
		WHERE ud.user_id = ?
	`).all(userId);

	return json(devices);
}

export async function POST({ request }: { request: Request }) {
	const userId = validateRequest(request);
	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { deviceId } = await request.json();

	// Check if the device already exists
	const deviceExists = db.prepare('SELECT 1 FROM devices WHERE id = ?').get(deviceId);
	if (!deviceExists) {
		// Insert the new device
		db.prepare('INSERT INTO devices (id, active_image) VALUES (?, NULL)').run(deviceId);
	}

	// Associate the device with the user
	db.prepare('INSERT OR IGNORE INTO user_devices (user_id, device_id) VALUES (?, ?)').run(userId, deviceId);

	return json({ success: true });
}