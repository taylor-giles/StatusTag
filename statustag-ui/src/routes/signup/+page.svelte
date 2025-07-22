<script lang="ts">
	import { goto } from '$app/navigation';

	let username: string = '';
	let password: string = '';
	let confirmPassword: string = '';
	let error: string = '';

	async function signUp() {
		error = '';
		if (password !== confirmPassword) {
			error = 'Passwords do not match.';
			password = '';
			confirmPassword = '';
			return;
		}
		const response = await fetch('/api/users/signup', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, password })
		});
		if (response.ok) {
			// Auto-login after signup
			const loginRes = await fetch('/api/users/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password })
			});
			if (loginRes.ok) {
				const { token } = await loginRes.json();
			   document.cookie = `authToken=${token}; path=/; max-age=${60 * 60 * 24 * 7}`;
			   goto('/');
			} else {
				error = 'Account created, but login failed.';
			}
		} else {
			const data = await response.json();
			error = data.error || 'Signup failed.';
			password = '';
			confirmPassword = '';
		}
	}
</script>

<main>
	<h1>Create Account</h1>
	<img src="/favicon.png" alt="Logo" class="login-logo" />
	<form on:submit|preventDefault={signUp}>
		<label for="username">Username:</label>
		<input id="username" bind:value={username} required />

		<label for="password">Password:</label>
		<input id="password" type="password" bind:value={password} required />

		<label for="confirmPassword">Confirm Password:</label>
		<input id="confirmPassword" type="password" bind:value={confirmPassword} required />

		{#if error}
			<p class="error">{error}</p>
		{/if}

		<button type="submit">Create Account</button>
	</form>
	<p class="signup-link">Already have an account? <a href="/login">Log In</a></p>
</main>

<style>
	@import '../../app.css';
	main {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		background: var(--background);
	}
	.login-logo {
		width: 72px;
		height: 72px;
		margin-bottom: 1.5rem;
	}
	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		max-width: 320px;
		width: 100%;
		background: var(--surface);
		padding: 2rem 1.5rem;
		border-radius: 12px;
		box-shadow: 0 2px 16px 0 rgba(0,0,0,0.25);
	}
	input, button {
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
	.signup-link {
		margin-top: 1.5rem;
		color: var(--text-secondary);
		font-size: 1rem;
	}
	.signup-link a {
		color: var(--accent);
		font-weight: 500;
	}
	.error {
		color: var(--error);
		margin: 0.5rem 0 0 0;
		font-size: 1rem;
		text-align: center;
	}
	@media (max-width: 600px) {
		form {
			padding: 1.25rem 0.5rem;
			max-width: 100vw;
		}
		.login-logo {
			width: 56px;
			height: 56px;
		}
	}
</style>