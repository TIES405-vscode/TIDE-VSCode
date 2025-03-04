<script lang="ts">
  import type { TaskSet } from '../../../src/common/types'

  interface Props {
    taskset: TaskSet;
    isLoggedIn: boolean;
  }

  let { taskset, isLoggedIn }: Props = $props();

</script>

<tr class="task-details">
    <td colspan="4">
        <table class="task-details-table">
        <thead>
            <tr>
            <th>Task</th>
            <th>Points</th>
            <th>Deadline</th>
            </tr>
        </thead>
        <tbody>
            {#each taskset.tasks as task}
                <tr class="details-row">
                    <td>{task.ide_task_id}</td>
                    <td>placeholder</td>
                    <td>placeholder</td>
                </tr>
            {/each}
        </tbody>
        </table>
    </td>
</tr>

<style>

.task-details{
    background:rgb(44, 44, 44);
    border-top: 1px solid rgb(25, 25, 25);
}

td {
    border: none;
    text-align: left;
    vertical-align: top;
    padding-left: 0px;
    padding-right: 8px;
    color: rgb(197, 197, 197);
    font-size: 14px;
  }

.task-details-table{
    margin-left: 7rem;
    width: 60%;
    table-layout: fixed;
}

.task-details-table th{
    font-weight: normal;
}

</style>
