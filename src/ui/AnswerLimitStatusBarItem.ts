import * as vscode from 'vscode'
import { Course, TimData } from '../common/types'
import path from 'path'
import ExtensionStateManager from '../api/ExtensionStateManager'
import Formatting from '../common/formatting'

/**
 * Class for Status Bar item displaying answer limit related information
 * to users when loading tasks that have set answer_limit value in TIM.
 */
export default class AnswerLimitStatusBarItem {
    readonly name: string = 'Answer limit for current task'
    readonly text: string = '$(tim-font-icon) Limited number of submissions allowed'
    private answerLimit?: number | null
    readonly tooltip: string = 'This task can only be submitted to TIM a limited number of times.\nAfter all tries have run out, you can no longer get more points by\nsubmitting the answer to TIM.\nCheck TIM task page to see how many attempts have been used.'
    private statusBarItem: vscode.StatusBarItem
    private static activeEditor?: vscode.TextEditor

    constructor(alignment: vscode.StatusBarAlignment, priority: number) {
        this.statusBarItem = vscode.window.createStatusBarItem(alignment, priority)
        this.statusBarItem.text = this.text
        this.statusBarItem.name = this.name
        this.statusBarItem.tooltip = this.tooltip
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground')

        /**
         * Event listener for determining whether to display answer limit warning
         * based on timdata. This segment is adapted from TaskPanelProvider.ts
         */
        vscode.window.onDidChangeActiveTextEditor(async (editor) => {
            AnswerLimitStatusBarItem.activeEditor = editor
            if (editor) {
                const timData = await this.getTimData()
                timData?.answer_limit ? this.statusBarItem.show() : this.statusBarItem.hide()
                this.answerLimit = timData?.answer_limit
                this.statusBarItem.tooltip = this.tooltip + `\nThis exercise has limit of ${this.answerLimit} submissions.`
            }
            else {
                this.statusBarItem.hide()
            }
        })
    }

    show(): void {
        this.statusBarItem.show()
    }
    hide(): void {
        this.statusBarItem.hide()
    }
    dispose(): void {
        this.statusBarItem.dispose()
    }

    // The following is taken from TaskPanelProvider.ts - Possible refactoring needed
    /**
    * Retrieves TIM data for the active text editor.
    */
    private async getTimData(): Promise<TimData | undefined> {
        if (!AnswerLimitStatusBarItem.activeEditor) {return undefined}

        try {
            const doc = AnswerLimitStatusBarItem.activeEditor.document
            return(ExtensionStateManager.getTimDataByFilepath(doc.fileName))
        } catch {
            return undefined
        }
    }

}