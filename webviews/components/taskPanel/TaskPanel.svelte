<script lang="ts">
  import { run } from 'svelte/legacy';

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
    type: ''
  })
  let loginData: LoginData = $state({
    isLogged: false
  })
  let isLoggedIn = $state(false)
  let workspace: string = $state('')
  let taskPoints: TaskPoints = $state({ current_points: undefined })

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
        case 'UpdateWorkspaceName': {
          workspace = message.value
          break
        }
        case 'TaskPoints': {
          taskPoints = message.value
          break
        }
        case 'SubmitResult': {
          // Todo: This tries to show points, but it's not yet implemented
          onTaskSubmitted()
          console.log(message.value)
          break
        }
      }
    })
  })

  /**
   * Sends message to TaskPanel about submitting exercise
   */
  function submitTask() {
    const msg: WebviewMessage = {
      type: 'SubmitTask',
      value: undefined,
    }
    tsvscode.postMessage(msg)
  }

  function onTaskSubmitted() {
    updateTaskPoints()
  }

  /**
   * Shows the output console
   */
  function showOutput() {
    const msg: WebviewMessage = {
      type: 'ShowOutput',
      value: undefined,
    }
    tsvscode.postMessage(msg)
  }

  /**
   * Resets the task file to it's initial stage from TIM.
   * @param taskId ide task id of the task
   */
  function resetExercise() {
    if (timData) {
      tsvscode.postMessage({
        type: 'ResetExercise',
        value: {
          path: timData.path,
          taskId: timData.ide_task_id,
        },
      })
    }
  }

  function resetNoneditableAreas() {
    tsvscode.postMessage({
      type: 'ResetNoneditableAreas',
      value: undefined,
    })
  }

  function updateTaskPoints() {
    tsvscode.postMessage({
      type: 'UpdateTaskPoints',
      value: {
        taskSetPath: timData.path,
        ideTaskId: timData.ide_task_id,
      },
    })
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
    <h1>{workspace} - {timData.ide_task_id}</h1>
    {#if timData.header !== null}
      <h2>{timData.header}</h2>
    {:else}
      <h2>{timData.task_files[0].file_name}</h2>
    {/if}
    <div class="instructions">
      {#if timData.stem !== null}
        <p>{timData.stem}</p>
      {:else}
        <p>To see the instructions, please open the exercise in TIM.</p>
      {/if}
    </div>

    <div>
      <a href={'http://localhost/view/' + timData.path}>Open the exercise in TIM</a>
    </div>

    <hr />

    <div class="points-section">
      {#if timData.max_points == undefined}
      <p>This task does not reward points.</p>
      {:else}
      <PointsDisplay {taskPoints} maxPoints={timData.max_points} />
      <button onclick={updateTaskPoints}>Update points from TIM</button>
      {/if}

      <hr />
      <!-- Why are submit and show output buttons in "points-section"? -->
      <button class="submit-exercise" onclick={submitTask} disabled={!isLoggedIn}
        >Submit Exercise</button
      >
      <button onclick={showOutput}>Show Output</button>
      <!-- <p>Passed Tests</p>
            <div class="progress-bar">
                <div class="progress" style="width: 75%"></div>
            </div> -->
    </div>

    <hr />

    <!-- Checks if the task has several files, if it does then reset exercise button cannot be used and is not shown to user -->
    <div class="reset-section">
      {#if timData.task_files.length < 2}
        <button onclick={resetExercise} disabled={!isLoggedIn}>Reset Exercise</button>
        <!-- <button>Fetch Latest Answer</button> -->
      {/if}
      <button onclick={resetNoneditableAreas}>
        <!-- TODO: better text for button -->
        Reset noneditable areas
      </button>
    </div>
  </div>
{/if}

<style>
  .task-panel {
    padding: 20px;
    border: none;
    width: 90%;
    max-width: 600px;
    margin: 20px auto;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .task-panel h2 {
    font-size: 20px;
    margin-bottom: 20px;
  }

  .task-panel p {
    margin-bottom: 10px;
  }

  .progress-bar {
    width: 100%;
    height: 20px;
    background-color: #f0f0f0;
    border-radius: 10px;
    overflow: hidden;
  }

  .progress {
    height: 100%;
    background-color: #28a745;
    transition: width 0.3s ease-in-out;
  }

  .points-section {
    margin-top: 20px;
  }

  .reset-section {
    margin-top: 20px;
    display: flex;
    flex-direction: column;
  }

  .reset-section button {
    margin-bottom: 10px;
    background-color: #d2042d;
  }

  .reset-section button:hover {
    background-color: #93021f;
  }

  .points-section button,
  .reset-section button {
    margin-right: 10px;
    border: none;
    width: 130px;
    border-radius: 5px;
    padding: 8px 15px;
    cursor: pointer;
    transition: background-color 0.3s ease;
    color: white;
  }

  .points-section button {
    background-color: #007acc;
  }

  .points-section button:hover {
    background-color: #00558e;
  }

  .task-panel hr {
    margin-top: 20px;
    margin-bottom: 20px;
    border: none;
    border-top: 1px inset #ccc;
    width: 100%;
  }

  .submit-exercise {
    margin-bottom: 10px;
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

  button:disabled {
    background: grey;
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
