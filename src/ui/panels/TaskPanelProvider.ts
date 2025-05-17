import * as vscode from 'vscode'
import ExtensionStateManager, { StateKey } from '../../api/ExtensionStateManager'
import Formatting from '../../common/formatting'
import { LoginData, TaskPoints, WebviewMessage, TimData, Course } from '../../common/types'
import { getDefaultHtmlForWebview } from '../utils'
import Tide from '../../api/tide'
import path from 'path'
import UiController from '../UiController'

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
        })

        // Listen for changes in the customUrl setting
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('TIM-IDE.customUrl')) {
                this.sendCustomUrl()
            }
        })

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
        this.sendLoginData()
        this.sendCustomUrl()

        // Check if the command has already been registered
        vscode.commands.getCommands(true).then(
            (registeredCommands: string[]) => {
                if (!registeredCommands.includes('tide.setPointsUpdating')) {
                    vscode.commands.registerCommand('tide.setPointsUpdating', () => {
                        this.setPointsUpdating()
                    })
                }
            },
            (err) => {
                vscode.window.showErrorMessage('Could not get registered command:', err)
            }
        )
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
            case 'UpdateTaskPoints':
                Tide.getTaskPoints(msg.value.taskSetPath, msg.value.ideTaskId, this.sendTaskPoints.bind(this))
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

    private async setPointsUpdating(){
        await this._view?.webview.postMessage({ type: 'SetPointsUpdating', value: true })
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
        let customUrl = vscode.workspace.getConfiguration().get('TIM-IDE.customUrl')
        if (!customUrl) {
            customUrl = 'https://tim.jyu.fi/'
        }
        this._view?.webview.postMessage({ type: 'CustomUrl', value: customUrl})
    }

    /**
     * Retrieves TIM data for the active text editor.
     */
    private async getTimData(): Promise<TimData | undefined> {
        if (!TaskPanelProvider.activeTextEditor) {return undefined}

        try {
            const doc = TaskPanelProvider.activeTextEditor.document
            return(ExtensionStateManager.getTimDataByFilepath(doc.fileName))
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