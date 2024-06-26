/**
 * Registers event listeners for the TIDE VSCode extension.
 *
 * @author Hannes Koivusipilä
 * @author Stella Palenius
 * @license MIT
 * @date 2.5.2024
 */

import * as vscode from 'vscode'
import ExtensionStateManager from '../api/ExtensionStateManager'
import Logger from '../utilities/logger'
import UiController from '../ui/UiController'
import TaskPanel from '../ui/panels/TaskPanel'

export function registerEventListeners(ctx: vscode.ExtensionContext) {
  let lastActiveEditor: vscode.TextEditor | undefined

  /**
   * Listens to changes of active text editor.
   * Last active editor check ensures that if user closes taskpanel it won't open again
   * when user activates or clicks the text document next to it right after closing.
   * If they click another text document open, the task panel opens.
   */
  const textEditorListener = vscode.window.onDidChangeActiveTextEditor(
    async (editor) => {
      if (editor && editor !== lastActiveEditor) {
        if (editor.document && editor.document.uri.scheme === 'file') {
          lastActiveEditor = editor

          // TODO: Duplicate data, turn this in to a class and let TaskPanel query the editor here
          TaskPanel.updateLastActiveEditor(lastActiveEditor)

          // TODO: Do not open the task panel if .timdata is not present in the same directory (might get annoying if you use vscode for things other than programming courses)
          UiController.showTaskPanel()
        }
      }
    },
  )
  ctx.subscriptions.push(textEditorListener)

  /**
   * Listens to changes in configuration.
   */
  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('TIM-IDE.fileDownloadPath')) {
      // Get the new value of fileDownloadPath
      const newPath = vscode.workspace
        .getConfiguration()
        .get('TIM-IDE.fileDownloadPath')

      // Update ExtensionStateManager with the new path
      // TODO: Why is the download path stored in ExtensionStateManager?
      if (typeof newPath === 'string') {
        ExtensionStateManager.setDownloadPath(newPath)
      } else {
        // Handle invalid or undefined newPath
        Logger.warning('Undefined download path')
      }
    }
  })
}
