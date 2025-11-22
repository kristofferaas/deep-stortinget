"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import AsciiSpinner from "../ascii-spinner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { DataTable } from "./data-table";
import { columns } from "./columns";
import { InferQueryResult } from "@/lib/utils";
import { Play, Square } from "lucide-react";

type SyncRun = InferQueryResult<typeof api.sync.workflow.getSyncRuns>[number];

export default function SyncPage() {
  const syncRuns = useQuery(api.sync.workflow.getSyncRuns);
  const isNightlySyncEnabled = useQuery(api.sync.workflow.isNightlySyncEnabled);
  const isSyncRunning = useQuery(api.sync.workflow.isSyncRunning);
  const toggleNightlySync = useMutation(api.sync.workflow.toggleNightlySync);
  const runManualSync = useAction(api.sync.workflow.runManualSync);
  const cancelRunningSync = useAction(api.sync.workflow.cancelRunningSync);
  const deleteSyncRunsMutation = useMutation(api.sync.workflow.deleteSyncRuns);
  const [isTogglingSync, setIsTogglingSync] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedRuns, setSelectedRuns] = useState<SyncRun[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle manual sync or cancel
  const handleSyncAction = async () => {
    setIsProcessing(true);
    try {
      if (isSyncRunning) {
        await cancelRunningSync({});
      } else {
        await runManualSync({});
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle nightly sync toggle
  const handleToggleNightlySync = async (enabled: boolean) => {
    setIsTogglingSync(true);
    try {
      await toggleNightlySync({ enabled });
    } finally {
      setIsTogglingSync(false);
    }
  };

  // Handle selection change
  const handleSelectionChange = (selected: SyncRun[]) => {
    setSelectedRuns(selected);
  };

  // Handle delete selected runs
  const handleDeleteRuns = async () => {
    if (selectedRuns.length === 0) return;

    setIsDeleting(true);
    try {
      const runIds = selectedRuns.map((run) => run._id);
      await deleteSyncRunsMutation({ runIds });
      setSelectedRuns([]); // Clear selection after delete
    } finally {
      setIsDeleting(false);
    }
  };

  if (
    syncRuns === undefined ||
    isNightlySyncEnabled === undefined ||
    isSyncRunning === undefined
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AsciiSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex flex-col gap-4">
          {/* Toolbar with actions */}
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
              <div className="flex items-center gap-2">
                <Switch
                  checked={isNightlySyncEnabled}
                  onCheckedChange={handleToggleNightlySync}
                  disabled={isTogglingSync}
                  aria-label="Aktivér/deaktivér daglig synkronisering"
                  id="daily-sync-toggle"
                />
                <label
                  htmlFor="daily-sync-toggle"
                  className="text-sm font-medium cursor-pointer"
                >
                  Daglig synk
                </label>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteRuns}
              disabled={selectedRuns.length === 0 || isDeleting}
            >
              {isDeleting
                ? "Sletter..."
                : `Slett${selectedRuns.length > 0 ? ` (${selectedRuns.length})` : ""}`}
            </Button>
          </div>

          {/* Data table */}
          <DataTable
            columns={columns}
            data={syncRuns}
            onSelectionChange={handleSelectionChange}
          />
        </div>
      </div>
    </div>
  );
}
