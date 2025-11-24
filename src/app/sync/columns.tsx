"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { InferQueryResult } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";
import { DurationCell } from "./duration-cell";
import { SyncRunDetailsDialog } from "./sync-run-details-dialog";

type SyncRun = InferQueryResult<typeof api.sync.workflow.getSyncRuns>[number];

// Map status to badge variant
const getStatusVariant = (
  status: SyncRun["status"],
): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "success":
      return "secondary";
    case "started":
      return "default";
    case "failed":
    case "canceled":
      return "destructive";
  }
};

// Format status text for display
const formatStatus = (status: SyncRun["status"]) => {
  switch (status) {
    case "started":
      return "Synkroniserer";
    case "success":
      return "Vellykket";
    case "failed":
      return "Feilet";
    case "canceled":
      return "Avbrutt";
  }
};

// Format date/time
const formatDateTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString("nb-NO", {
    dateStyle: "short",
    timeStyle: "medium",
  });
};

export const columns: ColumnDef<SyncRun>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          {column.getIsSorted() === "asc" && <span>↑</span>}
          {column.getIsSorted() === "desc" && <span>↓</span>}
        </button>
      );
    },
    cell: ({ row }) => {
      const status = row.getValue("status") as SyncRun["status"];
      return (
        <Badge variant={getStatusVariant(status)}>{formatStatus(status)}</Badge>
      );
    },
  },
  {
    accessorKey: "startedAt",
    header: ({ column }) => {
      return (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Startet
          {column.getIsSorted() === "asc" && <span>↑</span>}
          {column.getIsSorted() === "desc" && <span>↓</span>}
        </button>
      );
    },
    cell: ({ row }) => {
      const startedAt = row.getValue("startedAt") as number;
      return <div className="text-sm">{formatDateTime(startedAt)}</div>;
    },
  },
  {
    id: "duration",
    header: ({ column }) => {
      return (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Varighet
          {column.getIsSorted() === "asc" && <span>↑</span>}
          {column.getIsSorted() === "desc" && <span>↓</span>}
        </button>
      );
    },
    accessorFn: (row) => {
      // Calculate duration in milliseconds for sorting
      const end = row.finishedAt || Date.now();
      return end - row.startedAt;
    },
    cell: ({ row }) => {
      const startedAt = row.original.startedAt;
      const finishedAt = row.original.finishedAt;
      return <DurationCell startedAt={startedAt} finishedAt={finishedAt} />;
    },
  },
  {
    id: "added",
    header: "Lagt til",
    accessorFn: (row) => {
      const total =
        (row.partiesAdded ?? 0) +
        (row.casesAdded ?? 0) +
        (row.votesAdded ?? 0) +
        (row.voteProposalsAdded ?? 0);
      return total;
    },
    cell: ({ row }) => {
      const total =
        (row.original.partiesAdded ?? 0) +
        (row.original.casesAdded ?? 0) +
        (row.original.votesAdded ?? 0) +
        (row.original.voteProposalsAdded ?? 0);
      return (
        <div className="text-sm text-green-600 dark:text-green-400 font-medium">
          {total}
        </div>
      );
    },
  },
  {
    id: "updated",
    header: "Oppdatert",
    accessorFn: (row) => {
      const total =
        (row.partiesUpdated ?? 0) +
        (row.casesUpdated ?? 0) +
        (row.votesUpdated ?? 0) +
        (row.voteProposalsUpdated ?? 0);
      return total;
    },
    cell: ({ row }) => {
      const total =
        (row.original.partiesUpdated ?? 0) +
        (row.original.casesUpdated ?? 0) +
        (row.original.votesUpdated ?? 0) +
        (row.original.voteProposalsUpdated ?? 0);
      return (
        <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
          {total}
        </div>
      );
    },
  },
  {
    id: "skipped",
    header: "Hoppet over",
    accessorFn: (row) => {
      const total =
        (row.partiesSkipped ?? 0) +
        (row.casesSkipped ?? 0) +
        (row.votesSkipped ?? 0) +
        (row.voteProposalsSkipped ?? 0);
      return total;
    },
    cell: ({ row }) => {
      const total =
        (row.original.partiesSkipped ?? 0) +
        (row.original.casesSkipped ?? 0) +
        (row.original.votesSkipped ?? 0) +
        (row.original.voteProposalsSkipped ?? 0);
      return (
        <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
          {total}
        </div>
      );
    },
  },
  {
    id: "details",
    header: "Detaljer",
    enableSorting: false,
    cell: ({ row }) => {
      return <SyncRunDetailsDialog syncRun={row.original} />;
    },
  },
  {
    accessorKey: "message",
    header: "Melding",
    enableSorting: false,
    cell: ({ row }) => {
      const message = row.getValue("message") as string | undefined;
      return message ? (
        <div className="text-sm text-muted-foreground max-w-xs truncate">
          {message}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">-</div>
      );
    },
  },
];
