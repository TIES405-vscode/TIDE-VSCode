import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import ExtensionStateManager from '../../api/ExtensionStateManager'
import { Course, TimData } from '../../common/types'
import Logger from '../../utilities/logger'


// Class for handling TreeView data
export class CourseTaskProvider implements vscode.TreeDataProvider<CourseTaskTreeItem> {

    // courseData holds the parent nodes for each course
    // each parent node holds the directories and tasks of the courses as children
    private courseData: CourseTaskTreeItem [] = []
    // TreeView either shows downloaded courses or tasks from a selected course
    private treeViewMode: 'Courses' | 'Tasks' = 'Courses'

    // with the vscode.EventEmitter we can refresh our  tree view
    private m_onDidChangeTreeData: vscode.EventEmitter<CourseTaskTreeItem | undefined> = new vscode.EventEmitter<CourseTaskTreeItem | undefined>()
    // and vscode will access the event by using a readonly onDidChangeTreeData (this member has to be named like here, otherwise vscode doesnt update our treeview.
    readonly onDidChangeTreeData ? : vscode.Event<CourseTaskTreeItem | undefined> = this.m_onDidChangeTreeData.event

    // Initialize icon paths for treeItems
    private iconGreenStatus = path.join(__filename, '..', '..', '..', '..', 'media', 'status-green.svg')
    private iconYellowStatus = path.join(__filename, '..', '..', '..', '..', 'media', 'status-yellow.svg')
    private iconRedStatus = path.join(__filename, '..', '..', '..', '..', 'media', 'status-red.svg')
    private iconGreyStatus = path.join(__filename, '..', '..', '..', '..', 'media', 'status-grey.svg')
    private iconWarningStatus = path.join(__filename, '..', '..', '..', '..', 'media', 'status-warning.svg')
    private iconTimCourse = path.join(__filename, '..', '..', '..', '..', 'media', 'timlogovscode.png')
    private iconSupplementaryStatus = path.join(__filename, '..', '..', '..', '..', 'media', 'status-sup-file.svg')

    // Register commands required to handle the treeview
    constructor() {
        // Treeview commands
        vscode.commands.registerCommand('tide.itemClicked', item => this.itemClicked(item))
        vscode.commands.registerCommand('tide.refreshTree', () => this.refreshTree())
        vscode.commands.registerCommand('tide.wipeTreeAndEditors', () => this.wipeTreeAndEditors())

        vscode.commands.registerCommand('tide.treeviewShowCourses', () => this.showCourses())

        // Context menu commands (right-click menu)
        vscode.commands.registerCommand('tide.treeviewMenuOpenTasks', item => this.openTasksInThisDir(item))
    }

    // Refresh the current treeview items
    private refreshTree() {
        // When the treeView is in Course browsing mode
        let loginData = ExtensionStateManager.getLoginData()

        if (loginData.isLogged) {
            if (this.treeViewMode == 'Courses') {
                this.showCourses()
            } else {
                const treeRootItem = this.courseData.at(0)
                if (treeRootItem) {
                    treeRootItem.children = []
                    this.readCourseDirectory(treeRootItem.path, this.courseData.at(0))
                    treeRootItem.updatePoints()
                }
                this.m_onDidChangeTreeData.fire(undefined)
            }
        } else {
            vscode.window.showErrorMessage('Login to browse courses and tasks!')
        }
    }

    // Set the treeView to course browsing mode
    private showCourses() {
        // TreeView is reset -> Mode = Courses
        this.treeViewMode = 'Courses'

        let loginData = ExtensionStateManager.getLoginData()
        if (loginData.isLogged) {
            this.courseData = []
            this.readRootDirectory()
            // This needs to be called in order to show the data in the treeview
            this.m_onDidChangeTreeData.fire(undefined)
        } else {
            vscode.window.showErrorMessage('Login to browse courses and tasks!')
        }
    }

    // Empty treeview and close files after a user logs out
    private async wipeTreeAndEditors() {
        this.courseData = []
        this.m_onDidChangeTreeData.fire(undefined)

        // Closes open editors
        const tabGroups = vscode.window.tabGroups.all
        tabGroups.forEach(async group => {
            await vscode.window.tabGroups.close(group)
                })
    }

