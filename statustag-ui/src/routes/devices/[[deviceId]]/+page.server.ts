import type { PageServerLoad } from './$types';
import { getDeviceForUser, getImagesForUser, getActiveImageForDevice } from '$lib/server/db';
import { redirect, error } from '@sveltejs/kit';
import { getUserIdFromToken } from '$lib/server/auth';
import type { DisplayImage, Image } from '$lib/types';

export const load: PageServerLoad = async ({ params, cookies, depends }) => {
    depends('app:deviceData');
    depends('app:images');

    // Authentication
    const deviceId = params.deviceId;
    const token = cookies.get('authToken');
    const userId = token ? getUserIdFromToken(token) : null;
    if (!userId) {
        throw redirect(302, '/login');
    }

    // Fetch all images for this user
    const userImages = getImagesForUser(userId) as Image[];
    const images: DisplayImage[] = userImages.map(image => ({...image, image_data: `data:image/unknown;base64,${image.image_data.toString('base64')}` }));

    if(!deviceId) {
        return {
            deviceData: undefined,
            images,
            activeImage: undefined
        }
    }

    // Fetch device data for this user
    const deviceData = getDeviceForUser(deviceId, userId);
    if (!deviceData) throw error(404, `There is no device with ID ${deviceId} registered to this user.`);

    // Fetch the active image for this device (if any)
    const activeImageObj = getActiveImageForDevice(deviceId);
    let activeImage: string | null = null;
    if (activeImageObj && activeImageObj.data) {
        activeImage = `data:image/unknown;base64,${activeImageObj.data.toString('base64')}`;
    }

    return {
        deviceData,
        images,
        activeImage
    };
};
