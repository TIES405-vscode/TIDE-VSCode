import App from '../components/sidebar/Sidebar.svelte'
import { mount } from 'svelte'

const app = mount(App, {
  target: document.body,
})

export default app
