/**
 * A panel for displaying task information.
 *
 * @author Hannes Koivusipilä
 * @author Stella Palenius
 * @license MIT
 * @date 2.5.2024
 */
import * as vscode from 'vscode'
import { getDefaultHtmlForWebview, getWebviewOptions } from '../utils'
import ExtensionStateManager, {StateKey} from '../../api/ExtensionStateManager'
import { LoginData, TaskPoints, TimData, WebviewMessage } from '../../common/types'
import path from 'path'
import Tide from '../../api/tide'
import UiController from '../UiController'

export default class TaskPanel {
  public static currentPanel: TaskPanel | undefined

  private static readonly fileNamePrefix = 'TaskPanel'
  private static readonly viewType = 'TaskPanel'
  private static readonly panelTitle = 'Task Panel'

  private readonly panel: vscode.WebviewPanel
  private readonly extensionUri: vscode.Uri
  private disposables: vscode.Disposable[] = []

  private static lastActiveTextEditor: vscode.TextEditor

  public static createOrShow(extensionUri: vscode.Uri) {
    // If we already have a panel, show it.
    if (TaskPanel.currentPanel) {
      TaskPanel.currentPanel.update()
      return
    }

    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
      this.viewType,
      this.panelTitle,
      {
        viewColumn: vscode.ViewColumn.Beside,
        preserveFocus: true,
      },
      getWebviewOptions(extensionUri),
    )
    TaskPanel.currentPanel = new TaskPanel(panel, extensionUri)
    TaskPanel.currentPanel.update()
  }

  public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    TaskPanel.currentPanel = new TaskPanel(panel, extensionUri)
  }

  private updateLoginData(loginData: LoginData) {
    this.sendLoginData()
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this.panel = panel
    this.extensionUri = extensionUri

    // subscribe to changes in login data
    this.disposables.push(
      ExtensionStateManager.subscribe(StateKey.LoginData, this.updateLoginData.bind(this)),
    )

    // Set the webview's initial html content.
    this.update()

    // Listen for when the panel is disposed.
    // This happens when the user closes the panel or when the panel is closed programmatically.
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables)

    // Update the content based on view changes.
    this.panel.onDidChangeViewState(
      (e) => {
        if (this.panel.visible) {
          this.update()
        }
      },
      null,
      this.disposables,
    )

    // Handle messages from the webview.
    this.panel.webview.onDidReceiveMessage(async (msg: WebviewMessage) => {
      switch (msg.type) {
        case 'OnInfo': {
          if (!msg.value) {
            return
          }
          vscode.window.showInformationMessage(msg.value)
          break
        }
        case 'OnError': {
          if (!msg.value) {
            return
          }
          UiController.showError(msg.value)
          break
        }
        case 'SubmitTask': {
          vscode.commands.executeCommand('workbench.action.files.save')
          await Tide.submitTask(path.dirname(TaskPanel.lastActiveTextEditor.document.fileName), this.onSubmitTask.bind(this))
          break
        }
        case 'ShowOutput': {
          vscode.commands.executeCommand('workbench.action.output.toggleOutput')
          vscode.commands.executeCommand('workbench.action.focusFirstEditorGroup')
          break
        }
        case 'ResetExercise': {
          vscode.window
            .showInformationMessage(
              'Are you sure you want to reset exercise? All unsubmitted changes will be lost.',
              'Continue',
              'Cancel',
            )
            .then((answer) => {
              if (answer === 'Continue') {
                let taskSetPath = msg.value.path
                let taskId = msg.value.taskId
                let fileLocation = ExtensionStateManager.getTaskSetDownloadPath(taskSetPath)
                // TODO: proper error handling
                if (fileLocation) {
                  vscode.commands.executeCommand(
                    'tide.resetExercise',
                    taskSetPath,
                    taskId,
                    fileLocation,
                  )
                }
              }
            })
          break
        }
        case 'ResetNoneditableAreas': {
          Tide.resetNoneditableAreas(TaskPanel.lastActiveTextEditor.document.uri.path.toString())
        }
        case 'RequestLoginData': {
          this.sendLoginData()
        }
        case 'UpdateTaskPoints': {
          // TODO: clean up and reorganize and type
          Tide.getTaskPoints(
            msg.value.taskSetPath,
            msg.value.ideTaskId,
            this.sendTaskPoints.bind(this),
          )
        }
      }
    })
  }

  public dispose() {
    TaskPanel.currentPanel = undefined

    // Clean up our resources
    this.panel.dispose()

    while (this.disposables.length) {
      const x = this.disposables.pop()
      if (x) {
        x.dispose()
      }
    }
  }

  public static dispose() {
    if (TaskPanel.currentPanel) {
      TaskPanel.currentPanel.dispose()
    }
  }

  public static updateLastActiveEditor(editor: vscode.TextEditor) {
    this.lastActiveTextEditor = editor
  }

  /**
   *
   */
  private async getTimData(): Promise<TimData | undefined> {
    switch (TaskPanel.lastActiveTextEditor) {
      case undefined: {
        return undefined
      }

      default: {
        try {
          const doc = TaskPanel.lastActiveTextEditor.document
          const currentFile = doc.fileName
          const currentDir = path.dirname(currentFile)
          const taskId = path.basename(currentDir)
          const timDataPath = path.join(path.dirname(path.dirname(currentDir)), '.timdata');
          const timDataContent = await vscode.workspace.fs.readFile(vscode.Uri.file(timDataPath))
          const timDataCourse= JSON.parse(timDataContent.toString())
          const coursePath = Object.keys(timDataCourse.course_parts)[0];
          const timData : TimData= timDataCourse.course_parts[coursePath].tasks[taskId];
          
          return timData
        } catch {
          return undefined
        }
      }
    }
  }

  private async sendLoginData() {
    const loginData = ExtensionStateManager.getLoginData()
    const loginDataMsg: WebviewMessage = { type: 'LoginData', value: loginData }
    await this.panel.webview.postMessage(loginDataMsg)
  }

  private async sendTimData(timData: TimData | undefined) {
    const timDataMsg: WebviewMessage = { type: 'UpdateTimData', value: timData }
    await this.panel.webview.postMessage(timDataMsg)
  }

  private async sendWorkspaceName() {
    const wsNameDataMsg: WebviewMessage = {
      type: 'UpdateWorkspaceName',
      value: vscode.workspace.name,
    }
    await this.panel.webview.postMessage(wsNameDataMsg)
  }

  private sendTaskPoints(points: TaskPoints | undefined) {
    const taskPointsMsg: WebviewMessage = { type: 'TaskPoints', value: points }
    this.panel.webview.postMessage(taskPointsMsg)
  }

  private onSubmitTask() {
    // TODO: logic for informing about success/failure while submitting task
    const msg: WebviewMessage = { type: 'SubmitResult', value: true}
    this.panel.webview.postMessage(msg)
  }

  private async update() {
    const webview = this.panel.webview
    this.panel.webview.html = this.getHtmlForWebview(webview)
    // The order of calling the functions below seems to matter for magical reasons.
    const timData: TimData | undefined = await this.getTimData()
    await this.sendLoginData()
    await this.sendWorkspaceName()
    if (timData !== undefined) {
      this.sendTimData(timData)

      const taskPoints = ExtensionStateManager.getTaskPoints(timData.path, timData.ide_task_id)
      this.sendTaskPoints(taskPoints)
    }
  }

  private getHtmlForWebview(webview: vscode.Webview) {
    return getDefaultHtmlForWebview(webview, this.extensionUri, TaskPanel.fileNamePrefix)
  }
}
