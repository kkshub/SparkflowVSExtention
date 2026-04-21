import * as vscode from 'vscode';
import { ApiClient } from '../services/apiClient';
import { Project, FlowItem } from '../models';

type TreeItemNode = ProjectNode | CategoryNode | FlowNode;

class ProjectNode extends vscode.TreeItem {
  constructor(public readonly project: Project) {
    super(project.name, vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue = 'project';
    this.iconPath = new vscode.ThemeIcon('folder');
  }
}

class CategoryNode extends vscode.TreeItem {
  constructor(
    public readonly label: string, 
    public readonly projectId: number,
    public readonly items: FlowItem[]
  ) {
    super(label, vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue = 'category';
    this.iconPath = new vscode.ThemeIcon('folder-library');
  }
}

class FlowNode extends vscode.TreeItem {
  constructor(public readonly item: FlowItem) {
    super(item.name, vscode.TreeItemCollapsibleState.None);
    this.contextValue = item.category; // 'workflow' or 'pipeline'
    this.description = `ID: ${item.id}`;
    this.iconPath = new vscode.ThemeIcon(item.category === 'workflow' ? 'git-merge' : 'versions');
    // Command on click can be assigned here, but package.json handles context menus. 
    // Usually click behavior is desirable too.
    this.command = {
        title: 'Execute Flow',
        command: 'sparkflows.executeFlow',
        arguments: [item]
    };
  }
}

export class ProjectTreeProvider implements vscode.TreeDataProvider<TreeItemNode> {
  private _onDidChangeTreeData: vscode.EventEmitter<TreeItemNode | undefined | void> = new vscode.EventEmitter<TreeItemNode | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<TreeItemNode | undefined | void> = this._onDidChangeTreeData.event;

  constructor() {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TreeItemNode): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TreeItemNode): Promise<TreeItemNode[]> {
    if (!element) {
      // Root level - fetch projects
      try {
        const projects = await ApiClient.getInstance().getProjects();
        return projects.map((p) => new ProjectNode(p));
      } catch (err: any) {
        vscode.window.showErrorMessage(`Failed to load projects: ${err.message}`);
        return [];
      }
    } else if (element instanceof ProjectNode) {
      // Fetch flows for project
      try {
        const flows = await ApiClient.getInstance().getFlowItems(element.project.id);
        const workflows = flows.filter(f => f.category === 'workflow');
        const pipelines = flows.filter(f => f.category === 'pipeline');

        return [
          new CategoryNode('Workflows', element.project.id, workflows),
          new CategoryNode('Pipelines', element.project.id, pipelines)
        ];
      } catch (err: any) {
        vscode.window.showErrorMessage(`Failed to load project items: ${err.message}`);
        return [];
      }
    } else if (element instanceof CategoryNode) {
      return element.items.map(f => new FlowNode(f));
    }

    return [];
  }
}
