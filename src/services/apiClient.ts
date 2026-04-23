import axios, { AxiosInstance } from 'axios';
import * as vscode from 'vscode';
import { AuthService } from './authService';
import { Constants } from '../utils/constants';
import { Project, FlowItem, PipelinesResponse } from '../models';

export class ApiClient {
  private static instance: ApiClient;
  private client: AxiosInstance;

  private status = ['RUNNING', 'STOPPED', 'COMPLETED', 'FAILED', 'STARTING', 'STOP', 'KILLED', 'STOPPING', 'TIMEOUT', 'PENDING', 'SKIPPED', 'SKIPPED'];

  private constructor() {
    this.client = axios.create();

    // Request interceptor to attach bearer token
    this.client.interceptors.request.use(
      async (config) => {
        const configSettings = vscode.workspace.getConfiguration();
        const serverUrl = configSettings.get<string>(Constants.SETTINGS.SERVER_URL) || 'http://localhost:8080';
        config.baseURL = serverUrl;

        try {
          const token = await AuthService.getInstance().getToken();
          if (token) {
            config.headers['token'] = token;
          }
        } catch (error) {
          // Token generation failed, allow request to fail naturally or handle it here
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  public async getProjects(): Promise<Project[]> {
    const response = await this.client.get<Project[]>('/api/v1/project/info?sortBy=name');
    return response.data;
  }

  public async getFlowItems(projectId: number): Promise<FlowItem[]> {
    // Parallel API Calls
    const [workflowsResponse, pipelinesResponse] = await Promise.all([
      this.client.get<any[]>(`/api/v1/workflows?projectId=${projectId}`),
      this.client.get<PipelinesResponse>(
        `/api/v1/pipelines/project?page=0&size=1000&sortBy=dateLastUpdated&sortOrder=dsc&projectId=${projectId}`
      )
    ]);

    const workflows = workflowsResponse.data;
    const pipelines = pipelinesResponse.data.result || [];

    // Normalization
    const unified: FlowItem[] = [
      ...workflows.map(this.mapWorkflow),
      ...pipelines.map(this.mapPipeline)
    ];

    return unified;
  }

  private mapWorkflow(data: any): FlowItem {
    return {
      id: data.id,
      uuid: data.uuid,
      name: data.name,
      projectId: data.projectId,
      category: 'workflow',
      createdAt: data.createdAt || Date.now(),
      updatedAt: data.updatedAt || Date.now(),
      state: data.state || 'Unknown'
    };
  }

  private mapPipeline(data: any): FlowItem {
    return {
      id: data.id,
      uuid: data.uuid,
      name: data.name,
      projectId: data.projectId,
      category: 'pipeline',
      createdAt: data.createdAt || Date.now(),
      updatedAt: data.updatedAt || Date.now(),
      state: data.state || 'Unknown'
    };
  }

  public async executeWorkflow(workflowId: number): Promise<number> {
    const payload = { workflowId };
    const response = await this.client.post('/api/v1/workflow/execute', payload);
    return response.data;
  }

  public async getWorkflowExecutionStatus(executionId: number): Promise<string> {
    const response = await this.client.get(`/api/v1/workflow-executions/${executionId}/status`);
    return response.data;
  }

  public async executePipeline(pipelineName: string, projectId: number): Promise<number> {
    const response = await this.client.post(`/api/v1/executePipeline?pipelineName=${encodeURIComponent(pipelineName)}&projectId=${projectId}`, {});
    return response.data;
  }

  public async getPipelineExecutionStatus(executionId: number): Promise<string> {
    const response = await this.client.get(`/api/v1/pipelines/execution/${executionId}/refreshStatus`);
    return this.status[response.data.status];
  }
}
