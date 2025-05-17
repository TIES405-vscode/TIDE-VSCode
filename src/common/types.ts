// TODO: snake_case to camelCase conversion (either when parsing in ide code or when sending in cli code) to follow typescript naming conventions

/**
 * Attributes shared by raw course data and parsed courses
 */
interface CourseBase {
  /**
   * Name of the course.
   */
  name: string

  /**
   * ID of the course.
   */
  id: number

  /**
   * The course's virtual path in TIM.
   */
  path: string
}

/**
 * Represents raw data coming from cli
 */
export interface CourseDataRaw extends CourseBase {
  /**
   * List of task sets that are defined as part of the course in TIM (without local modifications).
   */
  tasks: Array<TaskSetBase>
}

export type CourseStatus = 'active' | 'hidden'

/**
 * Represents a course in the extensions context
 */
export interface Course extends CourseBase {
  /**
   * List of task sets that are defined as part of the course in TIM.
   */
  taskSets: Array<TaskSet>

  /**
   * User specific status for the course.
   */
  status: CourseStatus
}

/**
 * Represents a task set data
 */
export interface TaskSetBase {
  /**
   * Name of the task.
   */
  name: string

  /**
   * ID of the document containing the task/csPlugin.
   */
  doc_id: number

  /**
   * Task set's virtual path in TIM.
   */
  path: string
}

/**
 * Represents a task set with tasks resolved
 */
export interface TaskSet extends TaskSetBase {
  /**
   * Download path of the taskset
   */
  downloadPath: string | undefined
  timdataPath: string | undefined

  /**
   * Tasks of the taskset
   */
  tasks: Array<Task>
}

/**
 * Represents a single task
 */
export interface Task {
  doc_id: number
  ide_task_id: string
  path: string
  deadline: string | null
  answer_limit: number | null
  download_path: string | undefined
  task_files: TaskFile[] | null
  task_directory: string | null
  supplementary_files: SupplementaryFile[]
}

/**
 * Data included in .timdata
 */
export interface TimData {
  supplementary_files: SupplementaryFile[]
  task_directory: string | null
  doc_id: number
  header: string | undefined
  ide_task_id: string
  max_points: number | null
  path: string
  stem: string | undefined
  task_files: TaskFile[]
  type: string
  deadline: string | null
  answer_limit: number | null
}

export interface TaskFile {
  content: string
  file_name: string
  source: string
  task_id_ext: string
  user_args: string
  user_input: string
  path: string
  task_directory: string
}

export interface SupplementaryFile {
  file_name: string,
  content : string | null,
  source : string | null,
  task_directory : string | null
}

export interface FileStatus {
  file_name: string
  path: string
  relative_path: string
  status: string
  task_id_ext: string | null
}

/**
 * Data associated with logged in user
 */
export interface LoginData {
  isLogged: boolean
}

/**
 * Username of the logged in user, null when logged out
 */
export interface UserData {
  logged_in: string | null
}

export interface TaskPoints {
  current_points: number | null
}

export interface TaskCreationFeedback {
  success: boolean
}

/**
 * Messages sent between panels and webviews
 */
export interface WebviewMessage {
  type: MessageType
  value: any
}

/**
 * "type" values for messages sent between panels and webviews
 */
export type MessageType =
  | 'CourseData'
  | 'CustomUrl'
  | 'DownloadTaskSet'
  | 'DownloadTaskSetComplete'
  | 'DownloadCourseTasks'
  | 'DownloadCourseTasksComplete'
  | 'Login'
  | 'LoginData'
  | 'Logout'
  | 'OnError'
  | 'OnInfo'
  | 'OpenSettings'
  | 'RefreshCourseData'
  | 'RequestLoginData'
  | 'ResetExercise'
  | 'ResetNoneditableAreas'
  | 'SetCourseStatus'
  | 'SetDownloadPath'
  | 'SetDownloadPathResult'
  | 'ShowCourses'
  | 'SubmitResult' 
  | 'ShowOutput'
  | 'SubmitTask'
  | 'TaskPoints'
  | 'UpdateTaskPoints'
  | 'UpdateTimData'
  | 'SetPointsUpdating'
