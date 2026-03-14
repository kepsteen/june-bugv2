export const TIME_RANGE_OPTIONS = [1, 24, 48, 168] as const;
export const DEFAULT_TIME_RANGE = 24;
export const DEFAULT_REFRESH_VALUE = "off";

export type DashboardTab = "ai" | "queues" | "platform";

export type DashboardContextValue = {
  timeRange: number;
  setTimeRange: (hours: number) => void;
  refreshInterval: number | false;
};

export type SelectOption = {
  value: string;
  label: string;
};

export const dashboardTabs: { value: DashboardTab; label: string }[] = [
  { value: "ai", label: "AI Usage" },
  { value: "queues", label: "Queue Health" },
  { value: "platform", label: "Platform Overview" },
];

export const aiFeatureOptions: SelectOption[] = [
  { value: "all", label: "All features" },
  { value: "entry_title", label: "Entry title" },
  { value: "memory_extraction", label: "Memory extraction" },
  { value: "personalized_prompts", label: "Personalized prompts" },
];

export const aiStatusOptions: SelectOption[] = [
  { value: "all", label: "All statuses" },
  { value: "success", label: "Success" },
  { value: "fallback", label: "Fallback" },
  { value: "error", label: "Error" },
];

export const queueStatusOptions: SelectOption[] = [
  { value: "all", label: "All statuses" },
  { value: "published", label: "Published" },
  { value: "processing", label: "Processing" },
  { value: "retrying", label: "Retrying" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "dead_lettered", label: "Dead lettered" },
  { value: "skipped", label: "Skipped" },
];

export const queueOutcomeOptions: SelectOption[] = [
  { value: "all", label: "All outcomes" },
  { value: "success", label: "Success" },
  { value: "idempotent_duplicate", label: "Idempotent duplicate" },
  { value: "stale_update", label: "Stale update" },
  { value: "no_entry_text", label: "No entry text" },
  { value: "no_candidates", label: "No candidates" },
  { value: "validation_error", label: "Validation error" },
  { value: "processing_error", label: "Processing error" },
  { value: "max_retries_exceeded", label: "Max retries exceeded" },
];
