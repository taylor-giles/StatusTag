<script lang="ts">
	import { invalidate } from "$app/navigation";
	import { page } from "$app/state";
	import type { Device, DisplayImage } from "$lib/types";
	import { setActiveImage, uploadImage } from "$lib/api";
	import type { PageProps } from "./$types";
    import DeviceDropdown from "$lib/DeviceDropdown.svelte";

	let { data }: PageProps = $props();
	let deviceId: string = page.params.deviceId;
	let deviceData: Device = $derived(data.deviceData as Device);
	let activeImage: string = $derived(data.activeImage || "");
	let images: DisplayImage[] = $derived(data.images || []);
	$effect(() => console.log(activeImage));

	async function handleUploadImage(event: Event) {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (file && (await uploadImage(file))) {
			await invalidate("app:images");
		} else {
			alert("Failed to upload image");
		}
	}

	async function handleSetImage(imageId: number) {
		if (imageId && (await setActiveImage(deviceId, imageId))) {
			await invalidate("app:deviceData");
		} else {
			alert(`Failed to set image for device ${deviceId}`);
		}
	}
</script>

<main>
   <section id="header">
	   {#if !deviceId}
		   <div class="active-image-container">
			   <h2>Welcome!</h2>
			   <p style="font-size: 1.2rem; color: var(--text-secondary); margin-top: 2rem;">Please add or select a device from the dropdown above.</p>
			   <DeviceDropdown />
		   </div>
	   {:else if activeImage}
		   <div class="active-image-container">
			   <h2>Current Display</h2>
			   <div
				   style="aspect-ratio: {deviceData.screen_length} / {deviceData.screen_height}; max-height: 100%; max-width: 100%; display: flex; align-items: center; justify-content: center;"
			   >
				   <img
					   src={activeImage}
					   alt=""
					   style="object-fit: cover;"
					   class="active-image"
				   />
			   </div>
		   </div>
	   {:else}
		   <p>No active image</p>
	   {/if}
   </section>

   {#if deviceId}
		<section id="gallery" style="width: 100%;">
			<h2>Gallery</h2>
			<div class="gallery-wrapper">
				<div class="gallery">
					{#if images && images.length > 0 && deviceData}
						{#each images as image}
							<button
								style="aspect-ratio: {deviceData.screen_length} / {deviceData.screen_height};"
								class="gallery-image"
								type="button"
								onclick={() => handleSetImage(image.id)}
							>
								<img
									src={image.image_data}
									alt=""
									style="object-fit: cover; width: 100%; height: 100%;"
								/>
							</button>
						{/each}
					{/if}
					<label class="gallery-image add-image-btn">
						<p>＋</p>Add Image
						<input
							type="file"
							accept="image/*"
							onchange={handleUploadImage}
						/>
					</label>
				</div>
			</div>
		</section>
	{/if}
</main>

<style>
	main {
		display: flex;
		flex-direction: row;
		align-items: center;
		padding: 2rem 2rem;
		height: 100%;
		width: 100%;
		background: var(--background);
		gap: 2rem;
	}
	section {
		width: 0px;
		height: 100%;
	}
	#header {
		flex: 4;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
	}
	#gallery {
		flex: 6;
		display: flex;
		flex-direction: column;
	}
	h2 {
		font-size: 1.3rem;
		font-weight: 600;
		letter-spacing: 0.5px;
	}
	.active-image-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
		flex: 1;
		height: 0px;
		padding: 1rem;
		padding-inline: 0px;
		gap: 1.5rem;
	}
	.active-image {
		border-radius: 12px;
		box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.25);
		height: 100%;
		max-width: 100%;
	}
	.gallery-wrapper {
		width: 100%;
		flex: 1;
		height: 0px;
		overflow-y: auto;
		padding: 1rem;
		padding-inline: 0px;
	}
	.gallery {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(6rem, 1fr));
		gap: 0.75rem;
		max-height: 100%;
	}
	.gallery-image {
		border-radius: 6px;
		cursor: pointer;
		transition:
			box-shadow 0.2s,
			border 0.2s;
		border: 2px solid gray;
		padding: 0px;
		width: 100%;
		min-width: 6rem;
		box-sizing: border-box;
	}
	.gallery-image:hover {
		box-shadow: 0 0 8px 0 white;
		border: 2px solid white;
	}
	.add-image-btn {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		color: var(--text-secondary);
		width: 100%;
		height: 100%;
		padding: 1rem;
		border-radius: 6px;
		font-weight: 500;
		font-size: 1rem;
		cursor: pointer;
		transition:
			border 0.2s,
			box-shadow 0.2s,
			background 0.2s;
		border: 4px solid var(--primary-dark);
		padding: 0px;
		text-align: center;
		box-shadow: 0px 0px 1rem 0px var(--primary-dark) inset;
	}
	.add-image-btn:hover {
		box-shadow: 0 0 8px 0 var(--primary-dark);
		border: 2px solid var(--surface);
		background: var(--primary-dark);
		color: var(--text-primary);
	}
	.add-image-btn p {
		margin: 0;
		font-size: 2rem;
	}
	input[type="file"] {
		display: none;
	}
	@media (orientation: portrait) {
		main {
			flex-direction: column;
			gap: 0px;
		}
		section {
			width: 100%;
			height: 0px;
		}
		.active-image-container {
			height: 0px;
			flex: 1;
		}
		.active-image {
			max-width: 100%;
			max-height: auto;
			height: 100%;
			width: auto;
		}
	}
</style>
