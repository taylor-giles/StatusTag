import type { Device } from '$lib/types';
import db from '$lib/server/db';
import { json } from '@sveltejs/kit';

export async function GET({ params }: { params: { userId: string } }) {
	const devices: Device[] = db.prepare(`
		SELECT d.* 
		FROM devices d
		JOIN user_devices ud ON d.id = ud.device_id
		WHERE ud.user_id = ?
	`).all(params.userId) as Device[];
	console.log("Devices: ", devices);
	return json(devices);
}

export async function POST({ request }: { request: Request }) {
	const { userId, deviceId } = await request.json();
	console.log("POST request to add device: ", { userId, deviceId });

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