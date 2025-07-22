<script lang="ts">
	import { goto, invalidate } from "$app/navigation";
	import type { PageProps } from "./$types";

	let { data }: PageProps = $props();
	let devices: any[] = $derived(data.devices || []);
	let newDeviceId: string = $state("");

	async function registerDevice() {
		const response = await fetch("/api/users/devices", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ deviceId: newDeviceId }),
		});
		if (response.ok) {
			await invalidate("app:devices");
			newDeviceId = "";
		} else {
			alert("Failed to register device");
		}
	}
</script>

<main>
	<h1>Devices</h1>
	<div class="device-grid">
		{#each devices as device}
			<button
				class="device-card"
				onclick={() => goto(`/devices/${device.id}`)}
			>
				<p class="device-id">Device ID: <br /> {device.id}</p>
				<img
					class="device-active-image"
					src={device.active_image.length > 0
						? `data:image/unknown;base64,${device.active_image}`
						: ""}
					alt="Device Display Preview"
				/>
			</button>
		{/each}
	</div>

	<h2>Register a New Device</h2>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			registerDevice();
		}}
	>
		<label for="deviceId">Device ID:</label>
		<input id="deviceId" bind:value={newDeviceId} required />
		<button type="submit">Register</button>
	</form>
</main>

<style>
	@import "../../app.css";
	main {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		min-height: 100vh;
		background: var(--background);
		padding: 1rem;
	}
	/* Device grid styles */
	.device-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 20px;
		width: 100%;
		max-width: 900px;
		margin-bottom: 2rem;
	}
	.device-card {
		border: 1px solid var(--primary-dark);
		background: var(--surface);
		padding: 1.25rem 1rem;
		border-radius: 10px;
		cursor: pointer;
		box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.08);
		transition:
			background 0.2s,
			box-shadow 0.2s;
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		min-height: 100px;
	}
	.device-card:hover {
		background: var(--secondary-dark);
		box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.13);
	}
	.device-id {
		font-weight: bold;
		margin-bottom: 0.5rem;
		word-break: break-all;
		text-align: left;
	}
	.device-active-image {
		width: auto;
		height: 100%;
		max-height: 150px;
		object-fit: cover;
		border-radius: 8px;
		box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.1);
	}
	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		max-width: 320px;
		width: 100%;
		background: var(--surface);
		padding: 1.5rem 1rem;
		border-radius: 12px;
		box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.15);
		margin-top: 1rem;
	}
	input,
	button {
		background: var(--surface);
		color: var(--text-primary);
		border: 1px solid var(--primary-dark);
		border-radius: 4px;
		padding: 0.75rem;
		font-size: 1rem;
	}
	button {
		background: var(--primary-dark);
		color: var(--text-primary);
		font-weight: 600;
		transition: background 0.2s;
	}
	button:hover {
		background: var(--primary-light);
		color: var(--surface);
	}
	@media (max-width: 600px) {
		form {
			padding: 1rem 0.25rem;
		}
	}
</style>
