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
import { TaskPanelProvider } from './ui/panels/TaskPanelProvider'
import Tide from './api/tide'
import AnswerLimitStatusBarItem from './ui/AnswerLimitStatusBarItem'

// This method is called when your extension is activated
export async function activate(ctx: vscode.ExtensionContext) {
  Logger.init('TIDE Logs')
  Logger.show()
  ExtensionStateManager.setContext(ctx)
  UiController.init(ctx)
  init.registerCommands(ctx)
  init.registerEventListeners(ctx)

  // vscode.commands.executeCommand('tide.updateCoursesFromTim')

  // Initialize Login and User Data
  const userData = await Tide.checkLogin()
  if (userData.logged_in) {
    ExtensionStateManager.setLoginData({isLogged: true})
    ExtensionStateManager.setUserData(userData)
  } else {
    ExtensionStateManager.setLoginData({isLogged: false})
    ExtensionStateManager.setUserData(userData)
  }
  



  // Creates and registers the side menu on the left
  const sidebarProvider = new SidebarProvider(ctx.extensionUri)
  ctx.subscriptions.push(vscode.window.registerWebviewViewProvider('tide-sidebar', sidebarProvider))

  // Creates ans registers the treeview for course tasks
  const courseTasksTreeview = new CourseTaskProvider()
  ctx.subscriptions.push(vscode.window.registerTreeDataProvider('tide-tasks-treeview', courseTasksTreeview))
  if (ExtensionStateManager.getLoginData().isLogged) {
    vscode.commands.executeCommand('tide.refreshTree')
  }

  // Creates and registers the taskpanel menu on the left
  const taskPanelProvider = new TaskPanelProvider(ctx.extensionUri)
  ctx.subscriptions.push(vscode.window.registerWebviewViewProvider('tide-taskpanel', taskPanelProvider))

  // Creates and registers taskbar item for displaying answer_limit warnings
  const answerLimitStatusBarItem = new AnswerLimitStatusBarItem(vscode.StatusBarAlignment.Right, 500)
  ctx.subscriptions.push(answerLimitStatusBarItem)
}

// This method is called when your extension is deactivated
export function deactivate() {
  console.log(ExtensionStateManager.getCourses())
}
