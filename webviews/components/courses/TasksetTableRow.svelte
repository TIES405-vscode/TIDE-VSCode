<script lang="ts">
  import type { TaskSet } from '../../../src/common/types'

  interface Props {
    taskset: TaskSet;
    isLoggedIn: boolean;
  }

  let { taskset, isLoggedIn }: Props = $props();

  /**
   * Initiates the download of a task set identified by its path.
   */
  function downloadTaskSet() {
    tsvscode.postMessage({
      type: 'DownloadTaskSet',
      value: taskset.path,
    })
  }

  /**
   * Opens a workspace for the specified task set.
   */
  function openWorkspace() {
    tsvscode.postMessage({
      type: 'OpenWorkspace',
      value: taskset.downloadPath,
    })
    window.addEventListener('message', (event) => {
      const message = event.data;

      if (message.type === 'WorkspaceError') {
        taskset.downloadPath = undefined;
      }
    });
  }
</script>

<td id="name-cell">{taskset.name}</td>

{#if taskset.tasks.length}
  <td>{taskset.tasks.length}</td>
  <!-- <td>6/8</td> -->
  <td>
    {#if taskset.downloadPath === undefined}
      <button onclick={downloadTaskSet}>Download taskset</button>
    {:else}
      <button onclick={openWorkspace}>Open in workspace</button>
    {/if}
  </td>
{:else}
  <td colspan="2">Unavailable</td>
{/if}

<style>
  td {
    border: none;
    text-align: center;
    padding: 8px;
    font-size: smaller;
  }

  button {
    background-color:rgb(0, 111, 185);
    color: white;
    border: none;
    padding: 5px;
    cursor: pointer;
    transition: background 0.3s;
    border-radius: 3px;
  }

  button:hover {
    background-color:rgb(0, 83, 138);
  }
</style>
