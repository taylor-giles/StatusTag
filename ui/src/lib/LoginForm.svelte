<script lang="ts">
    import { updateLoginStatus } from "../page-state.svelte";
    import { signup, login } from "../api";

    let isSignup = $state(false);
    let username = $state("");
    let password = $state("");
    let confirmPassword = $state("");
    let error = $state("");

    function handleSubmit(e: Event) {
        e.preventDefault();
        isSignup ? handleSignup() : handleLogin();
    }

    async function handleSignup() {
        error = "";
        if (password !== confirmPassword) {
            handleError("Passwords do not match");
            return;
        }
        const response = await signup(username, password);
        if (response.ok) {
            handleLogin(); // Auto-login after signup
        } else {
            handleError(((await response.data) as string) ?? "Signup failed.");
        }
        console.log(response);
    }

    async function handleLogin() {
        const response = await login(username, password);
        if (response.ok) {
            const { token } = response.data;

            // Set the token as a cookie (expires in 7 days, path=/)
            document.cookie = `authToken=${token}; path=/; max-age=${60 * 60 * 24 * 7}`;
            updateLoginStatus();
        } else {
            handleError(((await response.data) as string) ?? "Log in failed.");
        }
        console.log(response);
    }

    async function handleError(err: string) {
        error = err;
        password = "";
        confirmPassword = "";
    }

    async function handleChangeMode(e: Event) {
        e.preventDefault;
        isSignup = !isSignup;
        handleError("");
    }
</script>

<main>
    <form onsubmit={handleSubmit}>
        <div class="input-container">
            <label for="username">Username:</label>
            <input id="username" bind:value={username} required />
        </div>

        <div class="input-container">
            <label for="password">Password:</label>
            <input
                id="password"
                type="password"
                bind:value={password}
                required
            />
        </div>

        {#if isSignup}
            <div class="input-container">
                <label for="confirmPassword">Confirm Password:</label>
                <input
                    id="confirmPassword"
                    type="password"
                    bind:value={confirmPassword}
                    required
                />
            </div>
        {/if}

        {#if error.length > 0}
            <p class="error">{error}</p>
        {/if}

        <button class="submit-button" type="submit">
            {isSignup ? "Create Account" : "Log In"}
        </button>
    </form>

    <p class="signup-link">
        {isSignup ? "Already have an account?" : "New here?"}
        <button class="text-button" onclick={handleChangeMode}>
            {isSignup ? "Log In" : "Create an Account"}
        </button>
    </p>
</main>

<style>
    main {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        width: 100%;
        max-width: 800px;
    }
    .error {
        color: var(--error);
        margin: 0.5rem 0 0 0;
        font-size: 1rem;
        text-align: center;
    }
</style>
