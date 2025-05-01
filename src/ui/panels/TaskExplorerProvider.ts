import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import ExtensionStateManager from '../../api/ExtensionStateManager'
import { Course, TimData } from '../../common/types'


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
    private iconWarningStatus = path.join(__filename, '..', '..', '..', '..', 'media', 'status-warning.svg')
    private iconTimCourse = path.join(__filename, '..', '..', '..', '..', 'media', 'timlogovscode.png')

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

        // TODO: Remove after testing
        // this.testCourseData(this.courseData)

        if (loginData.isLogged) {
            if (this.treeViewMode == 'Courses') {
                this.showCourses()
            } else {
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
            this.readCourseDirectory(item.path, this.courseData.at(0))
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
            // File icon logic
            if (item.type == 'file') {

                const fileCheck = item.isCourseDirOfFile()

                if (fileCheck) {
                    // Find the names of the tasks ide_task_id and the task set from the files path
                    let itemPath = item.path
                    let pathSplit = itemPath.split(path.sep)
                    // ide_task_id
                    let id = pathSplit.at(-2)
                    // taskSet(demo) name
                    let demo = pathSplit.at(-3)
                    // course with a downloadpath that includes the files path
                    const course: Course | undefined = ExtensionStateManager.getCourseByDownloadPath(path.dirname(path.dirname(itemPath)))
                    
                    // Find the points data of this task file from ExtensionStateManager
                    if (id && demo && course) {

                        // Identify the Task Set from course data using the files path
                        const taskset = course.taskSets.find(taskSet => {
                            if (taskSet.downloadPath) {
                                if (itemPath.includes(taskSet.downloadPath)) {
                                    return taskSet
                                }
                            }
                        })

                        if (taskset) {

                            const timData : TimData | undefined = ExtensionStateManager.getTaskTimData(taskset.path, demo, id)
                            
                            if (timData) {
                                // Task Max points (max_points: number in .timData, maxPoints: string also exists in Tim and may be used in the future to describe how to gain maximum points from a task!)
                                let taskMaxPoints = timData.max_points
                                if (taskMaxPoints == null) {
                                    taskMaxPoints = 0
                                }
                                if (taskMaxPoints == 0) {
                                    iconPath = ''
                                } else {
                                    // Current task points
                                    const currentPoints = ExtensionStateManager.getTaskPoints(timData.path, timData.ide_task_id)
                                    if (taskMaxPoints && currentPoints && currentPoints.current_points) {
                                        // Maximum points received from the task
                                        if (currentPoints?.current_points == taskMaxPoints) {
                                            iconPath = this.iconGreenStatus
                                            // Some points received from the task
                                        } else if (currentPoints?.current_points > 0) {
                                            iconPath = this.iconYellowStatus
                                            // Zero points received from the task
                                        } else {
                                            iconPath = this.iconRedStatus
                                        }
                                    }
                                }
                            } else {
                                // Add a description for files that aren't a part of a Tide-Course
                                result.description = 'Not a Tide-Course file!'
                                iconPath = this.iconWarningStatus
                            }                
                        } else {
                            // Add a description for files that aren't a part of a Tide-Course
                            result.description = 'Not a Tide-Course file!'
                            iconPath = this.iconWarningStatus
                        }
                    } else {
                        vscode.window.showErrorMessage('Error parsing task path!')
                    }
                } else {
                    // Add a description for files that aren't a part of a Tide-Course
                    result.description = 'Not a Tide-Course file!'
                    iconPath = this.iconWarningStatus
                }
                 
            } else {
                // Directory icon logic

                // Checks if the treeItem is a part of a Tide-Course
                const dirCheck = item.isCourseDirOfFile()

                // Calculate correct icon for Tide-Course directories
                if (dirCheck) {
                    // Calculate taskMaxPoints sum for tasks in this directory
                    let taskMaxPointsForDir = this.calculateTaskMaxPoints(item, 0)

                    // Calculate currentPoints sum for tasks in this directory
                    let currentPointsForDir = this.calculateCurrentPoints(item, 0)

                    if (taskMaxPointsForDir > 0) {
                        if (taskMaxPointsForDir == currentPointsForDir) {
                            iconPath = this.iconGreenStatus
                        } else if (currentPointsForDir > 0) {
                            iconPath = this.iconYellowStatus
                        } else {
                            iconPath = this.iconRedStatus
                        }
                    } else {
                        iconPath = ''
                    }
                } else {
                    // No icon and a warning for directories that aren't a part of a Tide-Course
                    iconPath = this.iconWarningStatus
                    result.description = 'Not a Tide-Course directory!'
                }
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

    /**
     * Calculates a sum of taskMaxPoints for tasks within the items children
     * @param item the treeview item for which the sum is calculated
     * @param sum current sum
     * @returns calculated max points
     */
    public calculateTaskMaxPoints(item: CourseTaskTreeItem, sum: number): number {
        let children = item.children
        let pointsSum = sum
        let readyCheck = false
        if (children.length > 0) {
            children.forEach(child => {
                if (child.type === 'dir') {
                    pointsSum += this.calculateTaskMaxPoints(child, sum)
                } else {
                    // type === 'file' -> ready to find max points, if the found file is a course task file
                    if (child.isCourseDirOfFile()) {
                        readyCheck = true
                    }
                }
            })
            if (readyCheck) {
                let pathSplit = item.path.split(path.sep)
                let demo = pathSplit.at(-2)
                let taskId = pathSplit.at(-1)
                const course: Course | undefined = ExtensionStateManager.getCourseByDownloadPath(path.dirname(item.path))
                const taskset = course.taskSets.find(taskSet => taskSet.downloadPath === path.dirname(item.path))
                if (demo && taskId && taskset) {
                    let timData = ExtensionStateManager.getTaskTimData(taskset.path, demo, taskId)
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
                    if (child.isCourseDirOfFile()) {
                        readyCheck = true
                    }                    
                }
            })
            if (readyCheck) {
                let pathSplit = item.path.split(path.sep)
                let demo = pathSplit.at(-2)
                let taskId = pathSplit.at(-1)
                const course: Course | undefined = ExtensionStateManager.getCourseByDownloadPath(path.dirname(item.path))
                const taskset = course.taskSets.find(taskSet => taskSet.downloadPath === path.dirname(item.path))
                if (demo && taskId && taskset) {
                    let timData = ExtensionStateManager.getTaskTimData(taskset.path, demo, taskId)
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
        if (this.type === 'file' || this.type === 'root') {
            this.collapsibleState = vscode.TreeItemCollapsibleState.None
            this.contextValue = ''
        } else {
            this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded
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
    public isCourseDirOfFile() : boolean {
        let result = false
        if (this.type === 'file') {
            try {
                const itemCourse: Course | undefined = ExtensionStateManager.getCourseByDownloadPath(path.dirname(path.dirname(this.path)))
                if (!itemCourse) {
                    result = false
                    return result
                }
                const itemTaskSet = itemCourse.taskSets.find(taskSet => {
                    if (taskSet.downloadPath) {
                        if (this.path.includes(taskSet.downloadPath)) {
                            return taskSet
                        }
                    }
                })
                if (!itemTaskSet) {
                    result = false
                    return result
                }
                const itemTask = itemTaskSet?.tasks.find(task => {
                    const itemPathSplit = this.path.split(path.sep)
                    if (itemPathSplit.includes(task.ide_task_id)) {
                        return task
                    }
                })

                if (!itemTask) {
                    result = false
                    return result
                }

                if (itemTask && itemTask.path && itemTask.ide_task_id) {
                    const itemTimData = ExtensionStateManager.getTaskTimData(itemTask.path, '', itemTask.ide_task_id)
                    if (itemTimData) {
                        itemTimData.task_files.forEach(taskFile => {
                            if (taskFile.file_name == this.label) {
                                result = true
                            }                        
                        })
                    }
                }                    
            } catch (error) {
                console.log(error)
                return result
            }
        } else if (this.type == 'dir') {
            // Search TimData for the directory name in ide_task_id or path
            const timData = ExtensionStateManager.getTimData()
            const labelString = this.label?.toString()
            if (!labelString) {
                return result
            }
            timData.forEach(element => {
                if (element.ide_task_id === labelString) {
                    result = true
                }
                const pathParts = element.path.split(path.posix.sep)
                if (pathParts.includes(labelString)) {
                    result = true
                }
            })
            const courseData = ExtensionStateManager.getCourses()
            courseData.forEach(element => {
                if (element.name.toLocaleLowerCase() === labelString) {
                    result = true
                }
            })
        }
        return result
    }
}