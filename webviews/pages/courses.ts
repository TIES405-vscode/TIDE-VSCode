import App from '../components/courses/Courses.svelte'
import { mount } from'svelte'

const app = mount(App, {
  target: document.body,
})

export default app
