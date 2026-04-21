import * as vscode from 'vscode';
import { FlowItem, HistoryItem } from '../models';
import { Constants } from '../utils/constants';
import { ExecutionLogPanel } from '../views/executionLogPanel';
import { HistoryPanel } from '../views/historyPanel';

export class FlowService {
  private static instance: FlowService;
  private context!: vscode.ExtensionContext;

  private constructor() {}

  public static getInstance(): FlowService {
    if (!FlowService.instance) {
      FlowService.instance = new FlowService();
    }
    return FlowService.instance;
  }

  public initialize(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public async executeFlow(item: FlowItem) {
    const logPanel = ExecutionLogPanel.getInstance(this.context.extensionUri);
    logPanel.show();

    const timestamp = Date.now();
    logPanel.addLog({
      name: item.name,
      id: item.id.toString(),
      timestamp,
      status: 'Submitted'
    });

    try {
      // Since specific endpoints are not provided, we mock the API hit based on category requirement
      if (item.category === 'workflow') {
        // Mock workflow execution API
        // await axios.post(`/api/v1/workflows/${item.id}/execute`);
      } else {
        // Mock pipeline execution API
        // await axios.post(`/api/v1/pipelines/${item.id}/execute`);
      }

      this.recordHistory({
        id: crypto.randomUUID ? crypto.randomUUID() : new Date().getTime().toString(),
        type: 'Execution',
        name: item.name,
        flowId: item.id,
        profile: this.getProfile(),
        timestamp: Date.now(),
        status: 'In Progress'
      });

      this.pollExecutionStatus(item, logPanel);

    } catch (error: any) {
      logPanel.addLog({
        name: item.name,
        id: item.id.toString(),
        timestamp: Date.now(),
        status: 'Failed',
        errorMessage: error.message
      });
      this.updateLatestHistoryStatus('Failed');
    }
  }

  private pollExecutionStatus(item: FlowItem, logPanel: ExecutionLogPanel) {
    const config = vscode.workspace.getConfiguration();
    const intervalMs = config.get<number>(Constants.SETTINGS.POLLING_INTERVAL_MS) || 10000;

    let attempts = 0;
    const intervalId = setInterval(async () => {
      attempts++;
      
      logPanel.addLog({
        name: item.name,
        id: item.id.toString(),
        timestamp: Date.now(),
        status: 'Running'
      });

      // MOCK POLLING API: e.g. await axios.get(`/api/v1/${item.category === 'workflow' ? 'workflows' : 'pipelines'}/${item.id}/status`);
      
      // Stop condition for mock
      if (attempts >= 3) {
        clearInterval(intervalId);
        
        logPanel.addLog({
          name: item.name,
          id: item.id.toString(),
          timestamp: Date.now(),
          status: 'Completed'
        });

        this.updateLatestHistoryStatus('Success');
        
        vscode.window.showInformationMessage(`Execution of ${item.category} "${item.name}" completed successfully.`);
      }
    }, intervalMs);
  }

  private getProfile(): string {
    const config = vscode.workspace.getConfiguration();
    return config.get<string>(Constants.SETTINGS.PROFILE) || 'default';
  }

  private recordHistory(historyItem: HistoryItem) {
    const currentHistory = this.context.workspaceState.get<HistoryItem[]>(Constants.STATE.HISTORY) || [];
    currentHistory.unshift(historyItem);
    this.context.workspaceState.update(Constants.STATE.HISTORY, currentHistory);
    HistoryPanel.updateIfVisible(currentHistory);
  }

  private updateLatestHistoryStatus(status: 'Success' | 'Failed') {
    const currentHistory = this.context.workspaceState.get<HistoryItem[]>(Constants.STATE.HISTORY) || [];
    if (currentHistory.length > 0) {
      currentHistory[0].status = status;
      this.context.workspaceState.update(Constants.STATE.HISTORY, currentHistory);
      HistoryPanel.updateIfVisible(currentHistory);
    }
  }
}
