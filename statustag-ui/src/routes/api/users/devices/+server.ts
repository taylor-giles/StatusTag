import { json } from '@sveltejs/kit';
import { validateRequest } from '$lib/server/auth';
import { getDevicesForUser, deviceExists, insertDevice, registerDevice } from '$lib/server/db';

export async function GET({ request }: { request: Request }) {
	const userId = validateRequest(request);
	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const devices = getDevicesForUser(userId);
	return json(devices);
}

export async function POST({ request }: { request: Request }) {
	const userId = validateRequest(request);
	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { deviceId, screen_length, screen_height } = await request.json();

	insertDevice(deviceId, screen_length, screen_height);

	registerDevice(userId, deviceId);
	return json({ success: true });
}