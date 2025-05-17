/**
 * Registers event listeners for the TIDE VSCode extension.
 *
 * @author Hannes Koivusipilä
 * @author Stella Palenius
 * @license MIT
 * @date 2.5.2024
 */

import * as vscode from 'vscode'
import Logger from '../utilities/logger'

export function registerEventListeners(ctx: vscode.ExtensionContext) {

  /**
   * Listens to changes in configuration.
   */
  vscode.workspace.onDidChangeConfiguration((event) => 
  {
    if (event.affectsConfiguration('TIM-IDE.fileDownloadPath')) 
    {
      // Get the new value of fileDownloadPath
      const newPath = vscode.workspace.getConfiguration().get('TIM-IDE.fileDownloadPath')
      if (typeof newPath !== 'string') 
      {
        Logger.warning('Undefined download path')
      }
    }
  })
}