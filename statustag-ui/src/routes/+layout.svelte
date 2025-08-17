<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import '../app.css';
    import DeviceDropdown from '$lib/DeviceDropdown.svelte';

	let { children } = $props();
	let isLoggedIn = $state(false);

   function logout() {
	   // Remove the authToken cookie by setting it to expire in the past
	   document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
	   isLoggedIn = false;
	   goto('/login');
   }

   function checkLogin() {
	   // Check for the presence of the authToken cookie
	   isLoggedIn = document.cookie.split(';').some(c => c.trim().startsWith('authToken='));
   }

	if(browser){
		checkLogin();
	}
</script>

<nav>
	{#if isLoggedIn}
		<div class="nav-left">
			<img src="/favicon.png" alt="Logo" class="nav-logo" />
			<DeviceDropdown />
		</div>
		<div class="nav-right">
			<button onclick={logout}>Log Out</button>
		</div>
	{:else}
		<div class="nav-left">
			<img src="/favicon.png" alt="Logo" class="nav-logo" />
			<span class="nav-title">StatusTag</span>
		</div>
	{/if}
</nav>

<main style="flex: 1; height: 0px; max-width: 2500px; width: 100%;">
	{@render children()}
</main>


<style>
	@import '../theme.css';
	nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem;
		background: var(--surface);
		box-shadow: 0 2px 8px 0 rgba(0,0,0,0.12);
		width: 100%;
	}
	.nav-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.nav-logo {
		width: 1.5rem;
		height: 1.5rem;
	}
	.nav-title {
		font-size: 1.3rem;
		font-weight: 600;
		color: var(--primary-light);
		letter-spacing: 1px;
	}
	.nav-right button {
		background: var(--primary-dark);
		color: var(--text-primary);
		border: none;
		border-radius: 4px;
		padding: 0.5rem 1.2rem;
		font-size: 1rem;
		font-weight: 500;
		margin-left: 1rem;
		transition: background 0.2s;
	}
	.nav-right button:hover {
		background: var(--primary-light);
		color: var(--surface);
	}
</style>
