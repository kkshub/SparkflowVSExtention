export interface Project {
  id: number;
  name: string;
  sharedGroups: number[];
}

export interface FlowItem {
  id: number;
  uuid: string;
  name: string;
  projectId: number;
  category: 'workflow' | 'pipeline';
  createdAt: number;
  updatedAt: number;
  state?: string;
}

export interface PipelinesResponse {
  count: number;
  result: any[];
}

// History interface
export interface HistoryItem {
  id: string; // UUID for the history entry
  type: 'Execution' | 'Fetch' | 'Import' | 'Update';
  name: string;
  flowId: number;
  profile: string;
  timestamp: number;
  status: 'Success' | 'Failed' | 'In Progress';
}
