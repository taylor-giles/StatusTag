import type { Component } from "svelte";
import LoginPage from "./pages/LoginPage.svelte";
import DevicesPage from "./pages/DevicesPage.svelte";
import GalleryPage from "./pages/GalleryPage.svelte";

export enum PAGE {
    LOGIN,
    DEVICES,
    GALLERY
}
const PAGES = new Map();
PAGES.set(PAGE.LOGIN, LoginPage);
PAGES.set(PAGE.DEVICES, DevicesPage);
PAGES.set(PAGE.GALLERY, GalleryPage);

/**
 * GLOBAL STATE
 */
let isLoggedIn = $state(false);
let currentDeviceId = $state("");
export function updateLoginStatus() {
    // Check for the presence of the authToken cookie
    isLoggedIn = document.cookie
        .split(";")
        .some((c) => c.trim().startsWith("authToken="));
}
export function setCurrentDeviceId(newId: string) {
    currentDeviceId = newId;
}


/**
 * PAGE HANDLING LOGIC
 */
let currentPage: PAGE = $derived.by(() => {
    // Page decision logic
    if (isLoggedIn) {
        if (currentDeviceId.length > 0) {
            return PAGE.GALLERY;
        }
        return PAGE.DEVICES;
    }
    return PAGE.LOGIN;
});
let currentPageContent: Component = $derived(PAGES.get(currentPage))

export const GlobalState = {
    get isLoggedIn()        { return isLoggedIn },
    get currentDeviceId()   { return currentDeviceId },
    get currentPage()       { return currentPage },
    get pageContent()       { return currentPageContent }
}