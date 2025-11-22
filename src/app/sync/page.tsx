"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AsciiSpinner from "../ascii-spinner";
import { InferQueryResult } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { DataTable } from "./data-table";
import { columns } from "./columns";

type SyncRun = NonNullable<
  InferQueryResult<typeof api.sync.workflow.getLatestSyncRun>
>;

export default function SyncPage() {
  const syncRun = useQuery(api.sync.workflow.getLatestSyncRun);
  const syncRuns = useQuery(api.sync.workflow.getSyncRuns);
  const isNightlySyncEnabled = useQuery(api.sync.workflow.isNightlySyncEnabled);
  const toggleNightlySync = useMutation(api.sync.workflow.toggleNightlySync);
  const [now, setNow] = useState(Date.now());
  const [isTogglingSync, setIsTogglingSync] = useState(false);

  // Update timer every second when sync is running
  useEffect(() => {
    if (syncRun?.status === "started") {
      const interval = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(interval);
    }
  }, [syncRun?.status]);

  // Handle nightly sync toggle
  const handleToggleNightlySync = async (enabled: boolean) => {
    setIsTogglingSync(true);
    try {
      await toggleNightlySync({ enabled });
    } finally {
      setIsTogglingSync(false);
    }
  };

  // Map status to badge variant
  const getStatusVariant = (status: SyncRun["status"]) => {
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

  // Calculate duration
  const formatDuration = (
    startedAt?: number,
    finishedAt?: number,
  ): string | null => {
    if (!startedAt) return null;

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
  const formatDateTime = (timestamp?: number): string | null => {
    if (!timestamp) return null;
    return new Date(timestamp).toLocaleString("nb-NO", {
      dateStyle: "short",
      timeStyle: "medium",
    });
  };

  if (
    syncRun === undefined ||
    syncRuns === undefined ||
    isNightlySyncEnabled === undefined
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AsciiSpinner />
      </div>
    );
  }

  if (!syncRun) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <h1 className="text-3xl font-bold mb-8">Synkroniseringsstatus</h1>
          <Card>
            <CardHeader>
              <CardTitle>Ingen synkroniseringsstatus tilgjengelig</CardTitle>
              <CardDescription>
                Synkronisering har ikke blitt kjørt ennå.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  const duration = formatDuration(
    syncRun.startedAt,
    syncRun.status === "started" ? now : syncRun.finishedAt,
  );
  const startTime = formatDateTime(syncRun.startedAt);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Synkroniseringsstatus</h1>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-xl">Nattlig synkronisering</CardTitle>
                  <CardDescription>
                    {isNightlySyncEnabled
                      ? "Automatisk synkronisering kjører daglig kl. 03:00 UTC"
                      : "Automatisk synkronisering er deaktivert"}
                  </CardDescription>
                </div>
                <Switch
                  checked={isNightlySyncEnabled}
                  onCheckedChange={handleToggleNightlySync}
                  disabled={isTogglingSync}
                  aria-label="Aktivér/deaktivér nattlig synkronisering"
                />
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Status</CardTitle>
                <Badge variant={getStatusVariant(syncRun.status)}>
                  {formatStatus(syncRun.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {startTime && (
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">Startet</p>
                  <p className="text-sm text-muted-foreground">{startTime}</p>
                </div>
              )}

              {duration && (
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">
                    {syncRun.status === "started"
                      ? "Varighet"
                      : "Total varighet"}
                  </p>
                  <p className="text-sm text-muted-foreground">{duration}</p>
                </div>
              )}

              {syncRun.message && (
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">Melding</p>
                  <p className="text-sm text-muted-foreground">
                    {syncRun.message}
                  </p>
                </div>
              )}

              {/* Display sync counts if available */}
              {(syncRun.partiesCount !== undefined ||
                syncRun.casesCount !== undefined ||
                syncRun.votesCount !== undefined ||
                syncRun.voteProposalsCount !== undefined) && (
                <div className="flex flex-col gap-2 mt-2">
                  <p className="text-sm font-medium">Synkroniserte elementer</p>
                  <div className="grid grid-cols-2 gap-2">
                    {syncRun.partiesCount !== undefined && (
                      <div className="text-sm text-muted-foreground">
                        Partier: {syncRun.partiesCount}
                      </div>
                    )}
                    {syncRun.casesCount !== undefined && (
                      <div className="text-sm text-muted-foreground">
                        Saker: {syncRun.casesCount}
                      </div>
                    )}
                    {syncRun.votesCount !== undefined && (
                      <div className="text-sm text-muted-foreground">
                        Voteringer: {syncRun.votesCount}
                      </div>
                    )}
                    {syncRun.voteProposalsCount !== undefined && (
                      <div className="text-sm text-muted-foreground">
                        Forslag: {syncRun.voteProposalsCount}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Synkroniseringshistorikk</CardTitle>
              <CardDescription>
                De siste 100 synkroniseringskjøringene
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={columns} data={syncRuns} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
