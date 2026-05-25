export type OrganizationNodeType =
  | "COMPANY"
  | "REGION"
  | "COUNTRY_OFFICE"
  | "BRANCH"
  | "DIVISION"
  | "DEPARTMENT"
  | "UNIT"
  | "TEAM"
  | "PROJECT_GROUP";

export type OrganizationNode = {
  id: string;
  tenantId: string;
  parentId?: string | null;
  type: OrganizationNodeType;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  parent?: Pick<OrganizationNode, "id" | "code" | "name" | "type"> | null;
  children?: OrganizationTreeNode[];
  _count?: {
    children: number;
    costCenters: number;
    positions: number;
    assignments: number;
  };
};

export type OrganizationTreeNode = OrganizationNode & {
  children: OrganizationTreeNode[];
};

export type CostCenter = {
  id: string;
  tenantId: string;
  organizationNodeId?: string | null;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  organizationNode?: OrganizationNode | null;
};

export type PaginatedOrganizationNodes = {
  data: OrganizationNode[];
  page: {
    limit: number;
    nextCursor?: string | null;
  };
};

export type PaginatedCostCenters = {
  data: CostCenter[];
  page: {
    limit: number;
    nextCursor?: string | null;
  };
};

