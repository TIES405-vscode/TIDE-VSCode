import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import ExtensionStateManager from '../../api/ExtensionStateManager'
import UiController from '../UiController'


// Class for handling TreeView data
export class CourseTaskProvider implements vscode.TreeDataProvider<CourseTaskTreeItem> {

    // course_data holds the parent nodes for each course
    // each parent node holds the directories and tasks of the courses as children
    private course_data: CourseTaskTreeItem [] = []

    // with the vscode.EventEmitter we can refresh our  tree view
    private m_onDidChangeTreeData: vscode.EventEmitter<CourseTaskTreeItem | undefined> = new vscode.EventEmitter<CourseTaskTreeItem | undefined>()
    // // and vscode will access the event by using a readonly onDidChangeTreeData (this member has to be named like here, otherwise vscode doesnt update our treeview.
    readonly onDidChangeTreeData ? : vscode.Event<CourseTaskTreeItem | undefined> = this.m_onDidChangeTreeData.event

    // Register commands required to handle the treeview
    constructor() {
        // Treeview commands
        vscode.commands.registerCommand('tide.item_clicked', item => this.item_clicked(item))
        vscode.commands.registerCommand('tide.refreshTree', () => this.refreshTree())
        vscode.commands.registerCommand('tide.wipeTreeAndEditors', () => this.wipeTreeAndEditors())

        // Context menu commands (right-click menu)
        vscode.commands.registerCommand('tide.treeview_menu_open_tasks', item => this.open_tasks_in_this_dir(item))
    }

    // Empty treeview and close files after a user logs out
    private async wipeTreeAndEditors() {
        this.course_data = []
        this.m_onDidChangeTreeData.fire(undefined)

        // Closes open editors
        const tabGroups = vscode.window.tabGroups.all
        tabGroups.forEach(async group => {
            await vscode.window.tabGroups.close(group)
                })

        UiController.closeTaskPanel()
    }

    // Opens all tasks found in the children of the given item
    private open_tasks_in_this_dir(item: CourseTaskTreeItem) {
        let currentItem = item
        // item might be a dir or a file
        if(currentItem.type == "dir") {
            currentItem.children.forEach(child => {
                this.open_tasks_in_this_dir(child)
            })
        } else {
            try {
                // Open the document
                vscode.workspace.openTextDocument(item.path).then( document => {

                    // Using this we can open multiple files on the same window
                    const showOptions: vscode.TextDocumentShowOptions = {
                        preserveFocus: false,
                        preview: false
                    }
                    // Open the document in the editor
                    vscode.window.showTextDocument(document, showOptions).then( editor => {
                        // first 2 rows are informational, task code starts at row 3(index 2)
                        let pos = new vscode.Position(2,0)
                        // set cursos
                        editor.selection = new vscode.Selection(pos,pos)
                        // set focus to opened editor
                        editor.revealRange(new vscode.Range(pos,pos))
                    })
                })
            } catch {
                vscode.window.showErrorMessage("Error opening documents. Refreshing treeview")
                this.refreshTree()
            }
            
        }
    }
    
    // Refresh the treeview with courses inside File Download Path in settings
    private refreshTree() {
        let loginData = ExtensionStateManager.getLoginData()
        // console.log(loginData)
        if (loginData.isLogged) {
            this.course_data = []
            this.read_root_directory()
            this.m_onDidChangeTreeData.fire(undefined)
        } else {
            vscode.window.showErrorMessage("Login to browse courses and tasks!")
        }
    }

    // Reads downloaded course directories, creates the parent nodes into course_data,
    // and starts reading each courses contents with the recursive function read_course_directory
    private read_root_directory() {
        let rootDir: string | undefined = vscode.workspace.getConfiguration().get('TIM-IDE.fileDownloadPath')
        // Check that the user has set a download path
        if (rootDir == undefined) {
            vscode.window.showErrorMessage("Error while reading fileDownloadPath. Edit fileDownloadPath in Settings!")
        } else {
            // Check that the path exists
            if (this.pathExists(rootDir)) {
                // Find all files and directories in the given path
                fs.readdirSync(rootDir).forEach(element => {
                    // console.log("Reading main course dir")
                    // console.log(element)
                    let current = path.join(rootDir,element)
                    if (fs.statSync(current).isFile()) {
                        // console.log("Found file instead of course dir!")
                    } else {
                        if (current.endsWith('.vscode')) {
                            // skip
                        } else {
                            this.course_data.push(new CourseTaskTreeItem(element, current, "dir"))
                            this.read_course_directory(current, this.course_data.at(-1))
                        }
                    }
                })
            }
        }
    }

