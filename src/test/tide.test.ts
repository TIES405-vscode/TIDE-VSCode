
import assert from 'assert'
import * as vscode from 'vscode'
import sinon from 'sinon'
import { describe, test, afterEach } from 'mocha'

import Tide from '../api/tide'

describe('Tide', () => 
{
    afterEach(() =>
    {
        sinon.restore()
    })

    test('downloadTaskSet should call runAndHandle', async () =>
    {
        // Mocking for TIM-IDE.fileDownloadPath, doesn't matter what it returns as long as it is not undefined
        let getConfigurationStub: sinon.SinonStub
        getConfigurationStub = sinon.stub(vscode.workspace, 'getConfiguration')
        getConfigurationStub.returns
        ({
            get: sinon.stub().returns('testPath')
        })     
        // Arrange: Mocking runAndHandle to return a resolved promise with "mock data"
        const runStub = sinon.stub(Tide as any, 'runAndHandle').returns(new Promise((resolve) => resolve('mock data')))
        // Act
        await Tide.downloadTaskSet('Ohjelmointi', 'test/path')
        // Assert
        assert.strictEqual(runStub.calledOnce, true, 'runAndHandle should be called once')
        sinon.assert.calledWith(runStub, sinon.match.array.startsWith(['task', 'create', 'test/path', '-a', '-d']))
    })  
    test('login should call runAndHandle and login successfully', async () => 
    {
        // Arrange: Mock runAndHandle to simulate a successful login response
        const runStub = sinon.stub(Tide as any, 'runAndHandle').callsFake(async (...args: unknown[]): Promise<void> => 
        {
            const callback = args[1] as (data: string) => void
            callback(JSON.stringify({ login_success: true }))
        })
        // Act: 
        const result = await Tide.login()

        // Assert: 
        assert.strictEqual(runStub.calledOnce, true, 'runAndHandle should be called once')
        sinon.assert.calledWith(runStub, sinon.match.array.startsWith(['login', '--json']))
        assert.deepStrictEqual(result, { isLogged: true }, 'The login result should match the expected response')
    })
})
