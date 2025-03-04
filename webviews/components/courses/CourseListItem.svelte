<script lang="ts">
  import type { Course, CourseStatus } from '../../../src/common/types'
  import Menu from './Menu.svelte'
  import MenuItem from './MenuItem.svelte'
  import TasksetTableRow from './TasksetTableRow.svelte'

  interface Props {
    course: Course;
    isLoggedIn: boolean;
  }

  let { course, isLoggedIn }: Props = $props();

  let isExpanded: boolean = $state(false)

  /**
   * Updates the status of a course to a new status.
   * @param {string} newStatus - The new status for the course.
   */
  function moveCourse(newStatus: CourseStatus) {
    tsvscode.postMessage({
      type: 'SetCourseStatus',
      value: {
        id: course.id,
        status: newStatus,
      },
    })
  }

  /**
   * Toggles the expanded/collapsed state of a course information panel.
   */
  function toggleExpanded() {
    isExpanded = !isExpanded
  }

  let oppositeStatus: CourseStatus = $derived(course.status === 'active' ? 'hidden' : 'active')
  
</script>

<div class="course-box">
  <header>
    <p class="course-title">{course.name}</p>
    <Menu>
      {#snippet toggle()}
            <span >&#8942;</span>
          {/snippet}
      {#snippet menucontent()}
            <MenuItem >
          <a href="#?" onclick={() => moveCourse(oppositeStatus)}>
            Move to {oppositeStatus} courses
          </a>
        </MenuItem>
          {/snippet}
    </Menu>
  </header>
  <div>
    <a class="link" href={'https://tim.jyu.fi/view/' + course.path}>Open material page</a>
  </div>
  <button
    class="expand-collapse-button"
    aria-expanded={isExpanded}
    onclick={() => toggleExpanded()}
  >
    <span class="arrow {isExpanded ? 'up-arrow' : 'down-arrow'}">&#9660;</span>
  </button>
  {#if isExpanded}
    <div class="course-content">
      <div class="course-summary">
        <p>Course summary</p>
        <table>
          <thead>
            <tr>
              <th>Task set</th>
              <th>Number of exercises</th>
            </tr>
          </thead>
          <tbody>
            {#each course.taskSets as taskset}
              <TasksetTableRow {taskset} {isLoggedIn} />
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>

<style>
  .course-box {
    position: relative;
    background-color:rgb(25, 25, 25);
    padding-bottom: 3.5rem;
    margin-top: 1rem;
    margin-bottom: 1rem;
    border-radius: 8px;
    font-size: 1.4em;
    max-width: 85%;
    min-width: 24em;
    width: 100%;
    box-sizing: border-box;
  }

  .course-title {
    margin-left: 1.5rem;
    margin-top: 1.5rem;
  }

  .link {
    margin-left: 1.5rem;
    font-size: 0.9rem;
    color: #007acc;
  }

  .link:hover {
    text-decoration: underline;
  }

  header {
    display: flex;
    justify-content: space-between;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  .expand-collapse-button {
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    color: white;
    background-color: transparent;
    border: none;
    width: 36px;
    height: 36px;
    position: absolute;
    bottom: 0rem;
    left: 50%;
    transform: translateX(-50%);
  }

  .up-arrow {
    transform: rotate(-180deg);
  }

  .down-arrow {
    transform: rotate(0deg);
  }

  .link::after {
    content: '';
    position: absolute;
    bottom: 2rem;
    left: 0;
    width: 100%;
    height: 1px;
    background-color: gray;
  }

  .course-content {
    margin-top: 2rem;
    max-width: 100%;
    overflow-x: auto;
    box-sizing: content-box;
  }

  .course-content p{
    margin-left: 1.5rem;
    margin-top: 1.5rem;
    font-size: smaller;
  }

  .course-summary {
    border-top: 1px solid rgb(116, 116, 116);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    box-sizing: content-box;
  }

  th {
    border: none;
    text-align: center;
    padding: 8px;
    background-color: rgb(25, 25, 25);;
    font-weight: normal;
    font-size: smaller;
  }

</style>
