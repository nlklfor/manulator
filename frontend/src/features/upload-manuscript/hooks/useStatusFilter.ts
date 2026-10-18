import { useState } from "react";
import type { SegmentedOption } from "@/components/ui/Segmented";
import { FILTER_STATUSES, STATUS_LABELS } from "../constants/status";
import type { LibraryEntry, StatusFilter } from "../types/upload";

function filterByStatus(entries: LibraryEntry[], filter: StatusFilter): LibraryEntry[] {
  if (filter === "all") return entries;
  return entries.filter((entry) => entry.status === filter);
}

export function useStatusFilter(entries: LibraryEntry[]) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filterOptions: SegmentedOption<StatusFilter>[] = [
    { value: "all", label: "All", count: entries.length },
    ...FILTER_STATUSES.map((status) => ({
      value: status,
      label: STATUS_LABELS[status],
      count: filterByStatus(entries, status).length,
    })),
  ];

  return {
    statusFilter,
    setStatusFilter,
    filterOptions,
    filteredEntries: filterByStatus(entries, statusFilter),
    activeFilterLabel: statusFilter === "all" ? "All" : STATUS_LABELS[statusFilter],
  };
}
