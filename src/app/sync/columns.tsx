"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { InferQueryResult } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";

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
    case "error":
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
    case "error":
      return "Feilet";
    case "canceled":
      return "Avbrutt";
  }
};

// Format duration
const formatDuration = (
  startedAt: number,
  finishedAt?: number,
): string | null => {
  const end = finishedAt || Date.now();
  const durationMs = end - startedAt;
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}t ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
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
      const duration = formatDuration(startedAt, finishedAt);
      return <div className="text-sm">{duration}</div>;
    },
  },
  {
    accessorKey: "partiesCount",
    header: ({ column }) => {
      return (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Partier
          {column.getIsSorted() === "asc" && <span>↑</span>}
          {column.getIsSorted() === "desc" && <span>↓</span>}
        </button>
      );
    },
    cell: ({ row }) => {
      const count = row.getValue("partiesCount") as number | undefined;
      return <div className="text-sm">{count ?? "-"}</div>;
    },
  },
  {
    accessorKey: "casesCount",
    header: ({ column }) => {
      return (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Saker
          {column.getIsSorted() === "asc" && <span>↑</span>}
          {column.getIsSorted() === "desc" && <span>↓</span>}
        </button>
      );
    },
    cell: ({ row }) => {
      const count = row.getValue("casesCount") as number | undefined;
      return <div className="text-sm">{count ?? "-"}</div>;
    },
  },
  {
    accessorKey: "votesCount",
    header: ({ column }) => {
      return (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Voteringer
          {column.getIsSorted() === "asc" && <span>↑</span>}
          {column.getIsSorted() === "desc" && <span>↓</span>}
        </button>
      );
    },
    cell: ({ row }) => {
      const count = row.getValue("votesCount") as number | undefined;
      return <div className="text-sm">{count ?? "-"}</div>;
    },
  },
  {
    accessorKey: "voteProposalsCount",
    header: ({ column }) => {
      return (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Forslag
          {column.getIsSorted() === "asc" && <span>↑</span>}
          {column.getIsSorted() === "desc" && <span>↓</span>}
        </button>
      );
    },
    cell: ({ row }) => {
      const count = row.getValue("voteProposalsCount") as number | undefined;
      return <div className="text-sm">{count ?? "-"}</div>;
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
