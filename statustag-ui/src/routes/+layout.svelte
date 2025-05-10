<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import '../app.css';

	let { children } = $props();
	let isLoggedIn = $state(false);

	function logout() {
		localStorage.removeItem('authToken');
		isLoggedIn = false;
		goto('/login');
	}

	function checkLogin() {
		isLoggedIn = !!localStorage.getItem('authToken');
	}

	if(browser){
		checkLogin();
	}
</script>

<nav>
	{#if isLoggedIn}
		<button onclick={logout}>Log Out</button>
		<button onclick={() => goto('/devices')}>Devices</button>
	{:else}
		<button onclick={() => goto('/login')}>Log In</button>
	{/if}
</nav>

{@render children()}

<style>
	nav {
		display: flex;
		justify-content: space-between;
		padding: 1rem;
		background-color: #f8f9fa;
		border-bottom: 1px solid #ccc;
	}
	button {
		padding: 0.5rem 1rem;
		border: none;
		background-color: #007BFF;
		color: white;
		cursor: pointer;
		border-radius: 4px;
	}
	button:hover {
		background-color: #0056b3;
	}
</style>
