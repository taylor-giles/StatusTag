import type { PageServerLoad } from './$types';
import { getDevicesForUser, getImagesForUser, getActiveImageForDevice } from '$lib/server/db';
import { redirect, error } from '@sveltejs/kit';
import { getUserIdFromToken } from '$lib/server/auth';

export const load: PageServerLoad = async ({ cookies, depends }) => {
    depends('app:devices');
    const token = cookies.get('authToken');

    // Validate the token and get the user
    const userId = token ? getUserIdFromToken(token) : null;
    if (!userId) {
        throw redirect(302, '/login');
    }

    // Fetch device data for this user
    const devices = getDevicesForUser(userId)
    if (!devices) throw error(404, `There are no devices registered to this user.`);

    return { devices };
};
