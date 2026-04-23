import * as vscode from 'vscode';
import { FlowItem, HistoryItem } from '../models';
import { Constants } from '../utils/constants';
import { ExecutionLogPanel } from '../views/executionLogPanel';
import { HistoryPanel } from '../views/historyPanel';
import { ApiClient } from './apiClient';

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
      let executionId: number | null = null;
      if (item.category === 'workflow') {
        executionId = await ApiClient.getInstance().executeWorkflow(item.id);
      } else if (item.category === 'pipeline') {
        executionId = await ApiClient.getInstance().executePipeline(item.name, item.projectId);
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

      this.pollExecutionStatus(item, logPanel, executionId);

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

  private pollExecutionStatus(item: FlowItem, logPanel: ExecutionLogPanel, executionId: number | null) {
    const config = vscode.workspace.getConfiguration();
    const intervalMs = config.get<number>(Constants.SETTINGS.POLLING_INTERVAL_MS) || 10000;

    let attempts = 0;
    const intervalId = setInterval(async () => {
      attempts++;
      
      let rawStatus = 'RUNNING';

      try {
        if (item.category === 'workflow' && executionId !== null) {
          rawStatus = await ApiClient.getInstance().getWorkflowExecutionStatus(executionId);
        } else if (item.category === 'pipeline' && executionId !== null) {
          rawStatus = await ApiClient.getInstance().getPipelineExecutionStatus(executionId);
        }
      } catch (e: any) {
        logPanel.addLog({
          name: item.name,
          id: item.id.toString(),
          timestamp: Date.now(),
          status: 'Failed',
          errorMessage: e.message
        });
        clearInterval(intervalId);
        this.updateLatestHistoryStatus('Failed');
        return;
      }

      // Normalize status
      const s = rawStatus.toUpperCase();
      let status: 'Submitted' | 'Running' | 'Completed' | 'Failed' = 'Running';

      if (['STARTING', 'PENDING', 'SUBMITTED'].includes(s)) {
        status = 'Submitted';
      } else if (['COMPLETED', 'SKIPPED', 'STOPPED', 'STOP'].includes(s)) {
        status = 'Completed';
      } else if (['FAILED', 'KILLED', 'TIMEOUT'].includes(s)) {
        status = 'Failed';
      }

      logPanel.addLog({
        name: item.name,
        id: item.id.toString(),
        timestamp: Date.now(),
        status: status
      });

      if (status === 'Completed' || status === 'Failed') {
        clearInterval(intervalId);
        
        this.updateLatestHistoryStatus(status === 'Completed' ? 'Success' : 'Failed');
        
        if (status === 'Completed') {
          vscode.window.showInformationMessage(`Execution of ${item.category} "${item.name}" completed successfully.`);
        } else {
          vscode.window.showErrorMessage(`Execution of ${item.category} "${item.name}" failed.`);
        }
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
