"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
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
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as SyncRun["status"];
      return (
        <Badge variant={getStatusVariant(status)}>{formatStatus(status)}</Badge>
      );
    },
  },
  {
    accessorKey: "startedAt",
    header: "Startet",
    cell: ({ row }) => {
      const startedAt = row.getValue("startedAt") as number;
      return <div className="text-sm">{formatDateTime(startedAt)}</div>;
    },
  },
  {
    id: "duration",
    header: "Varighet",
    cell: ({ row }) => {
      const startedAt = row.original.startedAt;
      const finishedAt = row.original.finishedAt;
      const duration = formatDuration(startedAt, finishedAt);
      return <div className="text-sm">{duration}</div>;
    },
  },
  {
    accessorKey: "partiesCount",
    header: "Partier",
    cell: ({ row }) => {
      const count = row.getValue("partiesCount") as number | undefined;
      return <div className="text-sm">{count ?? "-"}</div>;
    },
  },
  {
    accessorKey: "casesCount",
    header: "Saker",
    cell: ({ row }) => {
      const count = row.getValue("casesCount") as number | undefined;
      return <div className="text-sm">{count ?? "-"}</div>;
    },
  },
  {
    accessorKey: "votesCount",
    header: "Voteringer",
    cell: ({ row }) => {
      const count = row.getValue("votesCount") as number | undefined;
      return <div className="text-sm">{count ?? "-"}</div>;
    },
  },
  {
    accessorKey: "voteProposalsCount",
    header: "Forslag",
    cell: ({ row }) => {
      const count = row.getValue("voteProposalsCount") as number | undefined;
      return <div className="text-sm">{count ?? "-"}</div>;
    },
  },
  {
    accessorKey: "message",
    header: "Melding",
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
