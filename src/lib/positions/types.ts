import type { OrganizationNode } from "@/lib/organization/types";

export type PositionStatus = "DRAFT" | "ACTIVE" | "FROZEN" | "CLOSED" | "ARCHIVED";

export type PositionCapacity = {
  budgetedHeadcount: number;
  occupied: number;
  vacant: number;
  overBudget: number;
  utilizationRate: number;
};

export type PositionGrade = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  rank?: number | null;
  description?: string | null;
  _count?: {
    positions: number;
    assignments: number;
  };
};

export type PositionLevel = PositionGrade;

export type Skill = {
  id: string;
  tenantId?: string | null;
  name: string;
  category?: string | null;
  _count?: {
    personSkills: number;
    positionSkills: number;
  };
};

export type PositionSkill = {
  id: string;
  required: boolean;
  minimumProficiency?: string | null;
  skill: Skill;
};

export type Position = {
  id: string;
  tenantId: string;
  code: string;
  title: string;
  description?: string | null;
  status: PositionStatus;
  budgetedHeadcount: number;
  isCritical: boolean;
  isExecutive: boolean;
  organizationNode?: Pick<OrganizationNode, "id" | "code" | "name" | "type"> | null;
  costCenter?: { id: string; code: string; name: string } | null;
  grade?: PositionGrade | null;
  level?: PositionLevel | null;
  reportsToPosition?: Pick<Position, "id" | "code" | "title" | "status"> | null;
  skills?: PositionSkill[];
  capacity: PositionCapacity;
  _count?: {
    childPositions: number;
    assignments: number;
    skills: number;
  };
};

export type PositionTreeNode = Pick<
  Position,
  | "id"
  | "code"
  | "title"
  | "status"
  | "isCritical"
  | "isExecutive"
> & {
  organizationNodeId?: string | null;
  costCenterId?: string | null;
  gradeId?: string | null;
  levelId?: string | null;
  reportsToPositionId?: string | null;
  capacity: PositionCapacity;
  children: PositionTreeNode[];
};

export type PositionRisk = {
  positionId: string;
  code: string;
  title: string;
  reason: string;
  capacity: PositionCapacity;
};

export type PositionSummary = {
  totalPositions: number;
  totalBudgetedHeadcount: number;
  totalOccupied: number;
  totalVacant: number;
  totalOverBudget: number;
  utilizationRate: number;
  criticalPositions: number;
  executivePositions: number;
  byStatus: Partial<Record<PositionStatus, number>>;
  byOrganizationNode: Array<{
    organizationNodeId: string | null;
    positions: number;
    budgetedHeadcount: number;
    occupied: number;
    vacant: number;
    overBudget: number;
  }>;
  positionsAtRisk: PositionRisk[];
};

export type PaginatedPositions = {
  data: Position[];
  page: {
    limit: number;
    nextCursor?: string | null;
  };
};

export type PaginatedGrades = {
  data: PositionGrade[];
  page: {
    limit: number;
    nextCursor?: string | null;
  };
};

export type PaginatedLevels = {
  data: PositionLevel[];
  page: {
    limit: number;
    nextCursor?: string | null;
  };
};

export type PaginatedSkills = {
  data: Skill[];
  page: {
    limit: number;
    nextCursor?: string | null;
  };
};

