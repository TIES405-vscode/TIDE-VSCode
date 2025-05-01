import * as vscode from 'vscode'
import { Course, TimData } from '../common/types'
import path from 'path'
import ExtensionStateManager from '../api/ExtensionStateManager'

/**
 * Class for Status Bar item displaying answer limit related information
 * to users when loading tasks that have set answer_limit value in TIM.
 */
export default class AnswerLimitStatusBarItem {
    readonly name: string = 'Answer limit for current task'
    readonly text: string = '$(alert) Limited number of submissions allowed'
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
            const course: Course =  ExtensionStateManager.getCourseByDownloadPath(path.dirname(path.dirname(doc.fileName)))
            const taskset = course.taskSets.find(taskSet => taskSet.downloadPath === path.dirname(path.dirname(doc.fileName)))
            const currentDir = path.dirname(doc.fileName)
            // Find the names of the tasks ide_task_id and the task set from the files path
            let itemPath = currentDir
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

}