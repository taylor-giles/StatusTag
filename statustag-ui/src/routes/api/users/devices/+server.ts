import { json } from '@sveltejs/kit';
import { validateRequest } from '$lib/server/auth';
import { getDevicesForUser, registerDevice } from '$lib/server/db';

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

	const { deviceId } = await request.json();

	if(registerDevice(userId, deviceId) !== null){
		return json({ success: true }); 
	}
	return json({ error: `Unable to find device ${deviceId}`}, { status: 400 });
	
}