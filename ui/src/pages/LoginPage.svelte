<script lang="ts">
    import LoginForm from "../lib/LoginForm.svelte";
</script>

<main>
	<h1>Create Account</h1>
	<img src="/src/assets/favicon.png" alt="Logo" class="login-logo" />
	<LoginForm />
</main>

<style>
	main {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		background: var(--background);
	}
	.login-logo {
		width: 3rem;
		height: 3rem;
		margin-bottom: 1.5rem;
	}
</style>