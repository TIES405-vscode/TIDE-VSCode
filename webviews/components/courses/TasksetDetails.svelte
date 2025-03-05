<script lang="ts">
  import type { TaskSet } from '../../../src/common/types'

  interface Props {
    taskset: TaskSet;
    isLoggedIn: boolean;
  }

  let { taskset, isLoggedIn }: Props = $props();

</script>

<!--
@component
This component creates a nested table that displays information 
about indivitual tasks in task set. Visibility is toggled by TasksetTableRow.
TODO: display deadline of task once TIM provides the data to TIDE-CLI
-->

<tr class="task-details">
    <td colspan="3">
        <table class="task-details-table">
        <thead>
            <tr>
                <th>Task</th>
                <th>Deadline</th>
            </tr>
        </thead>
        <tbody>
            {#each taskset.tasks as task}
                <tr class="details-row">
                    <td>{task.ide_task_id}</td>
                    <td>-</td>
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
    text-align: center;
    vertical-align: top;
    padding: 0px;
    color: rgb(197, 197, 197);
    font-size: 14px;
  }

.task-details-table{
    width: 100%;
    table-layout: fixed;
}

.task-details-table th{
    font-weight: normal;
}

.task-details-table td {
    border-top: 1px solid rgb(32, 32, 32);
}


</style>
