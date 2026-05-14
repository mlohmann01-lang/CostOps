const base = "/api/execution-orchestration";

const json = async <T>(res: Response): Promise<T> => {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error ?? `Request failed (${res.status})`);
  }
  return data as T;
};

export const listExecutionPlans = () => fetch(`${base}/plans`).then(json<any[]>);
export const getExecutionPlan = (id: number) => fetch(`${base}/plans/${id}`).then(json<any>);
export const getExecutionPlanItems = (id: number) => fetch(`${base}/plans/${id}/items`).then(json<any[]>);
export const getExecutionPlanEvents = (id: number) => fetch(`${base}/plans/${id}/events`).then(json<any[]>);
export const getExecutionQueueStatus = () => fetch(`${base}/queue/status`).then(json<any>);
export const pauseExecutionPlan = (id: number) => fetch(`${base}/plans/${id}/pause`, { method: "POST" }).then(json<any>);
export const resumeExecutionPlan = (id: number) => fetch(`${base}/plans/${id}/resume`, { method: "POST" }).then(json<any>);
export const cancelExecutionPlan = (id: number) => fetch(`${base}/plans/${id}/cancel`, { method: "POST" }).then(json<any>);
export const retryExecutionQueueItem = (id: number) => fetch(`${base}/items/${id}/retry`, { method: "POST" }).then(json<any>);
export const cancelExecutionQueueItem = (id: number) => fetch(`${base}/items/${id}/cancel`, { method: "POST" }).then(json<any>);
export const listExecutionEscalations = () => fetch(`${base}/escalations`).then(json<any[]>);
export const acknowledgeExecutionEscalation = (id: number) => fetch(`${base}/escalations/${id}/acknowledge`, { method: "POST" }).then(json<any>);
export const resolveExecutionEscalation = (id: number) => fetch(`${base}/escalations/${id}/resolve`, { method: "POST" }).then(json<any>);
