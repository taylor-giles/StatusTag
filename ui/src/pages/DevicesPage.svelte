<script lang="ts">
	import { getDevices, registerDevice } from "../api";
	import { setCurrentDeviceId } from "../page-state.svelte";

	let devices: any[] = $state([]);
	let newDeviceId: string = $state("");

	async function handleRegister(e?: Event) {
		e?.preventDefault();
		const response = await registerDevice(newDeviceId);
		if (response.ok) {
			updateDeviceList();
			newDeviceId = "";
			setCurrentDeviceId(newDeviceId);
		} else {
			alert("Failed to register device");
		}
	}

	async function updateDeviceList() {
		devices = await getDevices();
	}

	updateDeviceList();
</script>

<main>
	<h1>Your Devices</h1>
	<div class="device-grid">
		{#each devices as device (device.id)}
			<button
				class="device-card"
				onclick={() => {
					setCurrentDeviceId(device.id);
				}}
			>
				<p class="device-id">{device.id}</p>
				<div class="device-preview-container">
					<div
						class="device-active-image"
						style="aspect-ratio: {device.screen_length} / {device.screen_height};"
					>
						<img
							style="object-fit: cover; height: 100%; max-width: 100%;"
							src={device.active_image}
							alt="Device Preview"
						/>
					</div>
				</div>
			</button>
		{:else}
			<div class="empty-grid-message">
				Nothing here yet! <br /> Register a device to get started.
			</div>
		{/each}
	</div>

	<h2>Register a New Device</h2>
	<form onsubmit={handleRegister} class="register-device-form">
		<label for="deviceId">Device ID:</label>
		<input id="deviceId" bind:value={newDeviceId} required />
		<button type="submit">Register</button>
	</form>
</main>

<style>
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
		padding: 1rem 1rem;
		border-radius: 10px;
		cursor: pointer;
		box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.08);
		transition:
			background 0.2s,
			box-shadow 0.2s;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		min-height: 100px;
		gap: 10px;
	}
	.device-card:hover {
		background: var(--secondary-dark);
		box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.13);
		color: white;
	}
	.device-id {
		font-weight: bold;
		margin: 0px;
		word-break: break-all;
		text-align: left;
	}
	.device-preview-container {
		display: flex;
		justify-content: center;
		align-items: center;
		flex: 1;
	}
	.device-active-image {
		width: 100%;
		height: auto;
		max-height: 100%;
		border-radius: 8px;
		box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.1);
	}
	.register-device-form {
		max-width: 1000px;
	}
	.empty-grid-message {
		width: 100%;
		text-align: center;
	}
</style>
