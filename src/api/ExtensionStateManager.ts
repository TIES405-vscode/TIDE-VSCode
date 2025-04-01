/**
 * Manages the global state for the extension.
 *
 * This class handles storing and retrieving various states such as download paths,
 * course data, and login information in the VSCode global state. It also allows
 * for subscribing to changes in specific state keys.
 *
 * @author Hannes Koivusipilä
 * @author Stella Palenius
 * @license MIT
 * @date 27.3.2024
 */

import * as vscode from 'vscode'
import Logger from '../utilities/logger'
import { Course, CourseStatus, LoginData, TaskPoints, TimData, UserData } from '../common/types'
import path from 'path'
import * as fs from 'fs'

export default class ExtensionStateManager {
  private static globalState: vscode.Memento & {
    setKeysForSync(keys: readonly string[]): void
  }

  private static KEY_PREFIX = 'tide'

  static setContext(ctx: vscode.ExtensionContext) {
    this.globalState = ctx.globalState
  }

  /**
   * Sets the courses data in the global state.
   * @param courses - An array containing the course data to be stored.
   */
  public static setCourses(courses: Array<Course>) {
    this.writeToGlobalState(StateKey.Courses, courses)
  }

  /**
   * Retrieves courses data from global state.
   * @returns Courses from the global state.
   */
  public static getCourses(): Array<Course> {
    return this.readFromGlobalState(StateKey.Courses)
  }

  /**
   * Sets the login data in the global state
   *
   * @static
   * @param {LoginData} loginData - the data to be saved
   */
  public static setLoginData(loginData: LoginData) {
    this.writeToGlobalState(StateKey.LoginData, loginData)
  }

  /**
   * Retrieves login data from global state
   *
   * @static
   * @returns {LoginData} LoginData saved to the global state
   */
  public static getLoginData(): LoginData {
    return this.readFromGlobalState(StateKey.LoginData)
  }

  /**
   * Sets user data to global state
   * @param loggedInUserData UserData saved to the global state
   */
  public static setUserData(loggedInUserData: UserData) {
    this.writeToGlobalState(StateKey.UserData, loggedInUserData)
  }

  /**
   * Retrieves user data from global state
   * @returns User Data saved to the global state
   */
  public static getUserData(): UserData {
    return this.readFromGlobalState(StateKey.UserData)
  }

  /**
   * Sets the download path for a specific task set path in the Global State.
   * @param taskSetPath - The path of the task set.
   * @param downloadPath - The path where the task set will be downloaded.
   */
  static setTaskSetDownloadPath(taskSetPath: string, downloadPath: string) {
    const courses: Array<Course> = this.readFromGlobalState(StateKey.Courses)
    courses.forEach((course) => {
      course.taskSets.forEach((taskSet) => {
        if (taskSet.path === taskSetPath) {
          taskSet.downloadPath = downloadPath
        }
      })
    })
    this.writeToGlobalState(StateKey.Courses, courses)
  }

  /**
   * Retrieves the download path for a specific task set path from the Global State.
   * @param taskSetPath - The path of the task set.
   * @returns The download path stored for the specified task set path.
   */
  static getTaskSetDownloadPath(taskSetPath: string): string | undefined {
    const courses: Array<Course> = this.readFromGlobalState(StateKey.Courses)
    const downloadPath = courses
      .flatMap((course) => course.taskSets)
      .find((taskSet) => taskSet.path === taskSetPath)?.downloadPath
    return downloadPath
  }

  static setCourseStatus(id: number, status: CourseStatus) {
    const courses: Array<Course> = this.readFromGlobalState(StateKey.Courses)
    const courseIdx = courses.findIndex((course) => course.id === id)
    courses[courseIdx].status = status
    this.writeToGlobalState(StateKey.Courses, courses)
  }

  static setTaskPoints(taskSetPath: string, ideTaskId: string, taskPoints: TaskPoints) {
    // TODO: This could be a hashmap
    let taskPointsData = this.readFromGlobalState(StateKey.TaskPoints)
    if (taskPointsData === undefined) {
      taskPointsData = {}
    }
    if (taskPointsData[taskSetPath] === undefined) {
      taskPointsData[taskSetPath] = {}
    }
    taskPointsData[taskSetPath][ideTaskId] = taskPoints
    this.writeToGlobalState(StateKey.TaskPoints, taskPointsData)
  }