    // Reads the given path and adds found files and directories as the given parents children
    // recursively until all nodes have been added
    private read_course_directory(dir: string, parent: CourseTaskTreeItem | undefined) {
        if (dir == undefined) {
            vscode.window.showErrorMessage("Error while reading course path!")
        } else if (parent == undefined) {
            vscode.window.showErrorMessage("Error reading course directory: Undefined parent")
        } else {
            let courseDirPath: string = dir
            // Find all elements in the directory
            if (this.pathExists(courseDirPath)) {
                fs.readdirSync(courseDirPath).forEach(element => {
                    // console.log("Reading course items")
                    // console.log(element)
                    let current = path.join(courseDirPath,element)
                    // If the current element is a file, add it to the parents children and stop the recursion
                    if (fs.statSync(current).isFile()) {
                        // console.log("Found file!")
                        // console.log(element)
                        if (current.endsWith('.timdata')) {
                            // skip
                        } else {
                            let newNode = new CourseTaskTreeItem(element, current, "file")
                            parent.add_child(newNode)
                        }
                    // If the current element is a directory, add it to the parents children and continue the recursion
                    } else {
                        // console.log("Found dir!")
                        // console.log(element)
                        if (current.endsWith('.vscode')) {
                            // skip
                        } else {
                            let newNode = new CourseTaskTreeItem(element, current, "dir")
                            parent.add_child(newNode)
                            this.read_course_directory(current, newNode)
                        }
                    }
                })
            }
        }
    }

    // Checks if a given path exists
    // Returns true if succeeds, false on error
    private pathExists(p: string): boolean {
        try {
            fs.accessSync(p)
        } catch (err) {
            return false
        }
        return true
        }

    // Handles clicks on treeview items
    public item_clicked(item: CourseTaskTreeItem) {

        // Try to open the document
        try {
            // When a dir is clicked do nothing
        if (item.type == "dir") {
            return
        }
        // When a file is clicked
        // Open the document
        vscode.workspace.openTextDocument(item.path).then( document => {
            // After opening the document
            vscode.window.showTextDocument(document).then( editor => {
                // first 2 rows are informational, task code starts at row 3(index 2)
                let pos = new vscode.Position(2,0)
                // set cursos
                editor.selection = new vscode.Selection(pos,pos)
                // set focus to opened editor
                editor.revealRange(new vscode.Range(pos,pos))
            })
        })
        } catch (error){
            // Catch errors trying to open a document and refresh tree
            vscode.window.showErrorMessage("Error, document might be deleted. Refreshing...")
            this.refreshTree()
        }
        
    }

    // we need to implement getTreeItem to receive items from our tree view
    public getTreeItem(item: CourseTaskTreeItem): vscode.TreeItem|Thenable<vscode.TreeItem> {
        let title = item.label? item.label.toString() : ""
        let result = new vscode.TreeItem(title, item.collapsibleState)
        result.command = {
            command : 'tide.item_clicked',
            title : title,
            arguments: [item]
        }
        return result
    }

    // and getChildren
    public getChildren(element : CourseTaskTreeItem | undefined): vscode.ProviderResult<CourseTaskTreeItem[]> {
        if (element === undefined) {
            return this.course_data
        } else {
            return element.children
        }
    }
}

// Class for handling the treeview items
class CourseTaskTreeItem extends vscode.TreeItem {

    readonly path: string
    readonly type: string | undefined

    // children represent branches, which are also items 
    public children: CourseTaskTreeItem[] = []
    
    // the label represent the text which is displayed in the tree
    // and is passed to the base class
    // path = path to file or dir
    // type = type of item (file or dir)
    constructor(label: string, path: string, type: "file" | "dir") {
        super(label)
        this.path = path
        this.type = type
        if (this.type === "file") {
            this.collapsibleState = vscode.TreeItemCollapsibleState.None
        } else {
            this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded
        }
    }

    // a public method to add childs, and with additional branches
    // we want to make the item collabsible
    public add_child (child : CourseTaskTreeItem) {
        // this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed
        this.children.push(child)
    }
}