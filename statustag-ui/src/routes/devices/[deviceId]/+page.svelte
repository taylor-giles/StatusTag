<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { Image } from '$lib/types';

	let activeImage: string = '';
	let images: string[] = [];

	async function fetchDeviceData() {
		const token = localStorage.getItem('authToken');
		const response = await fetch('/api/devices/active', {
			headers: { Authorization: `Bearer ${token}` }
		});
		if (response.ok) {
			const data = await response.json();
			activeImage = data.activeImage;
			images = data.images;
		} else {
			alert('Failed to fetch device data');
		}
	}

	async function setActiveImage(imageId: string) {
		const token = localStorage.getItem('authToken');
		const response = await fetch('/api/devices/active', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
			body: JSON.stringify({ imageId })
		});
		if (response.ok) {
			activeImage = imageId;
		} else {
			alert('Failed to set active image');
		}
	}

	async function uploadImage(event: Event) {
		const token = localStorage.getItem('authToken');
		const file = (event.target as HTMLInputElement).files?.[0];
		if (file) {
			const formData = new FormData();
			formData.append('image', file);
			const response = await fetch('/api/users/images', {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}` },
				body: formData
			});
			if (response.ok) {
				await fetchDeviceData();
			} else {
				alert('Failed to upload image');
			}
		}
	}

	onMount(fetchDeviceData);
</script>

<main>
	<h1>Device Home</h1>
	<section>
		<h2>Active Image</h2>
		{#if activeImage}
			<img src={activeImage} alt="Active Image" />
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
			{#each images as image}
				<button type="button" on:click={() => setActiveImage(image)}>
					<img src={image} alt="" />
				</button>
			{/each}
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
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: 1rem;
	}
	input[type="file"] {
		margin-top: 1rem;
	}
</style>