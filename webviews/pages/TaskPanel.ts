import App from '../components/taskPanel/TaskPanel.svelte'
import { mount } from 'svelte'

const app = mount(App, {
  target: document.body,
})

export default app
