export type JobType =
  | 'mcp_health_check'
  | 'daily_finance_digest'
  | 'daily_task_standup'
  | 'email_bank_sync';

export type CronJobStatus = 'success' | 'failed' | 'running';

export interface CronJob {
  id: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  schedule: string;
  jobType: JobType;
  config: Record<string, unknown>;
  isEnabled: boolean;
  lastRunAt?: Date | string | null;
  nextRunAt?: Date | string | null;
  lastStatus?: CronJobStatus | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CronLog {
  id: string;
  jobId: string;
  status: 'success' | 'failed';
  durationMs?: number | null;
  summary?: string | null;
  details?: Record<string, unknown> | null;
  createdAt: Date | string;
}

export interface CreateCronJobInput {
  workspaceId?: string;
  name: string;
  description?: string | null;
  schedule: string;
  jobType: JobType;
  config?: Record<string, unknown>;
  isEnabled?: boolean;
}

export interface UpdateCronJobInput {
  name?: string;
  description?: string | null;
  schedule?: string;
  jobType?: JobType;
  config?: Record<string, unknown>;
  isEnabled?: boolean;
}
