/**
 * This class handles communication with the cli tool.
 *
 * @author Hannes Koivusipilä
 * @author Stella Palenius
 * @license MIT
 * @date 6.3.2024
 */

import * as cp from 'child_process'
import Logger from '../utilities/logger'
import * as vscode from 'vscode'
import { Course, LoginData, Task, TaskCreationFeedback, TaskPoints, TimData, UserData } from '../common/types'
import { parseCoursesFromJson } from '../utilities/parsers'
import ExtensionStateManager from './ExtensionStateManager'
import path from 'path'
import UiController from '../ui/UiController'


export default class Tide {
  public static async debug() {
    this.runAndHandle([], (data: string) => {
      Logger.debug(data)
    })
  }

  /**
   * Executes tide login command.
   */
  public static async login(): Promise<LoginData> {
    let loginData = { isLogged: false }

    try {
      await this.runAndHandle(['login', '--json'], (data: string) => {
        const jsonStart = data.indexOf('{')
        const jsonString = data.slice(jsonStart)
        const parsedData = JSON.parse(jsonString)
        loginData = { isLogged: parsedData['login_success'] }
        if (!loginData.isLogged) {
          UiController.showError('Login failed.')
        }
      })
    } catch (error) {
      Logger.error('Error while logging in: ' + error)
      UiController.showError('Login failed.')
    }
    return loginData
  }

  /**
   * Executes tide logout command.
   */
  public static async logout(): Promise<LoginData> {
    try {
      await this.runAndHandle(['logout'], (data: string) => {
        Logger.info(`Logout: ${data}`)
      })
    } catch (error) {
      Logger.error('Error while logging out: ' + error)
      UiController.showError('Logout failed.')
    }
    return { isLogged: false }
  }

  /**
   * Executes tide check-login command.
   * @returns Logged in user data as JSON
   */
  public static async checkLogin(): Promise<UserData> {
    let loggedInUserData: UserData = { logged_in: null}
    try {
      await this.runAndHandle(['check-login', '--json'], (data: string) => {
      Logger.info(`Login data: ${data}`)
      loggedInUserData = JSON.parse(data)
      })
    }
    catch (error) {
      Logger.error('Error while checking login: ' + error)
      UiController.showError('Login check failed.')
    }
    return loggedInUserData
  }

  /**
   * Fetches user's IDE-compatible courses from TIM.
   * @returns course data
   */
  public static async getCourseList(): Promise<Array<Course>> {
    let courses: Array<Course> = []
    try {
      await this.runAndHandle(['courses', '--json'], async (data: string) => {
        courses = await parseCoursesFromJson(data)
      })
    }
    catch (error) {
      Logger.error('Error while fetching courses: ' + error)
      UiController.showError('Failed to fetch courses.')
    }
    return courses
  }

  /**
   * Lists all the tasks in one task set.
   * @param taskSetPath path to task set. Path can be found by executing cli courses command
   * @returns task data
   */
  public static async getTaskListForTaskSetPath(
    taskSetPath: string,
    ignoreErrors: boolean = false,
  ): Promise<Array<Task>> {
    let tasks: Array<Task> = []
    try {
      await this.runAndHandle(
        ['task', 'list', taskSetPath, '--json'],
        async (data: string) => {
          tasks = JSON.parse(data)
        },
        ignoreErrors,
      )
    }
    catch (error) {
      Logger.error('Error while fetching tasks: ' + error)
      UiController.showError('Failed to fetch tasks.')
    }
    return tasks
  }

  /**
   * Downloads task set from TIM; creates files for each task
   * @param {string} taskSetPath - path to task set. Path can be found by executing cli courses command
   */
  public static async downloadTaskSet(courseName:string, taskSetPath: string) {
    try {
      const downloadPathBase: string | undefined = vscode.workspace
        .getConfiguration()
        .get('TIM-IDE.fileDownloadPath')
      if (downloadPathBase === undefined) {
        UiController.showError('Download path not set!')
        return
      }

      const taskName = path.basename(taskSetPath)
      const localCoursePath = path.join(path.normalize(downloadPathBase), courseName)
      const localTaskPath = path.join(path.normalize(downloadPathBase), courseName, taskName)
      await this.runAndHandle(['task', 'create', taskSetPath, '-a', '-d', localCoursePath], (data: string) => {
          ExtensionStateManager.setTaskSetDownloadPath(taskSetPath, localTaskPath)
        // TODO: --json flag is not yet implemented in cli tool 
        // const taskCreationFeedback: TaskCreationFeedback = JSON.parse(data)
        // if (taskCreationFeedback.success) {
        //   ExtensionStateManager.setTaskSetDownloadPath(taskSetPath, downloadPath)
        // } else {
        //   // TODO: more specific errors from cli
        //   UiController.showError('Error downloading tasks.')
        // }
      })
    }
    catch (error) {
      Logger.error('Error while downloading task set: ' + error)
      UiController.showError('Failed to download task set.')
    }
  }

  /**
   * Overwrites a local task set
   *
   * @param {string} taskSetPath - path of the task set
   */
  public static async overwriteSetTasks(taskSetPath: string) {
    try {
      this.runAndHandle(['task', 'create', '-a', '-f', taskSetPath], (data: string) => {
        Logger.debug(data)
      })
    }
    catch (error) {
      Logger.error('Error while overwriting task set: ' + error)
      UiController.showError('Failed to overwrite task set.')
    }
  }