  static getTaskPoints(taskSetPath: string, ideTaskId: string): TaskPoints | undefined {
    // const taskPoints = this.readFromGlobalState('taskPoints')
    const taskPoints = this.readFromGlobalState(StateKey.TaskPoints)
    if (taskPoints === undefined) {
      return undefined
    }
    try {
      console.log("reading points")
      let pointsData = taskPoints[taskSetPath][ideTaskId]
      console.log(pointsData)
      return pointsData
    } catch (error) {
      console.log(error)
      return {current_points : 0}
    }
    
  }

  // This is for learning purposes only
  static getAllTaskPoints(): TaskPoints |undefined {
    const taskPoints = this.readFromGlobalState(StateKey.TaskPoints)
    return taskPoints
  }


  /**
   * Updates the timdata of a course, this should be called after downloading a new task set from tim, since it will modify the old .timdata file
   * @param taskSetPath This path and the downloadpath the user has set are used to find the new .timdata file, which is then saved
   * @returns 
   */
  static updateTimData(taskSetPath: string) {
    let rootDir: string | undefined = vscode.workspace.getConfiguration().get('TIM-IDE.fileDownloadPath')
    if (rootDir == undefined) {
      vscode.window.showErrorMessage("Error while reading fileDownloadPath. Edit fileDownloadPath in Settings!")
    } else {
        // Find the path to the new .timdata file
        const taskSetPathSplit = taskSetPath.split(path.posix.sep)
        const pathToTimDataDir = path.join(rootDir, taskSetPathSplit[1])
        const pathToTimDataFile = path.join(pathToTimDataDir, '.timdata')
        ExtensionStateManager.readAndSaveTimData(pathToTimDataFile)
    }
  }

  /**
   * Read a .timdata file and save a TimData object for each task (demo) found in the file
   * @param filePath path to a .timdata file
   */ 
  static readAndSaveTimData(filePath: string) {
    try {
        // Read the timdata object from the file
        const timDataRaw = fs.readFileSync(filePath)
        const timData = JSON.parse(timDataRaw.toString())
        
        //console.log(timData)

        // course_parts includes all task sets (demos)
        let courseParts = Object.keys(timData.course_parts)
        courseParts.forEach(demo => {
          let taskData = timData.course_parts[demo].tasks
          let keys = Object.keys(taskData)
          keys.forEach(element => {
              // Save each task as separate objects into TimData
              const newTimData : TimData = timData.course_parts[demo].tasks[element]
              ExtensionStateManager.addTimData(newTimData)
          })
        })          
    } catch (err) {
        console.log(err)
    }
  }

  /**
   * Add a new TimData object (a Task parsed from a .timdata file)
   * Each Task in Tim data is saved for later use as an Array of TimData objects:
   * [{.timData task object}, {.timData task object}, ...]
   * Only the tasks data (each task as one object) is saved from the .timdata files
   * Duplicate TimData objects are not saved
   * TODO: Is it necessary to update old TimData objects when a possible duplicate is found?
   * @param timData a TimData object (a task in a .timdata file)
   */
  static addTimData(timData: TimData) {

    let allTimData : Array<TimData> = this.readFromGlobalState(StateKey.TimData)
    let save = true
    if (allTimData === undefined) {
      allTimData = []
    }

    allTimData.forEach(element => {
      // If an element has the same ide_task_id and path it is the same unique timdata object -> dont save a duplicate
      if (element.ide_task_id === timData.ide_task_id && element.path === timData.path) {
        save = false
      }
    })

    // Only save timdata if it's not a dublicate
    if (save) {
      allTimData.push(timData)      
      this.writeToGlobalState(StateKey.TimData, allTimData)
    }    
  }

  /**
   * Get all TimData
   * @returns All TimData saved to globalstate
   */
  static getTimData(): Array<TimData> {
    const allTimData: Array<TimData> = this.readFromGlobalState(StateKey.TimData)
    if (allTimData) {
      return allTimData
    } else {
      return []
    }
  }

  /**
   * Get a TimData object
   * @param demoName Name of the Demo that the TimData task is a part of
   * @param taskId Task id of the TimData task
   * @returns a unique TimData object with the given parameters, undefined is one is not found using the given parameters
   */
  static getTaskTimData(demoName: string, taskId: string): TimData | undefined{
    let timData = undefined
    const allTimData: Array<TimData> = this.readFromGlobalState(StateKey.TimData)
    allTimData.forEach(element => {
      // Find a timdata object with the given taskId
      if (element.ide_task_id === taskId) {
        // Make sure the task set is correct
        let pathParts = element.path.split(path.posix.sep)
        let demo = pathParts.at(-1)
        if (demoName == demo) {
          timData = element
        }        
      }
      })
      return timData
  }

