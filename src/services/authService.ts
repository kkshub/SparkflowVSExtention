import * as vscode from 'vscode';
import { Constants } from '../utils/constants';

export class AuthService {
  private static instance: AuthService;
  private context!: vscode.ExtensionContext;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public initialize(context: vscode.ExtensionContext) {
    this.context = context;
  }

  private getProfile(): string {
    const config = vscode.workspace.getConfiguration();
    return config.get<string>(Constants.SETTINGS.PROFILE) || 'default';
  }

  private getSecretKey(): string {
    return `sparkflows.token.${this.getProfile()}`;
  }

  public async getToken(): Promise<string | undefined> {
    const secretKey = this.getSecretKey();
    const token = await this.context.secrets.get(secretKey);

    if (!token) {
      vscode.window.showWarningMessage('No Sparkflows access token found for the current profile. Please set one using the "Set Profile Token" command.');
    }

    return token;
  }

  public async setToken(token: string): Promise<void> {
    const secretKey = this.getSecretKey();
    const cleanToken = token.trim().replace(/^["']|["']$/g, '');
    await this.context.secrets.store(secretKey, cleanToken);
  }

  public async clearToken(): Promise<void> {
    const secretKey = this.getSecretKey();
    await this.context.secrets.delete(secretKey);
  }
}
