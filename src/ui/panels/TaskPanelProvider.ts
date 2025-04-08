import * as vscode from 'vscode'
import ExtensionStateManager, { StateKey } from '../../api/ExtensionStateManager'
import getCourseByTasksetPath from '../../api/ExtensionStateManager'
import { LoginData, TaskPoints, WebviewMessage, TimData, Course } from '../../common/types'
import { getDefaultHtmlForWebview } from '../utils'
import Tide from '../../api/tide'
import path from 'path'
import UiController from '../UiController'
import Logger from '../../utilities/logger'

/**
 * Provides the TaskPanel menu in the extension's sidebar.
 */
export class TaskPanelProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView
    private static activeTextEditor?: vscode.TextEditor

    constructor(private readonly _extensionUri: vscode.Uri) {
        ExtensionStateManager.subscribe(StateKey.LoginData, this.sendLoginData.bind(this))
        ExtensionStateManager.subscribe(StateKey.TaskPoints, this.getTaskPoints.bind(this))

        vscode.window.onDidChangeActiveTextEditor(async (editor) => {
            TaskPanelProvider.activeTextEditor = editor
            if (editor) {
                const timData = await this.getTimData()
                this.sendTimData(timData)
                if (timData?.path && timData?.ide_task_id) {
                    this.sendTaskPoints(ExtensionStateManager.getTaskPoints(timData.path, timData.ide_task_id))
                }
            } else {
                this.sendTimData(undefined)
            }
        });

        // Listen for changes in the customUrl setting
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('TIM-IDE.customUrl')) {
                this.sendCustomUrl()
            }
        });

        this.sendCustomUrl()
    }

    resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        }
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview)

        webviewView.webview.onDidReceiveMessage(this.handleWebviewMessage.bind(this))
        this.sendLoginData();
        this.sendCustomUrl();
    }

    /**
     * Handles messages received from the webview.
     */
    private async handleWebviewMessage(msg: WebviewMessage) {
        switch (msg.type) {
            case 'OnInfo':
                msg.value && vscode.window.showInformationMessage(msg.value)
                break
            case 'OnError':
                msg.value && UiController.showError(msg.value)
                break
            case 'RequestLoginData':
                this.sendLoginData()
                break
            case 'CustomUrl':
                this.sendCustomUrl()
                break
        }
    }

    /**
     * Sends login data to the webview.
     */
    private async sendLoginData() {    
        const loginData = ExtensionStateManager.getLoginData()
        await this._view?.webview.postMessage({ type: 'LoginData', value: loginData })
    }

    private async getTaskPoints(){
        const timData = await this.getTimData()
        if (timData?.path && timData?.ide_task_id) {
            this.sendTaskPoints(ExtensionStateManager.getTaskPoints(timData.path, timData.ide_task_id))
        }
    }

    /**
     * Sends task points to the webview.
     */
    private sendTaskPoints(points: TaskPoints | undefined) {
        this._view?.webview.postMessage({ type: 'TaskPoints', value: points })
    }

    /**
     * Sends custom Url from the settings
     * Use default address "https://tim.jyu.fi/", if customUrl is empty
     */
    private sendCustomUrl() {
        let customUrl = vscode.workspace.getConfiguration().get("TIM-IDE.customUrl")
        if (!customUrl) {
            customUrl = "https://tim.jyu.fi/";
        }
        this._view?.webview.postMessage({ type: "CustomUrl", value: customUrl})
        console.log(customUrl)
    }

    /**
     * Retrieves TIM data for the active text editor.
     */
    private async getTimData(): Promise<TimData | undefined> {
        if (!TaskPanelProvider.activeTextEditor) return undefined;

        try {
            const doc = TaskPanelProvider.activeTextEditor.document
            const course: Course =  ExtensionStateManager.getCourseByDownloadPath(path.dirname(path.dirname(doc.fileName)))
            const taskset = course.taskSets.find(taskSet => taskSet.downloadPath === path.dirname(path.dirname(doc.fileName)))
            const currentDir = path.dirname(doc.fileName)
            // Find the names of the tasks ide_task_id and the task set from the files path
            let itemPath = currentDir
            // console.log(path)
            let pathSplit = itemPath.split(path.sep)
            // ide_task_id
            let id = pathSplit.at(-1)
            // task set name
            let demo = pathSplit.at(-2)
            if (demo && id && taskset) {
                return(ExtensionStateManager.getTaskTimData(taskset.path, demo, id))
            }
        } catch {
            return undefined
        }
    }

    /**
     * Sends TIM data to the webview.
     */
    private async sendTimData(timData: TimData | undefined) {
        await this._view?.webview.postMessage({ type: 'UpdateTimData', value: timData })
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return getDefaultHtmlForWebview(webview, this._extensionUri, 'TaskPanel')
    }

    public revive(panel: vscode.WebviewView) {
        this._view = panel
    }
}