import type { SelectOption } from "./types";
import { formatLabel } from "@/lib/utils";
import { aiFeatureOptions } from "./types";

export function formatFeatureLabel(value: string) {
  const match = aiFeatureOptions.find((option) => option.value === value);
  return match?.label ?? formatLabel(value);
}

export function buildTabHref(tab: string, searchParams: URLSearchParams) {
  const search = searchParams.toString();
  return search ? `/internal/${tab}?${search}` : `/internal/${tab}`;
}
