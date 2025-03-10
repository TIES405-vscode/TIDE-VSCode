import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import ExtensionStateManager from '../../api/ExtensionStateManager'
import UiController from '../UiController'
import { TimData } from '../../common/types'


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
                            this.course_data.push(new CourseTaskTreeItem("Course: " + element, current, "dir"))
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
                            // Save the tim data for the extension to use later
                            // console.log("Found timData!")
                            // console.log(current)

                            this.readAndSaveTimData(current)

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

    /**
     * Read a .timdata file and save tasks objects found
     * @param filePath path to the .timdata file about to be read
     */
    private async readAndSaveTimData(filePath: string) {
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
                    ExtensionStateManager.setTimData(newTimData)
                })
            })

            /* // Create an Array of the tasks in .timdata
            const taskData = timData.course_parts[coursePath].tasks
            let keys = Object.keys(taskData)
            // And save each task object to TimData
            keys.forEach(element => {
                const newTimData : TimData = timData.course_parts[coursePath].tasks[element]
                ExtensionStateManager.setTimData(newTimData)
            })  */           
        } catch (err) {
            console.log(err)
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
        let iconPath = path.join(__filename, '..', '..', '..', '..', 'media', 'status-red.svg')
        // This finally showed the icon
        // TODO: Logic for choosing the right icon
        console.log("getting treeview item")
        if (item.type == 'file') {
            // Find the names of the tasks ide_task_id and the task set from the files path
            let itemPath = item.path
            // console.log(path)
            let pathSplit = itemPath.split(path.sep)
            // ide_task_id
            let id = pathSplit.at(-2)
            // task set name
            let demo = pathSplit.at(-3)
            // console.log(id)
            // console.log(demo)

            // Find the points data of this task file from ExtensionStateManager
            if (id && demo) {
                const timData : TimData | undefined = ExtensionStateManager.getTaskTimData(demo, id)
                if (timData) {
                    // Task Max points
                    let maxPoints = timData.max_points
                    if (maxPoints == null) {
                        maxPoints = 0
                    }
                    if (maxPoints == 0) {
                        iconPath = ""
                    } else {
                        // Current task points
                        const currentPoints = ExtensionStateManager.getTaskPoints(timData.path, timData.ide_task_id)
                        if (maxPoints && currentPoints && currentPoints.current_points) {
                            // Maximum points received from the task
                            if (currentPoints?.current_points == maxPoints) {
                                iconPath = path.join(__filename, '..', '..', '..', '..', 'media', 'status-green.svg')
                                // Some points received from the task
                            } else if (currentPoints?.current_points > 0) {
                                iconPath = path.join(__filename, '..', '..', '..', '..', 'media', 'status-yellow.svg')
                                // Zero points received from the task
                            } else {
                                iconPath = path.join(__filename, '..', '..', '..', '..', 'media', 'status-red.svg')
                            }
                        }
                    }
                }
            } else {
                vscode.window.showErrorMessage("Error parsing task path!")
            }
        } else {
            // Write directory icon logic here
            iconPath = ""

            // Calculate maxPoints sum for tasks in this directory
            let maxPointsForDir = this.calculateMaxPoints(item, 0)
            console.log(maxPointsForDir)

            // Calculate currentPoints sum for tasks in this directory
            let currentPointsForDir = this.calculateCurrentPoints(item, 0)
            console.log(currentPointsForDir)

            if (maxPointsForDir > 0) {
                if (maxPointsForDir == currentPointsForDir) {
                    iconPath = path.join(__filename, '..', '..', '..', '..', 'media', 'status-green.svg')
                } else if (currentPointsForDir > 0) {
                    iconPath = path.join(__filename, '..', '..', '..', '..', 'media', 'status-yellow.svg')
                } else {
                    iconPath = path.join(__filename, '..', '..', '..', '..', 'media', 'status-red.svg') 
                }
            } else {
                iconPath = ""
            }

            let children = item.children
            children.forEach(child => {
                console.log(child)
            })
            // Find all .timdata task objects for each task inside the children of this
            // Calculate the maximum points for the sum of those tasks
            // Calculate the current points for the sum of those tasks
            // Pick the correct icon

        }
        // let iconPath = path.join(__filename, '..', '..', '..', '..', 'media', 'red-circle-svgrepo-com.svg')
        result.command = {
            command : 'tide.item_clicked',
            title : title,
            arguments: [item],
        }
        result.iconPath = iconPath
        return result
    }

    /**
     * Calculates a sum of maxPoints for tasks within the items children
     * @param item the treeview item for which the sum is calculated
     * @param sum current sum
     * @returns calculated max points
     */
    public calculateMaxPoints(item: CourseTaskTreeItem, sum: number): number {
        let children = item.children
        let pointsSum = sum
        let readyCheck = false
        if (children.length > 0) {
            children.forEach(child => {
                if (child.type === 'dir') {
                    pointsSum += this.calculateMaxPoints(child, sum)
                } else {
                    // type === 'file' -> ready to find max points
                    readyCheck = true
                }
            })
            if (readyCheck) {
                let pathSplit = item.path.split(path.sep)
                let demo = pathSplit.at(-2)
                let taskId = pathSplit.at(-1)
                if (demo && taskId) {
                    let timData = ExtensionStateManager.getTaskTimData(demo, taskId)
                    if (timData && timData.max_points) {
                        pointsSum += timData?.max_points
                        return pointsSum
                    }
                }
            }
        }
        return pointsSum
    }

    /**
     * Calculates the current points sum of the tasks within the items children
     * @param item the treeview item for which the sum is calculated
     * @param sum current sum
     * @returns calculated current points sum
     */
    public calculateCurrentPoints(item: CourseTaskTreeItem, sum: number): number {
        let children = item.children
        let pointsSum = sum
        let readyCheck = false
        if (children.length > 0) {
            children.forEach(child => {
                if (child.type === 'dir') {
                    pointsSum += this.calculateCurrentPoints(child, sum)
                } else {
                    // type === 'file' -> ready to find max points
                    readyCheck = true
                }
            })
            if (readyCheck) {
                let pathSplit = item.path.split(path.sep)
                let demo = pathSplit.at(-2)
                let taskId = pathSplit.at(-1)
                if (demo && taskId) {
                    let timData = ExtensionStateManager.getTaskTimData(demo, taskId)
                    if (timData) {
                        let pointsData = ExtensionStateManager.getTaskPoints(timData.path, timData.ide_task_id)
                        if (pointsData && pointsData.current_points) {
                            pointsSum += pointsData.current_points
                            return pointsSum
                        }                        
                    }
                }
            }
        }
        return pointsSum
    }

    // Returns treeview items children
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
    constructor(label: string, itemPath: string, type: "file" | "dir") {
        super(label)
        this.path = itemPath
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