  /**
   * Overwrites one exercise. Used in task restore commad
   * @param taskSetPath - tide task set for the exercise that is going to be overwritten
   * @param ideTaskId - id/directory for the task that is going to be overwritten
   * @param fileLocation - path to the directory where user has loaded the task set
   */
  public static async overwriteTask(taskSetPath: string, ideTaskId: string, fileLocation: string) {
    try {
      this.runAndHandle(
        ['task', 'create', taskSetPath, ideTaskId, '-f', '-d', fileLocation],
        (data: string) => {
          Logger.debug(data)
        },
      )
    }
    catch (error) {
      Logger.error('Error while overwriting task: ' + error)
      UiController.showError('Failed to overwrite task.')
    }
  }

  /**
   * Resets the noneditable parts of a task file to their original state.
   * @param filePath - path of the file to reset
   */
  public static async resetTask(filePath: string) {
    try {
      vscode.commands.executeCommand('workbench.action.files.save')
      this.runAndHandle(['task', 'reset', filePath], (data: string) => {
        Logger.debug(data)
      })
    }
    catch (error) {
      Logger.error('Error while resetting task: ' + error)
      UiController.showError('Failed to reset task.')
    }
  }

  /**
   * Return a task to TIM
   *
   * @param {string} taskPath - path of the task
   */
  public static async submitTask(taskPath: string, callback: () => any) {
    try {
      this.runAndHandle(['submit', taskPath], (data: string) => {
        Logger.info(data)
        const course: Course =  ExtensionStateManager.getCourseByDownloadPath(path.dirname(path.dirname(taskPath)))
        const taskset = course.taskSets.find(taskSet => taskSet.downloadPath === path.dirname(path.dirname(taskPath)))
        const currentDir = path.dirname(taskPath)
        // Find the names of the tasks ide_task_id and the task set from the files path
        let itemPath = currentDir
        // console.log(path)
        let pathSplit = itemPath.split(path.sep)
        // ide_task_id
        let id = pathSplit.at(-1)
        // task set name
        let demo = pathSplit.at(-2)
        if (demo && id && taskset) {
          const timData : TimData | undefined = ExtensionStateManager.getTaskTimData(taskset.path, demo, id)
          if (timData) {
            this.getTaskPoints(timData.path, timData.ide_task_id, callback)
          } else {
            vscode.window.showErrorMessage('TimData is undefined or invalid.')
          }
        }
      })
    }catch (error) {
      Logger.error('Error while submitting task: ' + error)
      UiController.showError('Failed to submit task.')
    }
  }

  public static async getTaskPoints(taskSetPath: string, ideTaskId: string, callback: any) {
    try {
      vscode.commands.executeCommand('tide.setPointsUpdating')
      await this.runAndHandle(['task', 'points', taskSetPath, ideTaskId, '--json'], (data: string) => {
        Logger.debug(data)
        const points: TaskPoints = JSON.parse(data)
        // TODO: should this be called elsewhere instead?
        ExtensionStateManager.setTaskPoints(taskSetPath, ideTaskId, points)
        vscode.commands.executeCommand('tide.refreshTree')
      })
    } catch (error) {
      Logger.error('Error while fetching task points: ' + error)
      UiController.showError('Failed to fetch task points.')
    }
  }

  /**
   * Executes the process defined in the extension's settings with arguments provided in "args" parameter. calls the function provided as parameter "handler" with the stdout of the executed process passed in as a parameter for the function.
   *
   * @param args - arguments to run the executable with
   * @param handler - a handler function to be called after the executable exits
   */
  private static async runAndHandle(
    args: Array<string>,
    handler: HandlerFunction,
    ignoreErrors: boolean = false,
  ): Promise<void> {
    try {
      const cliOutput = await this.spawnTideProcess(...args)
      if (typeof cliOutput === 'string') {
        await handler(cliOutput)
      }
    } catch (err) {
      if (!ignoreErrors) {
        throw err 
      }
    }
  }

  /**
   * Executes the process defined in the extension's settings.
   *
   * @param args - arguments to be passed to the executable
   * @returns the stdout of the executed process
   */
  private static async spawnTideProcess(...args: Array<string>): Promise<string> {
    Logger.debug(`Running cli with args "${args}"`)
    let buffer = ''
    let errorBuffer = ''

    // Use a copy of process.env to pass custom url to the child process 
    const env_modified = {...process.env}
    
    let customUrl = vscode.workspace.getConfiguration().get('TIM-IDE.customUrl') as string
    if (customUrl && customUrl.trim() !== '') {
      // Ensure that the custom url ends with a slash
      const formattedUrl = customUrl.trim().endsWith('/') ? customUrl.trim() : customUrl.trim() + '/'
      env_modified.URL = formattedUrl
    }
    else {
      env_modified.URL = 'https://tim.jyu.fi/'
    }

    // To run an uncompiled version of the CLI tool:
    // 1. Point the cli tool path in your extension settings to the main.py -file
    //const ar = ["run", "python", vscode.workspace.getConfiguration().get("tide.cliPath") as string, ...args];
    // 2. Edit the value of cwd to match the root directory of the cli tool repository
    //const childProcess = cp.spawn("poetry", ar, { cwd: "/Users/stella/tideproject/tide-cli" });

    const childProcess = cp.spawn(
      vscode.workspace.getConfiguration().get('TIM-IDE.cliPath') as string,
      args,
      {'env' : env_modified}
    )

    childProcess.stdout.on('data', (data) => {
      buffer += data.toString()
    })

    childProcess.stderr.on('data', (data) => {
      errorBuffer = data.toString()
    })

    return new Promise<string>((resolve, reject) => {
      childProcess.on('error', (error) => {
        Logger.error(`Error spawning child process: ${error}`)
        reject(error)
      })

      childProcess.on('exit', (code) => {
        if (code === 0) {
          resolve(buffer)
        } else {
          reject(errorBuffer)
        }
      })
    })
  }
}

type HandlerFunction = (data: string) => void
