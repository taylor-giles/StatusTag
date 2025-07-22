import type { Device } from "./types";

export async function fetchDeviceData(deviceId: string) {
    console.log("Fetching device data");
    const response = await fetch(`/api/devices/${deviceId}`);
    if (response.ok) {
        return response.json();
    } else {
        alert("Failed to fetch device data");
    }
}

export async function fetchUserImages() {
    console.log("Fetching user images");
    const response = await fetch("/api/users/images");
    if (response.ok) {
        return response.json();
    } else {
        alert("Failed to fetch user images");
    }
}

export async function setActiveImage(deviceId: string, imageId: number) {
    console.log("Set active image to", imageId);
    const response = await fetch(`/api/devices/${deviceId}/activeImage`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ imageId }),
    });
    if (!response.ok) {
        alert("Failed to set active image");
    }
    return response.ok;
}

export async function fetchActiveImage(deviceData: Device) {
    let activeImageId = deviceData.active_image;
    if (activeImageId) {
        const imageResponse = await fetch(
            `/api/users/images/${activeImageId}`
        );
        if (imageResponse.ok) {
            const imageData = await imageResponse.json();
            return `data:image/unknown;base64,${imageData.image_data}`;
        } else {
            alert(`Failed to fetch image data for device: ${deviceData.id}`);
        }
    }
    return null;
}

export async function uploadImage(file: File) {
    const formData = new FormData();
    formData.append("image", file);
    const response = await fetch("/api/users/images", {
        method: "POST",
        body: formData,
    });
    if (!response.ok) {
        alert("Failed to upload image");
    }
    return response.ok;
}