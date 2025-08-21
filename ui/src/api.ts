import axios, { type AxiosRequestConfig } from 'axios';
import type { Device } from "../../shared/types";

type APIResponse = { data: any, ok: boolean }

const API_ADDRESS = import.meta.env.PUBLIC_API_ADDRESS ?? "http://localhost:5000/api";
const API = axios.create({
    baseURL: API_ADDRESS,
    timeout: 10000
});

async function POST(endpoint: `/${string}`, body?: any, config?: AxiosRequestConfig<any> | undefined): Promise<APIResponse> {
    return (await API.post(endpoint, body, config)
        .then((res) => ({
            data: res.data,
            ok: true
        })).catch((error) => ({
            data: error.response?.data?.error ?? error.message ?? "POST request failed.",
            ok: false
        }))
    );
}

async function GET(endpoint: `/${string}`, config?: AxiosRequestConfig<any> | undefined) {
    return (await API.get(endpoint, config)
        .then((res) => ({
            data: res.data,
            ok: true
        })).catch((error) => ({
            data: error.response?.data?.error ?? error.message ?? "POST request failed.",
            ok: false
        }))
    );
}

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

export async function login(username: string, password: string): Promise<APIResponse> {
    return POST("/login", { username, password });
}

export async function signup(username: string, password: string): Promise<APIResponse> {
    return POST("/signup", { username, password });
}

export async function getDevices(): Promise<Device[]> {
    return (await GET("/devices")).data as Device[];
}

