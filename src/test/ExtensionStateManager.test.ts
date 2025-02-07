import * as assert from 'assert'
import * as vscode from 'vscode'
import ExtensionStateManager from '../api/ExtensionStateManager'

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

    test('setDownloadPath and getDownloadPath should store and retrieve the same path', async () => 
    {
        const testablePath = 'any/fake/path/doesnt/matter'
        await ExtensionStateManager.setDownloadPath(testablePath) // testing the set method
        const expectedPath = ExtensionStateManager.getDownloadPath() // testing the get method
        assert.strictEqual(testablePath, expectedPath, 'Download path should match the stored value')
    })
})
