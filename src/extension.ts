import * as vscode from 'vscode';
import { AuthService } from './services/authService';
import { FlowService } from './services/flowService';
import { ProjectTreeProvider } from './providers/projectTreeProvider';
import { registerCommands } from './commands';
import { Constants } from './utils/constants';

export function activate(context: vscode.ExtensionContext) {
  console.log('Sparkflows extension is now active!');

  // Initialize Core Services
  AuthService.getInstance().initialize(context);
  FlowService.getInstance().initialize(context);

  // Initialize and register Providers
  const projectTreeProvider = new ProjectTreeProvider();
  vscode.window.registerTreeDataProvider(Constants.VIEWS.PROJECTS, projectTreeProvider);

  // Register Commands
  registerCommands(context, projectTreeProvider);

  // Initial trigger to load projects if view is visible, though VS Code handles lazy loading
}

export function deactivate() {
  // Cleanup if needed
}
