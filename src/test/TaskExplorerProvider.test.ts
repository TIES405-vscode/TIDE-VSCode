
import assert from 'assert'
import * as vscode from 'vscode'
import sinon from 'sinon'
import { describe, test, before, after } from 'mocha'
import { CourseTaskProvider } from '../ui/panels/TaskExplorerProvider'

describe('TaskExplorerProvider', () => 
{
    before(() => 
    {
        // Mock registerCommand before tests
        sinon.stub(vscode.commands, 'registerCommand');
    });
    after(() => 
    {
        // Restore the original after tests
        (vscode.commands.registerCommand as sinon.SinonStub).restore();
    });

    test("getChildren should return child elements", async() =>
    {
        // Arrange
        // Mock the CourseTaskProvider class
        class CourseTaskTreeItem extends vscode.TreeItem 
        {
            public path: string;
            public type: string;
            public children: CourseTaskTreeItem[];

            constructor(label: string, collapsibleState: vscode.TreeItemCollapsibleState) {
                super(label, collapsibleState);
                this.path = '';
                this.type = '';
                this.children = [];
            }

            public addChild(child: CourseTaskTreeItem): void {
                this.children.push(child);
            }
        }
        const parent = new CourseTaskTreeItem('Parent', vscode.TreeItemCollapsibleState.Collapsed)  
        const childLabels = ["Tom", "Dick", "Harry"];
        childLabels.forEach(label => parent.addChild(new CourseTaskTreeItem(label, vscode.TreeItemCollapsibleState.None)));
        const courseTaskProvider = new CourseTaskProvider()
        // Act
        const returnedChildren = await courseTaskProvider.getChildren(parent)
        // Assert
        assert.strictEqual(returnedChildren?.length, 3, 'Expected 3 child elements')
        assert.strictEqual(returnedChildren[0].label, 'Tom', 'Expected first child to be Tom')
        assert.strictEqual(returnedChildren[1].label, 'Dick', 'Expected second child to be Dick')     
        assert.strictEqual(returnedChildren[2].label, 'Harry', 'Expected third child to be Harry')
    })
})  
