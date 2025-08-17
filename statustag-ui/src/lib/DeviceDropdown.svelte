<script lang="ts">
  import { goto } from "$app/navigation";
  import type { Device } from "$lib/types";
  let devices: Device[] = [];
  let selectedDeviceId: string = "";

  function handleChange(e: Event) {
    const id = (e.target as HTMLSelectElement).value;
    selectedDeviceId = id;
    if (id !== "add-new") {
      goto(`/devices/${id}`);
    } else {
      alert("Add device modal coming soon!");
    }
  }
</script>

<select class="device-dropdown" bind:value={selectedDeviceId} on:change={handleChange}>
  {#each devices as device}
    <option value={device.id}>Device {device.id}</option>
  {/each}
  <option value="add-new">＋ Add Device</option>
</select>

<style>
.device-dropdown {
  font-size: 1rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: 2px solid var(--primary-dark, #333);
  background: var(--surface, #fff);
  color: var(--text-primary, #222);
  margin-right: 1rem;
}
</style>
