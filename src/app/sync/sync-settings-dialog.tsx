"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";

export function SyncSettingsDialog() {
  const [open, setOpen] = useState(false);
  const isNightlySyncEnabled = useQuery(api.sync.workflow.isNightlySyncEnabled);
  const retentionDays = useQuery(api.sync.workflow.getSyncRunsRetentionDays);
  const toggleNightlySync = useMutation(api.sync.workflow.toggleNightlySync);
  const updateRetentionDays = useMutation(
    api.sync.workflow.updateSyncRunsRetentionDays,
  );

  const [isTogglingSync, setIsTogglingSync] = useState(false);
  const [isUpdatingRetention, setIsUpdatingRetention] = useState(false);
  const [retentionInput, setRetentionInput] = useState<string>("");

  // Update local input when data loads
  if (retentionDays !== undefined && retentionInput === "") {
    setRetentionInput(retentionDays.toString());
  }

  const handleToggleNightlySync = async (enabled: boolean) => {
    setIsTogglingSync(true);
    try {
      await toggleNightlySync({ enabled });
    } finally {
      setIsTogglingSync(false);
    }
  };

  const handleUpdateRetentionDays = async () => {
    const days = parseInt(retentionInput, 10);
    if (isNaN(days) || days < 1) {
      return;
    }

    setIsUpdatingRetention(true);
    try {
      await updateRetentionDays({ days });
    } finally {
      setIsUpdatingRetention(false);
    }
  };

  const hasRetentionChanged =
    retentionDays !== undefined &&
    retentionInput !== "" &&
    parseInt(retentionInput, 10) !== retentionDays;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4" />
          Innstillinger
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Synkroniseringsinnstillinger</DialogTitle>
          <DialogDescription>
            Administrer innstillinger for synkronisering av data
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-6 py-4">
          {/* Daily sync toggle */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="daily-sync" className="text-sm font-medium">
              Daglig synkronisering
            </Label>
            <div className="flex items-center gap-2">
              <Switch
                id="daily-sync"
                checked={isNightlySyncEnabled ?? false}
                onCheckedChange={handleToggleNightlySync}
                disabled={isTogglingSync || isNightlySyncEnabled === undefined}
              />
              <span className="text-sm text-muted-foreground">
                {isNightlySyncEnabled
                  ? "Automatisk synkronisering aktivert"
                  : "Automatisk synkronisering deaktivert"}
              </span>
            </div>
          </div>

          {/* Retention days input */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="retention-days" className="text-sm font-medium">
              Oppbevaringstid for synkroniseringslogger
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="retention-days"
                type="number"
                min="1"
                value={retentionInput}
                onChange={(e) => setRetentionInput(e.target.value)}
                disabled={isUpdatingRetention || retentionDays === undefined}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">dager</span>
            </div>
            {hasRetentionChanged && (
              <Button
                size="sm"
                onClick={handleUpdateRetentionDays}
                disabled={isUpdatingRetention}
              >
                {isUpdatingRetention ? "Lagrer..." : "Lagre"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
