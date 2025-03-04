<script lang="ts">
  import type { TaskSet } from '../../../src/common/types'

  interface Props {
    taskset: TaskSet;
    isLoggedIn: boolean;
  }

  let { taskset, isLoggedIn }: Props = $props();
  let showDetails: boolean = $state(false);

  /**
   * Initiates the download of a task set identified by its path.
   */
  function downloadTaskSet() {
    tsvscode.postMessage({
      type: 'DownloadTaskSet',
      value: taskset.path,
    })
  }

  function toggleDetails() {
    showDetails.set(!showDetails);  
  }

</script>

<td>
  <button class="button-taskname" onclick={toggleDetails}>
    <span class="button-taskname-span">{taskset.name}</span>
    <span class="arrow {showDetails ? 'left-arrow' : 'down-arrow'}">&#8250;</span>
  </button>
  {#if showDetails}
    <p>placeholder</p>
  {/if}
</td>
{#if taskset.tasks.length}
  <td>{taskset.tasks.length}</td>
  <td>
    <button onclick={downloadTaskSet}>Download taskset</button>
  </td>
{:else}
  <td colspan="2">Unavailable</td>
{/if}

<style>
  td {
    border: none;
    text-align: center;
    padding: 8px;
    color: rgb(197, 197, 197);
    font-size: 14px;
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

  .button-taskname {
    cursor: pointer;
    border: none;
    background: none;
    padding: 0;
    background-color: transparent;
    color: rgb(197, 197, 197);
  }

  .button-taskname-span{
    font-size: 14px;
  }

  .button-taskname:hover{
    background-color: transparent;
  }

  .arrow {
    margin-left: 2px;
    transition: transform 0.3s ease;
  }

  .left-arrow {
    transform: rotate(90deg);
  }

  .down-arrow {
    transform: rotate(0deg);
  }

</style>
