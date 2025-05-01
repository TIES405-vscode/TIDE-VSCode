/**
 * Command registration for the extension.
 *
 * This module registers various commands for the extension, allowing users to interact with tasks,
 * courses, and settings. It includes commands for showing panels, managing user authentication, and handling task operations.
 *
 * @author Hannes Koivusipilä
 * @author Stella Palenius
 * @license MIT
 * @date 26.2.2024
 */

import * as vscode from 'vscode'
import Logger from '../utilities/logger'
import Tide from '../api/tide'
import ExtensionStateManager from '../api/ExtensionStateManager'
import UiController from '../ui/UiController'
import { mergeCoursesWithNewData } from '../utilities/mergeCourses'
import path from 'path'
import { Course, TimData } from '../common/types'

export function registerCommands(ctx: vscode.ExtensionContext) {
  Logger.info('Registering commands.')
  ctx.subscriptions.push(
    vscode.commands.registerCommand('tide.hello-world', () => {
      vscode.window.setStatusBarMessage('Hello TIDE!')
    }),
  )

  /**
   * Opens VS Code settings and filters them to match with the extension.
   */
  ctx.subscriptions.push(
    vscode.commands.registerCommand('tide.openSettings', () => {
      vscode.commands.executeCommand('workbench.action.openSettings', 'TIM-IDE')
    }),
  )

  /**
   * Resets exercise of active task file.
   */
  ctx.subscriptions.push(
    vscode.commands.registerCommand('tide.resetExercise', async () => {
      const editor = vscode.window.activeTextEditor
      if (!editor) {
        vscode.window.showErrorMessage('No active file to reset.')
        return
      }
      const doc = editor.document
      Tide.resetTask(doc.fileName)
    }),
  )


  /**
   * Restore last submission of active task file.
   */
  ctx.subscriptions.push(
    vscode.commands.registerCommand('tide.restoreSubmission', async () => {
      const editor = vscode.window.activeTextEditor
      if (!editor) {
        vscode.window.showErrorMessage('No active file to restore.')
        return
      }
      const doc = editor.document
      const currentDir = path.dirname(doc.fileName)
      const tasksetDir = path.dirname(path.dirname(currentDir))
      const course: Course =  ExtensionStateManager.getCourseByDownloadPath(path.dirname(currentDir))
      const taskset = course.taskSets.find(taskSet => taskSet.downloadPath === path.dirname(currentDir))
      // Find the names of the tasks ide_task_id and the task set from the files path
      let itemPath = currentDir
      let pathSplit = itemPath.split(path.sep)
      // ide_task_id
      let id = pathSplit.at(-1)
      // task set name
      let demo = pathSplit.at(-2)
      if (demo && id && taskset) {
        const timData : TimData | undefined = ExtensionStateManager.getTaskTimData(taskset.path, demo, id)
        if (timData) {
          Tide.overwriteTask(timData.path, timData.ide_task_id, tasksetDir)
        Tide.getTaskPoints(timData.path, timData.ide_task_id, (points: any) => {
          if (points !== undefined && points !== null) {
            ExtensionStateManager.setTaskPoints(timData.path, timData.ide_task_id, points)
          } else {
            vscode.window.showErrorMessage('TimData is undefined or invalid.')
          }
        })
      }
    }
  }),
  )
  

  /**
   * Submits current task file to TIM.
   */
  ctx.subscriptions.push(
    vscode.commands.registerCommand('tide.submitTask', async () => {
      const editor = vscode.window.activeTextEditor
      if (!editor) {
        vscode.window.showErrorMessage('No active file to submit.')
        return
      }
      const taskPath = editor.document.uri.fsPath
      const callback = () => vscode.window.showInformationMessage('Task was submitted to TIM')
      
      // If changes, check if user wants to save and submit task to TIM
      if (editor.document.isDirty) {
        const messageOpts: vscode.MessageOptions = {
          'detail': 'Do you wish to save the changes before submitting the task to TIM?\nUnsaved changes won\'t be submitted.',
          'modal': true
        }
        const modalOpts: string[] = [
          'Save and Submit',
          'Submit without Saving',
        ]
        const selection = await vscode.window.showInformationMessage(
          'There are Unsaved Changes in the Current File',
          messageOpts,
          ...modalOpts
        )
        // Cancel
        if (!selection) {
          return
        }

        if (selection === 'Submit without Saving') {
          Tide.submitTask(taskPath, callback) 
        }
        else {
          try {
            const saved = await vscode.workspace.save(editor.document.uri)
            if (!saved) {
              vscode.window.showErrorMessage('Save failed - Current task has not been submitted!')
              return
            }
            Tide.submitTask(taskPath, callback)
          } catch (error) {
            vscode.window.showErrorMessage('Error occurred during the submit: ${error}')
          }
        }
      }
      else {
        Tide.submitTask(taskPath, callback)
      }
    }),
  )

  /**
   * Opens My courses -view.
   */
  ctx.subscriptions.push(
    vscode.commands.registerCommand('tide.showCourses', () => {
      UiController.showCoursePanel()
    }),
  )

  /**
   * Gets courses from TIM and updates the data to ExtensionStateManager
   */
  ctx.subscriptions.push(
    vscode.commands.registerCommand('tide.updateCoursesFromTim', async () => {
      const existingCourses = ExtensionStateManager.getCourses()
      Tide.getCourseList().then((freshCourses) => {
        if (existingCourses === undefined || existingCourses.length === 0) {
          ExtensionStateManager.setCourses(freshCourses)
        } else {
          const mergedCourses = mergeCoursesWithNewData(existingCourses, freshCourses)
          ExtensionStateManager.setCourses(mergedCourses)
        }
      })
      // const freshCourses = await Tide.getCourseList()
      // if (existingCourses === undefined || existingCourses.length === 0) {
      //   ExtensionStateManager.setCourses(freshCourses)
      // } else {
      //   const mergedCourses = mergeCoursesWithNewData(existingCourses, freshCourses)
      //   ExtensionStateManager.setCourses(mergedCourses)
      // }
    }),
  )

  /**
   * Registers the 'tide.login' command, allowing users to log in to TIDE.
   */
  ctx.subscriptions.push(
    vscode.commands.registerCommand('tide.login', async () => {
      let loginData = await Tide.login()
      ExtensionStateManager.setLoginData(loginData)
      let userData = await Tide.checkLogin()
      ExtensionStateManager.setUserData(userData)
    }),
  )

  /**
   * Registers the 'tide.logout' command, allowing users to log out of TIDE.
   */
  ctx.subscriptions.push(
    vscode.commands.registerCommand('tide.logout', async () => {
      let data = await Tide.logout()
      ExtensionStateManager.setLoginData(data)
      let userData = await Tide.checkLogin()
      ExtensionStateManager.setUserData(userData)
    }),
  )

  /**
   * Registers the 'tide.listCourses' command, allowing users to list courses from TIDE.
   */
  ctx.subscriptions.push(
    // TODO: This is unnecessary
    vscode.commands.registerCommand('tide.listCourses', () => {
      Tide.getCourseList()
    }),
  )

  ctx.subscriptions.push(
    vscode.commands.registerCommand('tide.debug', () => {
      Logger.debug(ExtensionStateManager.getCourses())
    }),
  )

  ctx.subscriptions.push(
    vscode.commands.registerCommand('tide.clearCourseCache', () => {
      ExtensionStateManager.setCourses([])
    }),
  )

  ctx.subscriptions.push(
    vscode.commands.registerCommand('tide.clearLocalExtensionData', () => {
      ExtensionStateManager.reset()
    }),
  )

  /**
   * Opens TIDE Logs into Output panel.
   */
  ctx.subscriptions.push(
    vscode.commands.registerCommand('tide.showOutput', () => {
      vscode.commands.executeCommand('workbench.panel.output.focus')
      vscode.commands.executeCommand('workbench.action.focusFirstEditorGroup')
    }),
  )

  ctx.subscriptions.push(
    vscode.commands.registerCommand('tide.timIcon', () => {
      vscode.commands.executeCommand('workbench.action.quickOpen', '>TIDE: ')
    })
  )
}
