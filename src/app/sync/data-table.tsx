"use client";

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  RowSelectionState,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
import { columns } from "./columns";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAction, useMutation, useQuery } from "convex/react";
import { Play, Square } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import AsciiSpinner from "../ascii-spinner";
import { SyncSettingsDialog } from "./sync-settings-dialog";

export function DataTable() {
  const data = useQuery(api.sync.workflow.getSyncRuns);
  const isSyncRunning = useQuery(api.sync.workflow.isSyncRunning);
  const runManualSync = useAction(api.sync.workflow.startWorkflow);
  const cancelRunningSync = useAction(api.sync.workflow.cancelRunningSync);
  const deleteSyncRunsMutation = useMutation(api.sync.workflow.deleteSyncRuns);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle manual sync or cancel
  const handleSyncAction = async () => {
    setIsProcessing(true);
    try {
      if (isSyncRunning) {
        await cancelRunningSync({});
      } else {
        await runManualSync({ force: true });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "startedAt",
      desc: true,
    },
  ]);
  const selectedIds = Object.keys(rowSelection) as Id<"syncRuns">[];

  // Handle delete selected runs
  const handleDeleteRuns = async () => {
    if (selectedIds.length === 0) return;

    setIsDeleting(true);
    try {
      await deleteSyncRunsMutation({ runIds: selectedIds });
      setRowSelection({});
    } finally {
      setIsDeleting(false);
    }
  };

  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    state: {
      rowSelection,
      sorting,
    },
    enableRowSelection: true,
    getRowId: (row) => {
      return row._id;
    },
  });

  if (data === undefined || isSyncRunning === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AsciiSpinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Button
            onClick={handleSyncAction}
            disabled={isProcessing}
            size="sm"
            variant={isSyncRunning ? "destructive" : "default"}
          >
            {isSyncRunning ? (
              <>
                <Square className="h-4 w-4" />
                {isProcessing ? "Stopper..." : "Stopp synk"}
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                {isProcessing ? "Starter..." : "Kjør synk"}
              </>
            )}
          </Button>
          <SyncSettingsDialog />
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDeleteRuns}
          disabled={selectedIds.length === 0 || isDeleting}
        >
          {isDeleting
            ? "Sletter..."
            : `Slett${selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}`}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Ingen resultater.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
