export type QaScriptCategory = "smoke" | "regression" | "static" | "build" | "database" | "frontend";
export type QaRunStatus = "QUEUED" | "RUNNING" | "PASSED" | "FAILED" | "CANCELLED";
export type QaRunStream = "stdout" | "stderr" | "system";

export type QaRunListItem = {
  id: string;
  scriptId: string;
  scriptName: string;
  status: QaRunStatus;
  exitCode: number | null;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  actorEmail: string;
  actorRoles: string[];
  command: string;
  scope: "backend" | "frontend";
  category: QaScriptCategory;
  notes?: string;
};

export type QaRunLogLine = {
  at: string;
  stream: QaRunStream;
  message: string;
};

export type QaRunDetail = QaRunListItem & {
  output: string;
  logs: QaRunLogLine[];
};

export type QaScriptSummary = {
  id: string;
  name: string;
  description: string;
  category: QaScriptCategory;
  scope: "backend" | "frontend";
  command: string;
  timeoutMs: number;
  requiresRunningApi: boolean;
  available: boolean;
  unavailableReason?: string;
  lastRun?: QaRunListItem;
};

