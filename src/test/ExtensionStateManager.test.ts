import * as assert from 'assert'
import * as vscode from 'vscode'
import ExtensionStateManager from '../api/ExtensionStateManager'
import { LoginData } from '../common/types'
import { Course, TaskSet } from '../common/types'

suite('ExtensionStateManager Test Suite', () => 
{
    let mockState: Record<string, any> = {}

    /* Creating the fake object to pass to the ExtensionStateManager */
    const testContext =
    {
        globalState: 
        {
            update: async (key: string, value: any) => 
            {
                mockState[key] = value 
                return Promise.resolve()
            },
            get: (key: string) => mockState[key], 
            setKeysForSync: (_keys: readonly string[]) => {}
        }
    } as unknown as vscode.ExtensionContext

    setup(() => 
    {
        mockState = {} // clearing mockState before each test 
        ExtensionStateManager.setContext(testContext) // setting up the fake object 
    })

    test('setLoginData and getLoginData should store and retrieve the same data', async () => 
    {
        const testLoginData: LoginData = 
        {
            isLogged: true
        }
        ExtensionStateManager.setLoginData(testLoginData) // testing the set method
        const expectedLoginData = ExtensionStateManager.getLoginData() // testing the get method
        assert.deepStrictEqual(testLoginData, expectedLoginData, 'Login data should match the stored value')
    })
    test('setCourses and getCourses should store and retrieve the same courses', async () => 
    {
        const testTaskSets: TaskSet[] = 
        [
            {
                doc_id: 1,
                name: 'Task Set 1',
                path: 'path/to/taskset1',
                downloadPath: 'path/to/download1',
                tasks: [
                    {
                        doc_id: 101, ide_task_id: 'task1', path: 'path/to/task1', deadline: '2025-10-01', answer_limit: null,
                        task_files: null,
                        download_path: undefined,
                        task_directory: null,
                        supplementary_files: []
                    },
                    {
                        doc_id: 102, ide_task_id: 'task2', path: 'path/to/task2', deadline: '2025-10-01', answer_limit: 3,
                        task_files: null,
                        download_path: undefined,
                        task_directory: null,
                        supplementary_files: []
                    }
                ],
                timdataPath: undefined
            },
            {
                doc_id: 2,
                name: 'Task Set 2',
                path: 'path/to/taskset2',
                downloadPath: 'path/to/download2',
                tasks: [
                    {
                        doc_id: 201, ide_task_id: 'task3', path: 'path/to/task3', deadline: null, answer_limit: null,
                        task_files: null,
                        download_path: undefined,
                        task_directory: null,
                        supplementary_files: []
                    },
                    {
                        doc_id: 202, ide_task_id: 'task4', path: 'path/to/task4', deadline: null, answer_limit: null,
                        task_files: null,
                        download_path: undefined,
                        task_directory: null,
                        supplementary_files: []
                    }
                ],
                timdataPath: undefined
            }
        ]

        const testCourses: Course[] = 
        [
            {
                id: 1,
                name: 'Course 1',
                path: 'path/to/course1',
                taskSets: testTaskSets,
                status: 'active'
            },
            {
                id: 2,
                name: 'Course 2',
                path: 'path/to/course2',
                taskSets: [],
                status: 'hidden'
            }
        ]

        ExtensionStateManager.setCourses(testCourses) // testing the set method
        const expectedCourses = ExtensionStateManager.getCourses() // testing the get method
        assert.deepStrictEqual(testCourses, expectedCourses, 'Courses should match the stored value')
    })
})
