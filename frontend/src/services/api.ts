const ENV_API_URL = (((import.meta as any).env?.VITE_API_URL as string) || '').trim().replace(/\/+$/, '');
// When VITE_API_URL is configured (e.g. on Vercel pointing to Render), use full URL; otherwise fallback to '/api' for Vite dev proxy
export const API_BASE = ENV_API_URL
  ? (ENV_API_URL.endsWith('/api') ? ENV_API_URL : `${ENV_API_URL}/api`)
  : '/api';

export function resolveApiUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  let clean = path.trim();
  if (!clean.startsWith('/')) clean = '/' + clean;
  if (API_BASE.endsWith('/api') && clean.startsWith('/api/')) {
    clean = clean.substring(4);
  }
  return `${API_BASE}${clean}`;
}

export function getAuthToken(): string | null {
  return localStorage.getItem('aquasentinel_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('aquasentinel_token', token);
}

export function clearAuthToken(): void {
  localStorage.removeItem('aquasentinel_token');
}

function buildEndpointUrl(endpoint: string): string {
  let ep = endpoint.trim();
  if (!ep.startsWith('/')) ep = '/' + ep;
  if (API_BASE.endsWith('/api') && ep.startsWith('/api/')) {
    ep = ep.substring(4);
  }
  return `${API_BASE}${ep}`;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body instanceof FormData) {
    // Never manually specify Content-Type on FormData so the browser generates the multipart boundary
    delete headers['Content-Type'];
  } else if (!headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const url = buildEndpointUrl(endpoint);

  // 60-second timeout controller to handle Render cold-starts gracefully
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(
        'Request timed out (60s). The AquaSentinel cloud backend may be processing or waking up from sleep. Please try again.'
      );
    }
    const errMsg = String(err.message || err);
    if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError') || errMsg.includes('Load failed')) {
      throw new Error(
        'Unable to reach AquaSentinel backend. The cloud service may be waking up from sleep (Render Free spin-up takes ~30-50s) or offline. Please retry in a few moments.'
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let errorMsg = '';
    try {
      const errorData = await response.json();
      errorMsg = errorData.detail || errorData.message || '';
    } catch {
      // not json
    }

    if (!errorMsg) {
      switch (response.status) {
        case 400:
          errorMsg = 'Invalid request parameters or unsupported sonar file format.';
          break;
        case 401:
          errorMsg = 'Authentication required or session expired. Please sign in again.';
          break;
        case 403:
          errorMsg = 'Access forbidden. You do not have permission for this sonar resource.';
          break;
        case 404:
          errorMsg = 'Requested sonar image or dataset record not found.';
          break;
        case 413:
          errorMsg = 'Image is too large (maximum 15MB). Please upload a smaller sonar image.';
          break;
        case 422:
          errorMsg = 'Validation error in submitted sonar analysis parameters.';
          break;
        case 500:
          errorMsg = 'Internal server error during sonar processing. Please try again.';
          break;
        case 502:
        case 503:
        case 504:
          errorMsg = 'Backend is temporarily unavailable. Please wait ~30 seconds and retry.';
          break;
        default:
          errorMsg = `Server returned HTTP ${response.status}. Please retry.`;
      }
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Auth
  login: (data: { email: string; password: string }) =>
    request<{ access_token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  register: (data: { email: string; password: string; full_name?: string }) =>
    request<{ access_token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  demoLogin: () =>
    request<{ access_token: string; user: any }>('/auth/demo', {
      method: 'POST',
    }),
  getMe: () => request<any>('/auth/me'),

  // Surveys
  getSurveys: () => request<any[]>('/surveys'),
  createSurvey: (data: any) =>
    request<any>('/surveys', { method: 'POST', body: JSON.stringify(data) }),
  getSurveyDetail: (id: number) => request<any>(`/surveys/${id}`),
  getSurveyCoverage: (id: number) => request<any>(`/surveys/${id}/coverage`),
  compareSurveys: (a: number, b: number) => request<any>(`/surveys/compare/${a}/${b}`),

  // Sonar
  uploadSonar: (formData: FormData) =>
    request<any>('/sonar/upload', { method: 'POST', body: formData }),
  enhanceSonar: (imageId: number, params: any) =>
    request<any>(`/sonar/${imageId}/enhance`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  detectObjects: (imageId: number, params: any) =>
    request<any>(`/sonar/${imageId}/detect`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  explainDetection: (imageId: number, detectionId?: number) =>
    request<{ image_id: number; detection_id?: number; saliency_url: string }>(`/sonar/${imageId}/explain`, {
      method: 'POST',
      body: JSON.stringify({ detection_id: detectionId }),
    }),
  getImageDetections: (imageId: number) =>
    request<any[]>(`/sonar/${imageId}/detections`),
  getSeabedScenarios: () => request<any>('/sonar/scenarios'),
  measureShadow: (imageId: number, formData: FormData) =>
    request<any>(`/sonar/${imageId}/measure`, {
      method: 'POST',
      body: formData,
    }),
  exportReport: (surveyId: number, format: 'pdf' | 'csv' | 'json') =>
    request<{ download_url: string }>(`/sonar/export/${surveyId}/${format}`, {
      method: 'POST',
    }),

  // Datasets
  getDatasetSources: () => request<any[]>('/datasets/sources'),
  validateSource: (code: string) =>
    request<any>(`/datasets/validate/${code}`, { method: 'POST' }),
  validateDatasetSource: (code: string) =>
    request<any>(`/datasets/validate/${code}`, { method: 'POST' }),
  getDatasetManifest: () => request<any>('/datasets/manifest'),
  getDatasetSummary: () => request<any>('/datasets/summary'),

  // Models
  getModelRecords: () => request<any[]>('/models/records'),
  activateModel: (id: number) => request<any>(`/models/activate/${id}`, { method: 'POST' }),
  getTrainingStatus: () => request<any>('/models/training/status'),
  startTraining: (params: any) =>
    request<any>('/models/training/start', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  cancelTraining: () => request<any>('/models/training/cancel', { method: 'POST' }),
  getModelComparison: () => request<any>('/models/comparison'),

  // Review
  getReviewQueue: (filterBy = 'uncertainty') =>
    request<any[]>(`/review/queue?filter_by=${filterBy}`),
  submitReviewDecision: (decision: any) =>
    request<any>('/review/decision', {
      method: 'POST',
      body: JSON.stringify(decision),
    }),
  getEvidenceChain: (detectionId: number) =>
    request<any>(`/review/evidence-chain/${detectionId}`),

  // Simulations
  getTheaterPing: (lineIndex = 0) =>
    request<any>(`/simulation/theater/ping?line_index=${lineIndex}`),
  getDigitalTwin: () => request<any>('/simulation/digital-twin/bathymetry'),
  getAuvTelemetry: (step = 0) =>
    request<any>(`/simulation/auv-mission/telemetry?step=${step}`),
  getGhostNetDrift: (hours = 24) =>
    request<any>(`/simulation/ghost-net-drift?hours=${hours}`),
  runWhatIf: (params: any) =>
    request<any>('/simulation/what-if/simulate', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  getRouteOptimizer: () => request<any>('/simulation/route-optimizer'),
  getHolographicHotspots: () => request<any[]>('/simulation/holographic-globe/hotspots'),
  getCalibrationMetrics: () => request<any>('/simulation/calibration-lab'),
  getTimeMachine: (years = 1) =>
    request<any>(`/simulation/time-machine?years=${years}`),
  getEcologicalImpact: () => request<any>('/simulation/ecological-impact'),

  // Assistant & Telemetry
  chatAssistant: (msg: string, surveyId?: number) =>
    request<any>('/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message: msg, survey_id: surveyId }),
    }),
  getTelemetry: () => request<any>('/analytics/telemetry'),
  getAuditLogs: () => request<any[]>('/analytics/audit-logs'),
  getEdgeArena: () => request<any>('/analytics/edge-arena'),
  getNotifications: () => request<any[]>('/analytics/notifications'),
};
