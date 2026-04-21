import * as vscode from 'vscode';

export interface LogEntry {
  id: string;
  name: string;
  timestamp: number;
  status: 'Submitted' | 'Running' | 'Completed' | 'Failed';
  errorMessage?: string;
}

export class ExecutionLogPanel {
  public static currentPanel: ExecutionLogPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private logs: LogEntry[] = [];

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._update();
  }

  public static getInstance(extensionUri: vscode.Uri): ExecutionLogPanel {
    if (ExecutionLogPanel.currentPanel) {
      return ExecutionLogPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      'executionLog',
      'Execution Log',
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri]
      }
    );

    ExecutionLogPanel.currentPanel = new ExecutionLogPanel(panel, extensionUri);
    return ExecutionLogPanel.currentPanel;
  }

  public show() {
    this._panel.reveal(vscode.ViewColumn.Two);
  }

  public addLog(entry: LogEntry) {
    // If it's a status update for same log, replace it; otherwise add
    const existingIndex = this.logs.findIndex(l => l.id === entry.id && l.status !== 'Completed' && l.status !== 'Failed');
    if (existingIndex > -1) {
        this.logs[existingIndex] = entry;
    } else {
        this.logs.unshift(entry);
    }
    this._update();
  }

  private _update() {
    const webview = this._panel.webview;
    this._panel.webview.html = this._getHtmlForWebview(webview);
  }

  public dispose() {
    ExecutionLogPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const rows = this.logs.map(log => `
      <tr>
        <td>${log.name}</td>
        <td>${log.id}</td>
        <td>${new Date(log.timestamp).toLocaleTimeString()}</td>
        <td class="status-${log.status.toLowerCase()}">${log.status}</td>
        <td>${log.errorMessage || ''}</td>
      </tr>
    `).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Execution Log</title>
    <style>
        body { font-family: var(--vscode-font-family); color: var(--vscode-editor-foreground); padding: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { text-align: left; padding: 8px; border-bottom: 1px solid var(--vscode-panel-border); }
        th { background-color: var(--vscode-keybindingTable-headerBackground); }
        .status-submitted { color: var(--vscode-charts-yellow); }
        .status-running { color: var(--vscode-charts-blue); }
        .status-completed { color: var(--vscode-charts-green); }
        .status-failed { color: var(--vscode-charts-red); }
    </style>
</head>
<body>
    <h2>Execution Logs</h2>
    <table>
        <thead>
            <tr>
                <th>Name</th>
                <th>ID</th>
                <th>Time</th>
                <th>Status</th>
                <th>Error</th>
            </tr>
        </thead>
        <tbody>
            ${rows}
        </tbody>
    </table>
</body>
</html>`;
  }
}