  static reset() {
    // let key: keyof typeof StateKey
    // for (key in StateKey) {
    //   Logger.debug(`Reseting globalState: "${this.prefixedKey(key)}" `)
    //   this.globalState.update(this.prefixedKey(key), undefined)
    // }
    this.writeToGlobalState(StateKey.Courses, undefined)
    this.writeToGlobalState(StateKey.LoginData, undefined)
    this.writeToGlobalState(StateKey.TaskPoints, undefined)
    this.writeToGlobalState(StateKey.DownloadPath, undefined)
    this.writeToGlobalState(StateKey.TimData, undefined)
  }

  /**
   * Forms a string with the prefix prepended
   *
   * @static
   * @param {string} key - the rest of the key
   * @returns {string} Prefixed key
   */
  private static prefixedKey(key: string): string {
    return `${this.KEY_PREFIX}.${key}`
  }

  /**
   * Writes a value to global state and notifies listeners subscribed to the key.
   *
   * @static
   * @param {string} key - Key to write to
   * @param {string} value - Value to write
   */
  private static writeToGlobalState(key: StateKey, value: any) {
    Logger.debug(`Writing to globalState: "${this.prefixedKey(key)}": `, value)
    this.globalState.update(this.prefixedKey(key), value)
    this.notifySubscribers(key, value)
  }

  /**
   * Reads a value saved to the globalState
   *
   * @static
   * @param {string} key - Key of the value queries
   * @returns {string} value matching the key or an empty string if key doesn't exist
   */
  private static readFromGlobalState(key: StateKey): any {
    const prefixedKey = this.prefixedKey(key)
    const value: any = this.globalState.get(prefixedKey)
    Logger.debug(`Found the following value from key "${prefixedKey}"`, value)
    return value
  }

  // Observer stuff starts here
  private static subscribers: Array<SubscriptionObject> = []

  /**
   * Subscribe to listen to changes on the value of a given key. Calls the NotifyFunction with current value.
   *
   * @static
   * @param {string} key - Key to listen to
   * @param {NotifyFunction} onValueChange - Callback function to call when a change happens
   * @returns {vscode.Disposable} A function for unsubscribing
   */
  public static subscribe(key: StateKey, onValueChange: NotifyFunction): vscode.Disposable {
    Logger.debug(`Someone subscribed to ${key}`)
    const subscriptionObject: SubscriptionObject = { key, onValueChange }
    this.subscribers.push(subscriptionObject)
    const disposableObject = {
      dispose: () => {
        ExtensionStateManager.unsubscribe(subscriptionObject)
      },
    }

    // TODO: is it necessary to send the value of a key when subscribing to it?
    onValueChange(this.readFromGlobalState(key))

    return vscode.Disposable.from(disposableObject)
  }

  /**
   * Unsubscribe a SubscriptionObject
   *
   * @static
   * @param {SubscriptionObject} subscriptionObject - SubscriptionObject to remove
   */
  static unsubscribe(subscriptionObject: SubscriptionObject) {
    Logger.debug(`Someone unsubscribed from ${subscriptionObject.key}`)
    this.subscribers = this.subscribers.filter((subscriber) => subscriber !== subscriptionObject)
  }

  /**
   * Calls the callback function of a key's subscribers with the new value as parameter.
   *
   * @static
   * @param {string} key - The key whose subscribers are notified
   * @param {string} value - The new value of the key
   */
  private static notifySubscribers(key: StateKey, value: unknown) {
    Logger.debug('Notifying subscribers of the following new value', key, value)
    this.subscribers
      .filter((subscriber) => subscriber.key === key)
      .forEach((subscriber) => subscriber.onValueChange(value))
  }
}

/**
 * Represents the data required for subscribing to the ExtensionStateManager
 *
 * @interface SubscriptionObject
 * @field {string} key - The key to listen to
 * @field {NotifyFunction} onValueChange - The function to call when the value of the key is changed
 */
interface SubscriptionObject {
  key: string
  onValueChange: NotifyFunction
}

interface NotifyFunction {
  (newValue: any): void
}


// type StateKey = 'courses' | 'loginData' | 'taskPoints'
export enum StateKey {
  Courses = 'courses',
  DownloadPath = 'downloadPath',
  LoginData = 'loginData',
  UserData = 'userData',
  TaskPoints = 'taskPoints',
  TimData = 'timData'
}
