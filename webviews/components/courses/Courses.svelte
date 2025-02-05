<script lang="ts">
  import { run } from 'svelte/legacy';

  /**
   * @author Hannes Koivusipilä
   * @author Stella Palenius
   * @license MIT
   * @date 22.3.2024
   */

  import CourseList from './CourseList.svelte'
  import LoaderButton from '../common/LoaderButton.svelte'
  import { onMount } from 'svelte'
  import { type Course, type LoginData, type WebviewMessage } from '../../../src/common/types'

  let downloadPath: string = $state('')
  let courses: Array<Course> = $state([])
  let loginData: LoginData = $state({
    isLogged: false
  })
  let isLoggedIn: boolean = $derived(loginData?.isLogged ?? false)
  let coursesRefreshing: boolean = $state(false)


  function refreshCourses() {
    coursesRefreshing = true
    tsvscode.postMessage({
      type: 'RefreshCourseData',
      value: undefined,
    })
  }

  /**
   * Listens for messages from CoursePanel.ts.
   */
  onMount(() => {
    window.addEventListener('message', (event) => {
      const message: WebviewMessage = event.data
      switch (message.type) {
        case 'SetDownloadPathResult': {
          downloadPath = message.value
          break
        }
        case 'CourseData': {
          courses = message.value
          coursesRefreshing = false
          break
        }
        case 'LoginData': {
          loginData = message.value
          break
        }
      }
    })
  })

  /**
   * Notifies the extension that the user has not chosen a directory for downloading task sets,
   * and posts an error message accordingly.
   */
  function directoryNotSet() {
    tsvscode.postMessage({
      type: 'OnError',
      value: 'Directory for downloading tasks has not been set.',
    })
  }

  run(() => {
    if (downloadPath === null) {
      directoryNotSet()
    }
  });
  
</script>

<!--
@component
This component manages the display and interaction with a list of courses. It listens for messages from CoursePanel.ts,
updates the courses' status, and handles downloading task sets and opening workspaces.
-->

<h1>My Courses</h1>

{#if isLoggedIn}
  <div>
    <LoaderButton
      text="Refresh"
      textWhileLoading="Refreshing"
      loading={coursesRefreshing}
      onClick={refreshCourses}
    />
  </div>

  {#if downloadPath === null}
    <button
      onclick={() => {
        tsvscode.postMessage({
          type: 'SetDownloadPath',
          value: undefined,
        })
      }}>Set directory</button
    >
  {/if}

  {#if courses.length === 0}
    <p>No IDE courses were found.</p>
    <p>Add a course to "My courses" bookmark folder in TIM to begin.</p>
  {:else}
    <CourseList
      defaultExpandedState={true}
      statusOfCourses={'active'}
      courses={courses.filter((c) => c.status === 'active')}
      {isLoggedIn}
    />

    <CourseList
      defaultExpandedState={false}
      statusOfCourses={'hidden'}
      courses={courses.filter((c) => c.status === 'hidden')}
      {isLoggedIn}
    />
  {/if}
{:else}
  Login to view your courses.
{/if}

<style>
  :global(body) {
    margin-bottom: 2.5rem;
  }

  h1 {
    margin-bottom: 2rem;
    font-size: 2rem;
  }
</style>
