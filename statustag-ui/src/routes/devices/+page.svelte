<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let devices: any[] = [];
	let newDeviceId: string = '';

	async function fetchDevices() {
		const token = localStorage.getItem('authToken');
		const response = await fetch('/api/users/devices', {
			headers: { Authorization: `Bearer ${token}` }
		});
		if (response.ok) {
			devices = await response.json();
		} else {
			alert('Failed to fetch devices');
		}
	}

	async function registerDevice() {
		const token = localStorage.getItem('authToken');
		const response = await fetch('/api/users/devices', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
			body: JSON.stringify({ deviceId: newDeviceId, screen_length: 800, screen_height: 600 })
		});
		if (response.ok) {
			await fetchDevices();
			newDeviceId = '';
		} else {
			alert('Failed to register device');
		}
	}

	onMount(fetchDevices);
</script>

<main>
	<h1>Devices</h1>
	<ul>
		{#each devices as device}
			<li on:click={() => goto(`/devices/${device.id}`)}>
				<p>Device ID: {device.id}</p>
				<p>Active Image: {device.activeImage || 'None'}</p>
			</li>
		{/each}
	</ul>

	<h2>Register a New Device</h2>
	<form on:submit|preventDefault={registerDevice}>
		<label for="deviceId">Device ID:</label>
		<input id="deviceId" bind:value={newDeviceId} required />
		<button type="submit">Register</button>
	</form>
</main>

<style>
	ul {
		list-style: none;
		padding: 0;
	}
	li {
		border: 1px solid #ccc;
		padding: 1rem;
		margin-bottom: 1rem;
		cursor: pointer;
	}
	li:hover {
		background-color: #f9f9f9;
	}
	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		max-width: 300px;
		margin: auto;
	}
	input, button {
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
	button {
		background-color: #007BFF;
		color: white;
		cursor: pointer;
	}
	button:hover {
		background-color: #0056b3;
	}
</style>