import axios, { type AxiosRequestConfig } from 'axios';
import type { Device, DisplayDevice, DisplayImage } from "../../shared/types";

type APIResponse = { data: any, ok: boolean }

const API_ADDRESS = import.meta.env.PUBLIC_API_ADDRESS ?? "http://localhost:5000/api";
const API = axios.create({
    baseURL: API_ADDRESS,
    timeout: 10000,
    withCredentials: true
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

async function GET(endpoint: `/${string}`, config?: AxiosRequestConfig<any> | undefined): Promise<APIResponse> {
    return (await API.get(endpoint, config)
        .then((res) => ({
            data: res.data,
            ok: true
        })).catch((error) => ({
            data: error.response?.data?.error ?? error.message ?? "GET request failed.",
            ok: false
        }))
    );
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

export async function getImages(): Promise<DisplayImage[]> {
    return (await GET("/images")).data as DisplayImage[];
}

export async function getDevice(deviceId: string): Promise<DisplayDevice> {
    return (await GET("/device", { params: { id: deviceId } })).data as DisplayDevice
}

export async function setDeviceImage(deviceId: string, imageId: number): Promise<APIResponse> {
    return POST("/setImage", {deviceId, imageId});
}

export async function uploadImage(imageFile: File): Promise<APIResponse> {
    const formData = new FormData();
    formData.append("image", imageFile);
    return POST("/addImage", formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
}

export async function registerDevice(deviceId: string): Promise<APIResponse>{
    return POST("/registerDevice", {deviceId});
}

