export type QualitySeverity = "low" | "medium" | "high" | "critical";

export type DataQualityIssue = {
  id: string;
  severity: QualitySeverity;
  title: string;
  description: string;
  href: string;
  entityType: string;
  entityId: string;
};

export type DataQualityGroup = {
  code: string;
  title: string;
  description: string;
  issueCount: number;
  scoreImpact: number;
  bySeverity: Record<QualitySeverity, number>;
  metrics: Array<{ label: string; value: number }>;
  issues: DataQualityIssue[];
  recommendedActions: string[];
};

export type DataQualityDashboard = {
  generatedAt: string;
  score: number;
  summary: Record<"totalIssues" | "critical" | "high" | "medium" | "low", number>;
  groups: DataQualityGroup[];
  recommendedActions: string[];
};
