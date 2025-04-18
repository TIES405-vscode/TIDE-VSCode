<script lang="ts">
  import { run } from 'svelte/legacy'

  /**
   * @author Hannes Koivusipilä
   * @author Stella Palenius
   * @license MIT
   * @date 9.4.2024
   */

  import { onMount } from 'svelte'
  import {
    type LoginData,
    type TaskPoints,
    type TimData,
    type WebviewMessage,
  } from '../../../src/common/types'
  import PointsDisplay from './PointsDisplay.svelte'

  let timData: TimData = $state({
    doc_id: 0,
    header: undefined,
    ide_task_id: '',
    max_points: null,
    path: '',
    stem: undefined,
    task_files: [],
    type: '',
    deadline: null,
    answer_limit: null
  })
  let loginData: LoginData = $state({
    isLogged: false
  })
  let isLoggedIn = $state(false)
  let taskPoints: TaskPoints = $state({ current_points: null })
  let customUrl: string = $state('')

  /**
   * Listens for messages from CoursePanel.ts.
   */
  onMount(() => {
    window.addEventListener('message', (event) => {
      const message: WebviewMessage = event.data
      switch (message.type) {
        case 'UpdateTimData': {
          timData = message.value
          break
        }
        case 'LoginData': {
          loginData = message.value
          break
        }
        case 'TaskPoints': {
          taskPoints = message.value
          break
        }
        case 'CustomUrl': {
          customUrl = ensureTrailingSlash(message.value)
          break
        }
      }
    })
  })

  // Ensure that the URL has a trailing slash
  function ensureTrailingSlash(url: string): string {
    return url.endsWith('/') ? url : url + '/'
  }


  run(() => {
    isLoggedIn = loginData?.isLogged ?? false
  });
</script>

<!--
@component
This component manages the display of task information and interaction with tasks, such as submitting exercises and resetting tasks.
-->

{#if timData === undefined}
  <p>
    Task Panel only shows information when you have a TIM task document open in the text editor. If
    you are sure you have a TIM task open, try clicking on the text editor to activate the document.
  </p>
{:else if !timData}
  <p>Loading...</p>
  <span class="loader"></span>
{:else}
  <div class="task-panel">
    {#if timData.header !== null}
      <h3>{timData.header}</h3>
    {:else}
      <h3>{timData.task_files[0].file_name}</h3>
    {/if}
    <div class="instructions">
      {#if timData.stem !== null}
        <p>{timData.stem}</p>
      {:else}
        <p>To see the more instructions, please open the exercise in TIM.</p>
      {/if}
        <a href={ customUrl + "view/" + timData.path}>Open exercise in TIM</a>
    </div>

    <hr />

    <div class="points-section">
      {#if timData.max_points == undefined}
      <p>This task does not reward points.</p>
      {:else}
      <PointsDisplay {taskPoints} taskMaxPoints={timData.max_points} />
      {/if}
    </div>

    <div>
      {#if timData.answer_limit !== null}
      <p>For this task, you can only get points from the first {timData.answer_limit} submissions.</p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .task-panel {
    border: none;
  }

  .task-panel h3 {
    margin: 0;
    font-weight: bold;
  }

  .task-panel p {
    margin: 0.5em 0 0.5em 0;
    font-size: small;
  }

  .task-panel a {
    margin: 0.5em 0 0.5em 0;
    font-size: small;
  }

  .task-panel hr {
    margin-top: 10px;
    margin-bottom: 10px;
    border: none;
    border-top: 1px inset #ccc;
    width: 100%;
  }

  .loader {
    width: 48px;
    height: 48px;
    border: 5px solid #fff;
    border-bottom-color: transparent;
    border-radius: 50%;
    display: inline-block;
    box-sizing: border-box;
    animation: rotation 1s linear infinite;
  }

  @keyframes rotation {
    0% {
      transform: rotate(0deg);
    }

    100% {
      transform: rotate(360deg);
    }
  }
</style>