    // Right-click Option
    // Opens all tasks found in the children of the given item
    private openTasksInThisDir(item: CourseTaskTreeItem) {
        let currentItem = item
        // item might be a dir or a file
        if(currentItem.type == 'dir') {
            currentItem.children.forEach(child => {
                this.openTasksInThisDir(child)
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
                vscode.window.showErrorMessage('Error opening documents. Refreshing treeview')
                this.refreshTree()
            }
            
        }
    }
    // OBSOLETE
    // Reads downloaded course directories, creates the parent nodes into courseData,
    // and starts reading each courses contents with the recursive function readCourseDirectory
    // ACTUAL
    // Reads the download path set by the user in settings and created course nodes for each course directory
    // does not create nodes for non-tide-course directories or files
    // shows only active courses, ignores hidden courses
    private readRootDirectory() {
        const rootDir: string | undefined = vscode.workspace.getConfiguration().get('TIM-IDE.fileDownloadPath')
        const extensionCourseData = ExtensionStateManager.getCourses()

        // Check if the user has fetched course data from TIM
        if (!extensionCourseData) {
            // Inform user if course data isn't found
            vscode.window.showInformationMessage('Course data was not found. Make sure you have TIDE courses added in TIM, and refresh course data from the My Courses- page!')
            return
        }

        // Check that the user has set a download path
        if (rootDir == undefined) {
            vscode.window.showErrorMessage('Error while reading fileDownloadPath. Edit fileDownloadPath in Settings!')
        } else {
            // Check that the path exists
            if (this.pathExists(rootDir)) {
                // Find all files and directories in the File Download Path set by the user
                fs.readdirSync(rootDir).forEach(element => {
                    let current = path.join(rootDir,element)
                    // Only seek for course Directories
                    if (fs.statSync(current).isDirectory()) {
                        // Try to find an active course matching the directory name
                        const courseFound = this.isCourse(element)
                        // If a course was found, create a root node
                        if (courseFound && courseFound.status == 'active') {
                            this.courseData.push(new CourseTaskTreeItem('Course: ' + element, current, 'root'))
                            // this.readCourseDirectory(current, this.courseData.at(-1))
                        }
                    }
                })
            } else {
                vscode.window.showErrorMessage('Download path doesn\'t exist!')
            }
        }
    }

    /**
     * Reads the given path and adds found files and directories as the given parents children
     * recursively until all nodes have been added
     * All files and directories are added whether they are a part of a course or not
     * @param dir Current directory path
     * @param parent TreeItem to be given new nodes as children
     */
    private readCourseDirectory(dir: string, parent: CourseTaskTreeItem | undefined) {
        if (dir == undefined) {
            vscode.window.showErrorMessage('Error while reading course path!')
        } else if (parent == undefined) {
            vscode.window.showErrorMessage('Error reading course directory: Undefined parent')
        } else {
            let courseDirPath: string = dir
            if (this.pathExists(courseDirPath)) {
                // Find all elements in the directory and go through them in a loop
                fs.readdirSync(courseDirPath).forEach(element => {
                    let current = path.join(courseDirPath,element)
                    // If the current element is a file, add it to the parents children and stop the recursion
                    if (fs.statSync(current).isFile()) {
                        if (current.endsWith('.timdata')) {
                            // .timdata files are read when task sets are downloaded so we can ignore them here
                        } else {
                            // Create a new node and add it to its parents children
                            let newNode = new CourseTaskTreeItem(element, current, 'file')
                            parent.addChild(newNode)
                        }
                    // If the current element is a directory, add it to the parents children and continue the recursion
                    } else {
                        // Create a new node and add it to its parents children
                        let newNode = new CourseTaskTreeItem(element, current, 'dir')
                        parent.addChild(newNode)
                        // Continue recursion
                        this.readCourseDirectory(current, newNode)
                    }
                })
            } else {
                vscode.window.showErrorMessage('Directory path doesn\'t exist!')
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
    public itemClicked(item: CourseTaskTreeItem) {

        // When the treeView is in Course browsing mode:
        // Show the taskSets and their statuses for the clicked course
        if (this.treeViewMode === 'Courses') {
            this.treeViewMode = 'Tasks'
            this.courseData = []
            let newLabel = item.label?.toString().replace('Course: ', '') ?? ''
            let newPath = item.path
            this.courseData.push(new CourseTaskTreeItem(newLabel, newPath, 'dir'))
            let rootItem = this.courseData.at(0)
            if (rootItem) {
                // Automaticly expand the root folder when opening a course from the treeView
                rootItem.collapsibleState = vscode.TreeItemCollapsibleState.Expanded
            }            
            this.readCourseDirectory(item.path, this.courseData.at(0))
            const treeRootItem = this.courseData.at(0)
            if (treeRootItem) {
                treeRootItem.updatePoints()
            }
            this.m_onDidChangeTreeData.fire(undefined)
        } else {
            // When the treeView is in TaskSet browsing mode:
            // Open the clicked task file, ignore clicks on directories

            // Try to open the document
            try {
                // When a dir is clicked do nothing
                if (item.type == 'dir') {
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
                vscode.window.showErrorMessage('Error, document might be deleted. Refreshing...')
                this.refreshTree()
            }
        }
    }

    /**
     * This method needs to be implemented in order to show the TreeItems in the TreeView
     * The result is given the information inside our implementation of a TreeviewItem (CourseTaskTreeItem)
     * and a status icon is calculated based on current task points and max points
     * @param item The item that is going to be shown
     * @returns a vscode.TreeItem that can be shown in a treeview component
     */
    public getTreeItem(item: CourseTaskTreeItem): vscode.TreeItem|Thenable<vscode.TreeItem> {

        let title = item.label? item.label.toString() : ''
        let result = new vscode.TreeItem(title, item.collapsibleState)
        let iconPath = ''

        // If TreeView Mode is Courses, give all TIDE Courses the tim logo icon

        if (this.treeViewMode === 'Courses') {
            // Set the tim icon for all courses
            iconPath = this.iconTimCourse
            const itemCourse = ExtensionStateManager.getCourses().find(course => item.label?.toString().toLocaleLowerCase().includes(course.name.toLocaleLowerCase()))
            if (itemCourse) {
                const taskSetAmount = itemCourse.taskSets.length
                let downloadedTaskSetsAmount = 0
                itemCourse.taskSets.forEach(taskSet => {
                    if (taskSet.downloadPath) {
                        downloadedTaskSetsAmount++
                    }
                })
                result.description = downloadedTaskSetsAmount + '/' + taskSetAmount + ' TaskSets Downloaded'
            }
        } else {

            const fileCheck = item.isCourseDirOrFile()

                if (fileCheck) {

                    if (item.type == 'file') {
                        const taskTimData = ExtensionStateManager.getTimDataByFilepath(item.path)
                        if (taskTimData) {
                            // If it turns out there is a possibility of more than 1 task_file, refactor this to take it into account!
                            let taskFiles = taskTimData.task_files
                            let labelString = item.label?.toString() ?? ''
        
                            // Only give points icons to the task_file files!
                            if (taskFiles.some(taskFile => taskFile.file_name.includes(labelString))) {
                                if (item.maxPoints === 0) {
                                    iconPath = this.iconGreyStatus
                                } else if (item.currentPoints === 0) {
                                    iconPath = this.iconRedStatus
                                } else if (item.currentPoints === item.maxPoints) {
                                    iconPath = this.iconGreenStatus
                                } else {
                                    iconPath = this.iconYellowStatus
                                }
                            } else {
                                // Give supplementary file icon to supplementary files
                                iconPath = this.iconSupplementaryStatus
                            }
                        }
                    } else {
                        if (item.maxPoints === 0) {
                            iconPath = this.iconGreyStatus
                        } else if (item.currentPoints === 0) {
                            iconPath = this.iconRedStatus
                        } else if (item.currentPoints === item.maxPoints) {
                            iconPath = this.iconGreenStatus
                        } else {
                            iconPath = this.iconYellowStatus
                        }
                    }
                } else {
                    // No icon and a warning for directories that aren't a part of a Tide-Course
                    iconPath = this.iconWarningStatus
                    result.description = 'Not a Tide-Course directory!'
                }
        }

        
        result.command = {
            command : 'tide.itemClicked',
            title : title,
            arguments: [item],
        }
        result.contextValue = item.contextValue
        result.iconPath = iconPath
        return result
    }

    // Returns treeview items children
    public getChildren(element : CourseTaskTreeItem | undefined): vscode.ProviderResult<CourseTaskTreeItem[]> {
        if (element === undefined) {
            return this.courseData
        } else {
            return element.children
        }
    }

    public isCourse(dirName: string): Course | undefined{
        let result = undefined
        const courseData = ExtensionStateManager.getCourses()
        courseData.forEach(element => {
            if (element.name.toLocaleLowerCase() === dirName) {
                result = element
            }
        })
        return result
    }
}

// Class for handling the treeview items
class CourseTaskTreeItem extends vscode.TreeItem {

    readonly path: string
    readonly type: string | undefined
    currentPoints: number
    maxPoints: number

    // children represent branches, which are also items 
    public children: CourseTaskTreeItem[] = []
    
    // the label represent the text which is displayed in the tree
    // and is passed to the base class
    // path = path to file or dir
    // type = type of item (file or dir)
    // TODO: label: vscode.TreeItemLabel
    constructor(label: string, itemPath: string, type: 'file' | 'dir' | 'root') {
        super(label)
        this.label
        this.path = itemPath
        this.type = type
        this.currentPoints = 0
        this.maxPoints = 0
        if (this.type === 'file' || this.type === 'root') {
            this.collapsibleState = vscode.TreeItemCollapsibleState.None
            this.contextValue = ''
        } else {
            this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed
            this.contextValue = 'folder'
        }
    }

    // a public method to add childs, and with additional branches
    // we want to make the item collabsible
    public addChild (child : CourseTaskTreeItem) {
        // this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed
        this.children.push(child)
    }

    /**
     * Checks if the CourseTaskTreeItem is a file or a directory that is a part of a Tide-Course
     * @returns true if the item is a part of a Tide-Course, false otherwise
     */
    public isCourseDirOrFile() : boolean {
        let result = false
        if (this.type === 'file') {
            try {
                const itemTimData = ExtensionStateManager.getTimDataByFilepath(this.path)
                if (itemTimData) {
                    itemTimData.task_files.forEach(taskFile => {
                        if (this.label && taskFile.file_name.includes(this.label.toString())) {
                            result = true
                        }
                    })
                    if (result == false) {
                        itemTimData.supplementary_files.forEach(supFile => {
                            if (this.label && supFile.file_name.includes(this.label.toString())) {
                                result = true
                            }
                        })
                    }

                }
                // Java tehtävä tiedostojen tunnistus!
                // C# tehtävien csproj tiedostojen tunnistus!
                if (result == false) {

                }
            } catch (error) {
                Logger.debug(error)
                return result
            }
        } else if (this.type == 'dir') {
            // Search TimData for the directory name in ide_task_id or path
            const timData = ExtensionStateManager.getTimData()
            const labelString = this.label?.toString()
            if (!labelString) {
                return result
            }
            timData.some(element => {
                if (result == true) {return}
                if (element.ide_task_id === labelString) {
                    result = true
                }
                if (element.task_directory === labelString) {
                    result = true
                }
                if (element.task_files.some(taskFile => taskFile.file_name.includes(labelString))) {
                    result = true
                }
                const pathParts = element.path.split(path.posix.sep)
                if (pathParts.includes(labelString)) {
                    result = true
                }
            })
            if (result == false) {
                const courseData = ExtensionStateManager.getCourses()
                courseData.forEach(element => {
                    if (element.name.toLocaleLowerCase() === labelString) {
                        result = true
                    }
                })
            }
            // C# tehtävien kansioiden tunnistus?
            if (result == false) {
                timData.some(data => {
                    if (result == true) {return}
                    if (data.supplementary_files.some(file => file.file_name.includes(labelString))) {
                        result = true
                    }
                })
            }
        }
        return result
    }

    /**
     * Updates current and max points to the called treeItem and ALL ITS CHILDRENS treeItems recursively
     * Make sure this is never called recursively outside of here!
     * It is recommended to call this with the TreeViews root item/items, so the entire tree updates at once
     */
    public updatePoints() {
        let currentPointsSum = 0
        let maxPointsSum = 0
        if (this.children.length > 0) {
            this.children.forEach(child => {
                child.updatePoints()
                currentPointsSum += child.currentPoints
                maxPointsSum += child.maxPoints
            })
        } else {
            if (this.type == 'file') {
                const taskTimData = ExtensionStateManager.getTimDataByFilepath(this.path)
                if (taskTimData) {
                    // If it turns out there is a possibility of more than 1 task_file, refactor this to take it into account!
                    let taskFiles = taskTimData.task_files
                    let labelString = this.label?.toString() ?? ''

                    // Only give points to the task_file file!
                    if (taskFiles.some(taskFile => taskFile.file_name.includes(labelString))) {
                        if (taskTimData.max_points) {
                            maxPointsSum = taskTimData.max_points
                        }
                        
                        const savedPoints = ExtensionStateManager.getTaskPoints(taskTimData.path, taskTimData.ide_task_id)
                        const parsedPoints = savedPoints?.current_points
                        if (parsedPoints == null || parsedPoints == undefined) {
                            currentPointsSum = 0
                        } else {
                            currentPointsSum = parsedPoints
                        }
                    } else {
                        currentPointsSum = 0
                        maxPointsSum = 0
                    }
                    
                }                
            } else {
                currentPointsSum = 0
            }
            
        }
        this.maxPoints = maxPointsSum
        this.currentPoints = currentPointsSum
    }
}