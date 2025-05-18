import { json } from '@sveltejs/kit';
import db, { getDeviceForUser } from '$lib/server/db';
import { validateRequest } from '$lib/server/auth';

export async function GET({ request, params }: { request: Request; params: { deviceId: string } }) {
	const userId = validateRequest(request);
	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const device = getDeviceForUser(params.deviceId, userId);

	if (!device) {
		return json({ error: 'Device not found' }, { status: 404 });
	}

	return json(device);
}
