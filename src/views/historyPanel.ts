import * as vscode from 'vscode';
import { HistoryItem } from '../models';

export class HistoryPanel {
  public static currentPanel: HistoryPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private history: HistoryItem[] = [];

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  public static getInstance(extensionUri: vscode.Uri): HistoryPanel {
    if (HistoryPanel.currentPanel) {
      return HistoryPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      'operationHistory',
      'Operation History',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri]
      }
    );

    HistoryPanel.currentPanel = new HistoryPanel(panel, extensionUri);
    
    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(
      message => {
        switch(message.command) {
          case 'exportCSV':
            HistoryPanel.currentPanel?.exportCSV();
            return;
        }
      },
      null,
      HistoryPanel.currentPanel._disposables
    );

    return HistoryPanel.currentPanel;
  }

  public static updateIfVisible(history: HistoryItem[]) {
    if (HistoryPanel.currentPanel) {
      HistoryPanel.currentPanel.setHistory(history);
    }
  }

  public setHistory(history: HistoryItem[]) {
    this.history = history;
    this._update();
  }

  public show() {
    this._panel.reveal(vscode.ViewColumn.One);
  }

  private _update() {
    const webview = this._panel.webview;
    this._panel.webview.html = this._getHtmlForWebview(webview);
  }

  public dispose() {
    HistoryPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private async exportCSV() {
    if (this.history.length === 0) {
      vscode.window.showInformationMessage('No history to export.');
      return;
    }

    const header = ['ID', 'Type', 'Name', 'Flow ID', 'Profile', 'Timestamp', 'Status'].join(',');
    const rows = this.history.map(h => 
      `${h.id},${h.type},"${h.name}",${h.flowId},${h.profile},${new Date(h.timestamp).toISOString()},${h.status}`
    );

    const csvContent = [header, ...rows].join('\\n');

    const uri = await vscode.window.showSaveDialog({
      filters: { 'CSV': ['csv'] },
      defaultUri: vscode.Uri.file('sparkflows-history.csv')
    });

    if (uri) {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(csvContent, 'utf8'));
      vscode.window.showInformationMessage('History exported successfully!');
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const rows = this.history.map(log => `
      <tr>
        <td>${log.type}</td>
        <td>${log.name}</td>
        <td>${log.flowId}</td>
        <td>${log.profile}</td>
        <td>${new Date(log.timestamp).toLocaleString()}</td>
        <td>${log.status}</td>
      </tr>
    `).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Operation History</title>
    <style>
        body { font-family: var(--vscode-font-family); color: var(--vscode-editor-foreground); padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { text-align: left; padding: 8px; border-bottom: 1px solid var(--vscode-panel-border); }
        th { background-color: var(--vscode-keybindingTable-headerBackground); }
        button { background-color: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 8px 12px; cursor: pointer; }
        button:hover { background-color: var(--vscode-button-hoverBackground); }
    </style>
</head>
<body>
    <h2>Operation History</h2>
    <button onclick="exportCSV()">Export to CSV</button>
    <table>
        <thead>
            <tr>
                <th>Type</th>
                <th>Name</th>
                <th>Flow ID</th>
                <th>Profile</th>
                <th>Time</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            ${rows}
        </tbody>
    </table>
    <script>
        const vscode = acquireVsCodeApi();
        function exportCSV() {
            vscode.postMessage({ command: 'exportCSV' });
        }
    </script>
</body>
</html>`;
  }
}
