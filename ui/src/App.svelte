<script lang="ts">
  import { GlobalState, updateLoginStatus } from "./page-state.svelte";

  let isLoggedIn = $derived(GlobalState.isLoggedIn);
  let PageContent = $derived(GlobalState.pageContent);

  function logout() {
    // Remove the authToken cookie by setting it to expire in the past
    document.cookie =
      "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    updateLoginStatus();
  }
  updateLoginStatus();
</script>

<main>
  <nav>
    <div class="nav-left">
      <img src="/src/assets/favicon.png" alt="Logo" class="nav-logo" />
      <span class="nav-title">StatusTag</span>
    </div>
    {#if isLoggedIn}
      <div class="nav-right">
        <button onclick={logout}>Log Out</button>
      </div>
    {/if}
  </nav>

  <div id="page-content">
    <PageContent />
  </div>
</main>

<style>
  main {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  #page-content {
    width: 100%;
    height: 0px;
    flex: 1;
    padding: 2rem;
  }
  nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2vw;
    background: var(--surface);
    border-bottom: 1px solid var(--primary-dark);
    box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.12);
    width: 100%;
  }
  .nav-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .nav-logo {
    width: 36px;
    height: 36px;
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
  @media (max-width: 600px) {
    nav {
      gap: 0.5rem;
      padding: 0.5rem 2vw;
    }
    .nav-logo {
      width: 28px;
      height: 28px;
    }
    .nav-title {
      font-size: 1.1rem;
    }
  }
</style>
