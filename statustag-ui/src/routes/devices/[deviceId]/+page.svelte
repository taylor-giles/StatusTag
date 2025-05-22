<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import type { Device, Image } from "$lib/types";

	let deviceId: string = page.params.deviceId;
	let deviceData: Device;
	let activeImage: string = "";
	let images: Image[] = [];

	async function fetchDeviceData() {
		console.log("Fetching device data");
		const token = localStorage.getItem("authToken");
		const response = await fetch(`/api/devices/${deviceId}`, {
			headers: { Authorization: `Bearer ${token}` },
		});
		deviceData = await response.json();
		if (response.ok) {
			let activeImageId = deviceData.active_image;
			if (activeImageId) {
				const imageResponse = await fetch(
					`/api/users/images/${activeImageId}`,
					{
						headers: { Authorization: `Bearer ${token}` },
					},
				);
				if (imageResponse.ok) {
					const imageData = await imageResponse.json();
					activeImage = `data:image/unknown;base64,${imageData.image_data}`;
				} else {
					alert("Failed to fetch active image");
				}
			}
		} else {
			alert("Failed to fetch device data");
		}
	}

	async function fetchUserImages() {
		console.log("Fetching user images");
		const token = localStorage.getItem("authToken");
		const response = await fetch("/api/users/images", {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (response.ok) {
			images = await response.json();
		} else {
			alert("Failed to fetch user images");
		}
	}

	async function setActiveImage(imageId: string) {
		console.log("Set active image to", imageId);
		const token = localStorage.getItem("authToken");
		const response = await fetch(`/api/devices/${deviceId}/activeImage`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ imageId }),
		});
		if (response.ok) {
			fetchDeviceData();
		} else {
			alert("Failed to set active image");
		}
	}

	async function uploadImage(event: Event) {
		const token = localStorage.getItem("authToken");
		const file = (event.target as HTMLInputElement).files?.[0];
		if (file) {
			const formData = new FormData();
			formData.append("image", file);
			const response = await fetch("/api/users/images", {
				method: "POST",
				headers: { Authorization: `Bearer ${token}` },
				body: formData,
			});
			if (response.ok) {
				await fetchUserImages();
			} else {
				alert("Failed to upload image");
			}
		}
	}

	onMount(async () => {
		await fetchUserImages();
		await fetchDeviceData();
	});
</script>

<main>
	<h1>Device Home</h1>
	<section>
		<h2>Device Information</h2>
		<p>Device ID: {deviceId}</p>
		{#if activeImage}
			<p>Active Image:</p>
			<img
				style={`width: ${deviceData.screen_length}px; height: ${deviceData.screen_height}px;`}
				src={activeImage}
				alt=""
			/>
		{:else}
			<p>No active image</p>
		{/if}
	</section>

	<section>
		<h2>Upload Image</h2>
		<input type="file" accept="image/*" on:change={uploadImage} />
	</section>

	<section>
		<h2>Image Gallery</h2>
		<div class="grid">
			{#if images && images.length > 0 && deviceData}
				{#each images as image}
					<button
						type="button"
						on:click={() => setActiveImage(image.id.toString())}
					>
						<img
							style={`width: ${deviceData.screen_length}px; height: ${deviceData.screen_height}px;`}
							src={`data:image/unknown;base64,${image.image_data}`}
							alt=""
						/>
					</button>
				{/each}
			{/if}
		</div>
	</section>
</main>

<style>
	main {
		padding: 1rem;
	}
	section {
		margin-bottom: 2rem;
	}
	img {
		max-width: 100%;
		border: 1px solid #ccc;
		border-radius: 4px;
		cursor: pointer;
		object-fit: cover;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: 1rem;
	}
</style>
