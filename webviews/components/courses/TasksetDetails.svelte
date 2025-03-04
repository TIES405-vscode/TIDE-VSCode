<script lang="ts">
  import type { TaskSet } from '../../../src/common/types'

  interface Props {
    taskset: TaskSet;
    isLoggedIn: boolean;
  }

  let { taskset, isLoggedIn }: Props = $props();

</script>

<tr class="task-details-row">
    <td colspan="4">
        <table class="task-details-table">
        <caption>Details</caption>
        <thead>
            <tr>
            <th>Task</th>
            <!-- <th>Points</th> -->
            <!-- <th>Deadline</th> -->
            <!-- <th>Status</th> -->
            <th>Points</th>
            <th>Deadline</th>
            <th>Status</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>placeholder</td>
                <td>placeholder</td>
                <td>placeholder</td>
                <td>placeholder</td>
            </tr>
        </tbody>
        </table>
    </td>
</tr>

<style>

.task-details-row{
    background: #333333;
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
    table-layout: fixed
}

caption{
    text-align: left;
    margin-top: 8px;
}

</style>
