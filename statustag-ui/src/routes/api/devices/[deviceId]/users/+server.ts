import { json } from '@sveltejs/kit';
import db from '$lib/server/db';
import { validateRequest } from '$lib/server/auth';

export async function GET({ request, params }: { request: Request; params: { deviceId: string } }) {
	const userId = validateRequest(request);
	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Check if the device is registered to the user
	const device = db.prepare(
		'SELECT 1 FROM devices WHERE id = ? AND id IN (SELECT device_id FROM user_devices WHERE user_id = ?)'
	).get(params.deviceId, userId);

	if (!device) {
		return json({ error: 'Device not found' }, { status: 404 });
	}

	// Get the list of users who have the device registered
	const users = db.prepare(
		'SELECT u.username FROM users u JOIN user_devices ud ON u.username = ud.user_id WHERE ud.device_id = ?'
	).all(params.deviceId);

	return json(users);
}
