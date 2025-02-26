/**
 * Entry point for the extension.
 *
 * This file initializes and configures the extension when activated, setting up
 * command registrations, event listeners, and UI components like the sidebar.
 *
 * @author Hannes Koivusipilä
 * @author Stella Palenius
 * @license MIT
 * @date 26.2.2024
 */

import * as vscode from 'vscode'
import * as init from './init'
import Logger from './utilities/logger'
import { SidebarProvider } from './ui/panels/SidebarProvider'
import ExtensionStateManager from './api/ExtensionStateManager'
import UiController from './ui/UiController'
import { CourseTaskProvider } from './ui/panels/TaskExplorerProvider'
import { NewTaskPanelProvider } from './ui/panels/NewTaskPanel'

// This method is called when your extension is activated
export function activate(ctx: vscode.ExtensionContext) {
  Logger.init('TIDE Logs')
  Logger.show()
  ExtensionStateManager.setContext(ctx)
  UiController.init(ctx)
  init.registerCommands(ctx)
  init.registerEventListeners(ctx)

  // vscode.commands.executeCommand('tide.updateCoursesFromTim')

  // Creates and registers the side menu on the left
  const sidebarProvider = new SidebarProvider(ctx.extensionUri)
  ctx.subscriptions.push(vscode.window.registerWebviewViewProvider('tide-sidebar', sidebarProvider))

  // Creates ans registers the treeview for course tasks
  const courseTasksTreeview = new CourseTaskProvider()
  ctx.subscriptions.push(vscode.window.registerTreeDataProvider('tide-tasks-treeview', courseTasksTreeview))
  if (ExtensionStateManager.getLoginData().isLogged) {
    vscode.commands.executeCommand('tide.refreshTree')
  }

  const taskPanelProvider = new NewTaskPanelProvider(ctx.extensionUri)
  ctx.subscriptions.push(vscode.window.registerWebviewViewProvider('tide-taskpanel', taskPanelProvider))
}

// This method is called when your extension is deactivated
export function deactivate() {
  console.log(ExtensionStateManager.getCourses())
}
