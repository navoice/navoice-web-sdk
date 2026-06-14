/**
 * API response types (match iOS SDK / backend).
 */

export interface LicenseValidateResponse {
  ok: boolean;
  status?: string;
  project_id?: string;
  token?: string;
  expires_at?: string;
  project_expires_at?: string;
  cache_ttl_seconds?: number;
  error?: string;
}

export interface RouteResponseTask {
  id: string;
  confidence: number;
}

export interface RouteResponseChoice {
  task_id: string;
  title: string;
  confidence: number;
  screen_id?: string;
  params?: Record<string, string>;
}

export interface RouteResponsePlanStep {
  type: string;
  to?: string;
  via?: string;
}

export interface RouteResponse {
  mode: string;
  task?: RouteResponseTask;
  say?: string;
  screenId?: string;
  params?: Record<string, string>;
  plan?: RouteResponsePlanStep[];
  choices?: RouteResponseChoice[];
  reason?: string;
  requiredPlan?: string;
}
