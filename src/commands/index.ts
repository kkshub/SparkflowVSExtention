import * as vscode from 'vscode';
import { Constants } from '../utils/constants';
import { FlowService } from '../services/flowService';
import { AuthService } from '../services/authService';
import { ApiClient } from '../services/apiClient';
import { FlowItem } from '../models';
import { ProjectTreeProvider } from '../providers/projectTreeProvider';
import { HistoryPanel } from '../views/historyPanel';

export function registerCommands(context: vscode.ExtensionContext, treeProvider: ProjectTreeProvider) {
  
  context.subscriptions.push(
    vscode.commands.registerCommand(Constants.COMMANDS.EXECUTE_FLOW, async (arg: any) => {
      const flowItem: FlowItem = arg?.item ? arg.item : arg;
      if (!flowItem || !flowItem.id) {
        vscode.window.showErrorMessage('No flow item selected.');
        return;
      }
      await FlowService.getInstance().executeFlow(flowItem);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(Constants.COMMANDS.COPY_FLOW_ID, async (arg: any) => {
      const flowItem: FlowItem = arg?.item ? arg.item : arg;
      if (!flowItem || !flowItem.id) return;
      await vscode.env.clipboard.writeText(flowItem.id.toString());
      vscode.window.showInformationMessage(`Copied ID: ${flowItem.id}`);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(Constants.COMMANDS.REFRESH_PROJECTS, () => {
      treeProvider.refresh();
      vscode.window.showInformationMessage('Sparkflows projects refreshed.');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(Constants.COMMANDS.TEST_CONNECTION, async () => {
      try {
        await ApiClient.getInstance().getProjects();
        const config = vscode.workspace.getConfiguration();
        const serverUrl = config.get<string>(Constants.SETTINGS.SERVER_URL);
        vscode.window.showInformationMessage(`Connection to ${serverUrl} successful.`);
      } catch (e: any) {
        vscode.window.showErrorMessage(`Connection failed: ${e.message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(Constants.COMMANDS.SET_TOKEN, async () => {
      const config = vscode.workspace.getConfiguration();
      const currentProfile = config.get<string>(Constants.SETTINGS.PROFILE) || 'default';
      
      const token = await vscode.window.showInputBox({
        prompt: `Enter Sparkflows Access Token for profile '${currentProfile}'`,
        password: true, // Hides the input
        ignoreFocusOut: true
      });

      if (token) {
        await AuthService.getInstance().setToken(token);
        vscode.window.showInformationMessage(`Token securely saved for profile: ${currentProfile}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(Constants.COMMANDS.SET_SERVER_URL, async () => {
      const config = vscode.workspace.getConfiguration();
      const currentUrl = config.get<string>(Constants.SETTINGS.SERVER_URL) || 'http://localhost:8080';
      
      const newUrl = await vscode.window.showInputBox({
        prompt: 'Enter Sparkflows Server URL',
        value: currentUrl,
        ignoreFocusOut: true
      });

      if (newUrl && newUrl !== currentUrl) {
        await config.update(Constants.SETTINGS.SERVER_URL, newUrl, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`Server URL updated to: ${newUrl}`);
        treeProvider.refresh();
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(Constants.COMMANDS.SWITCH_PROFILE, async () => {
      const config = vscode.workspace.getConfiguration();
      const currentProfile = config.get<string>(Constants.SETTINGS.PROFILE);
      
      const newProfile = await vscode.window.showInputBox({
        prompt: 'Enter profile name (e.g., dev, prod)',
        value: currentProfile
      });

      if (newProfile && newProfile !== currentProfile) {
        await config.update(Constants.SETTINGS.PROFILE, newProfile, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`Switched profile to: ${newProfile}`);
        // Clear token for old profile? Usually it's kept. But auto fetches token for new profile on next req.
        treeProvider.refresh();
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('sparkflows.showHistory', () => {
      const history = context.workspaceState.get<any[]>(Constants.STATE.HISTORY) || [];
      const panel = HistoryPanel.getInstance(context.extensionUri);
      panel.setHistory(history);
      panel.show();
    })
  );
}
