<script lang="ts">
    import {getDevices} from "../api";
    import { setCurrentDeviceId } from "../page-state.svelte"

	let devices: any[] = $state([]);
	let newDeviceId: string = $state("");

	async function registerDevice(e?: Event) {
        e?.preventDefault();
		const response = await fetch("/api/users/devices", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ deviceId: newDeviceId }),
		});
		if (response.ok) {
			updateDeviceList();
			newDeviceId = "";
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
	<h1>Devices</h1>
	<div class="device-grid">
		{#each devices as device (device.id)}
			<button
				class="device-card"
                onclick={() => {setCurrentDeviceId(device.id)}}
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
        onsubmit={registerDevice}
	>
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
</style>
