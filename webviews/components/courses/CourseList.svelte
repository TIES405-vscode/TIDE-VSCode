<script lang="ts">
  /**
   * @author Hannes Koivusipilä
   * @author Stella Palenius
   * @license MIT
   * @date 30.4.2024
   */
  import { type Course, type CourseStatus } from '../../common/types'
  import CourseListItem from './CourseListItem.svelte'

  export let statusOfCourses: CourseStatus
  export let courses: Array<Course>
  export let defaultExpandedState: boolean
  export let isLoggedIn: boolean

  let isExpanded = defaultExpandedState

  function toggleExpandedState() {
    isExpanded = !isExpanded
  }
</script>

<!--
@component
This component renders a list of courses with options to toggle their visibility,
expand or collapse course details, and perform actions like downloading task sets
or opening workspaces.
-->

<button class="button-header" on:click={toggleExpandedState}>
  <span class="button-header-span">{statusOfCourses} Courses</span>
  <span class="arrow {isExpanded ? 'left-arrow' : 'down-arrow'}">&#8250;</span>
</button>

{#if isExpanded}
  {#each courses as course}
    <CourseListItem {course} {isLoggedIn} />
  {/each}
{/if}

<style>
  :global(body) {
    margin-bottom: 2.5rem;
  }

  .button-header {
    display: flex;
    align-items: center;
    cursor: pointer;
    border: none;
    background: none;
    font-size: 1.4rem;
    font-weight: bold;
    margin-top: 1.5rem;
    padding: 0;
    color: white;
  }

  .button-header-span::first-letter {
    text-transform: capitalize;
  }

  .arrow {
    margin-left: 8px;
    transition: transform 0.3s ease;
  }

  .left-arrow {
    transform: rotate(90deg);
  }

  .down-arrow {
    transform: rotate(0deg);
  }

  button {
    background-color: #007acc;
    color: white;
    border: none;
    padding: 0.3rem 0.5rem;
    border-radius: 4px;
    font-size: small;
    cursor: pointer;
  }

  button:active {
    background: #004d80;
  }

  button:disabled {
    background: grey;
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  .arrow {
    transition: transform 0.5s ease;
  }

  .down-arrow {
    transform: rotate(0deg);
  }
</style>
