export type SearchResultItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  meta?: Record<string, unknown>;
};

export type SearchResultGroup = {
  type: "employees" | "positions" | "documents" | "organization" | "workflows";
  label: string;
  total: number;
  results: SearchResultItem[];
};

export type GlobalSearchResults = {
  query: string;
  generatedAt: string;
  groups: SearchResultGroup[];
};
