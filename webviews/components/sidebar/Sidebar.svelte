<script lang="ts">
  import { run } from 'svelte/legacy';

  /**
   * @author Hannes Koivusipilä
   * @author Stella Palenius
   * @license MIT
   * @date 16.3.2024
   */

  import { onMount } from 'svelte'
  import { type LoginData } from '../../../src/common/types'
  let isLoggedIn = $state(false)
  let loginData: LoginData = $state({
    isLogged: false
  })

  /**
   * Listens to messages from the extension.
   */
  onMount(() => {
    window.addEventListener('message', (event) => {
      const message = event.data
      if (message && message.type === 'LoginData') {
        loginData = message.value
      }
    })

    tsvscode.postMessage({ type: 'RequestLoginData', value: '' })
  })

  /**
   * Posts message for the extension for logging user in.
   */
  function handleLogin() {
    tsvscode.postMessage({
      type: 'Login',
      value: '',
    })
  }

  /**
   * Posts message for extension for logging user out.
   */
  function handleLogout() {
    tsvscode.postMessage({
      type: 'Logout',
      value: '',
    })
  }

  run(() => {
    isLoggedIn = loginData ? loginData.isLogged : false
  });
</script>

<!--
@component
This component manages the sidebar navigation and user authentication.
It listens for messages from the extension to handle login and logout functionalities.
-->

<nav>
  <ul class="nav-list">
    {#if !isLoggedIn}
      <li><button onclick={handleLogin}>Login</button></li>
    {:else}
      <li>
        <button
          onclick={() => {
            tsvscode.postMessage({
              type: 'ShowCourses',
              value: '',
            })
          }}>My Courses</button
        >
      </li>
      <li>
        <button onclick={handleLogout}>Logout</button>
      </li>
    {/if}
    <li>
      <button
        onclick={() => {
          tsvscode.postMessage({
            type: 'OpenSettings',
            value: '',
          })
        }}>Settings</button
      >
    </li>
  </ul>
</nav>

<style>
  button {
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
  }

  .nav-list {
    padding: 0;
    margin: 0;
    list-style-type: none;
  }
</style>
