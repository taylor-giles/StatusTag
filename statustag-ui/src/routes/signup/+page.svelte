<script lang="ts">
	import { goto } from '$app/navigation';

	let username: string = '';
	let password: string = '';

	async function signUp() {
		const response = await fetch('/api/users/signup', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, password })
		});
		if (response.ok) {
			const { token } = await response.json();
			localStorage.setItem('authToken', token);
			goto('/devices');
		} else {
			alert('Sign-up failed: ' + (await response.json()).error);
		}
	}
</script>

<main>
	<h1>Sign Up</h1>
	<form on:submit|preventDefault={signUp}>
		<label for="username">Username:</label>
		<input id="username" bind:value={username} required />

		<label for="password">Password:</label>
		<input id="password" type="password" bind:value={password} required />

		<button type="submit">Sign Up</button>
	</form>
</main>

<style>
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