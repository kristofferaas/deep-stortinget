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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import AsciiSpinner from "../ascii-spinner";
import { InferQueryResult } from "@/lib/utils";

type SyncStatus = NonNullable<
  InferQueryResult<typeof api.sync.workflow.getSyncStatus>
>;

export default function SyncPage() {
  const syncStatus = useQuery(api.sync.workflow.getSyncStatus);
  const syncEnabled = useQuery(api.syncSettings.getSyncEnabled);
  const syncSettings = useQuery(api.syncSettings.getSyncSettings);
  const toggleSync = useMutation(api.syncSettings.toggleSyncEnabled);
  const [now, setNow] = useState(Date.now());
  const [isToggling, setIsToggling] = useState(false);

  // Update timer every second when sync is running
  useEffect(() => {
    if (syncStatus?.status === "started") {
      const interval = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(interval);
    }
  }, [syncStatus?.status]);

  // Map status to badge variant
  const getStatusVariant = (status: SyncStatus["status"]) => {
    switch (status) {
      case "success":
        return "secondary";
      case "started":
        return "default";
      case "error":
      case "canceled":
        return "destructive";
      case "idle":
        return "outline";
    }
  };

  // Format status text for display
  const formatStatus = (status: SyncStatus["status"]) => {
    switch (status) {
      case "idle":
        return "Idle";
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

  // Handle toggle sync
  const handleToggleSync = async (enabled: boolean) => {
    setIsToggling(true);
    try {
      await toggleSync({ enabled });
    } catch (error) {
      console.error("Failed to toggle sync:", error);
    } finally {
      setIsToggling(false);
    }
  };

  if (syncStatus === undefined || syncEnabled === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AsciiSpinner />
      </div>
    );
  }

  if (!syncStatus) {
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
    syncStatus.startedAt,
    syncStatus.status === "started" ? now : syncStatus.finishedAt,
  );
  const startTime = formatDateTime(syncStatus.startedAt);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Synkroniseringsstatus</h1>

        <div className="flex flex-col gap-4">
          {/* Sync Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Automatisk synkronisering</CardTitle>
              <CardDescription>
                Konfigurer automatisk daglig synkronisering fra Stortinget API
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="sync-toggle" className="text-sm font-medium">
                    Nattlig synkronisering
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {syncEnabled
                      ? "Synkronisering kjører daglig kl. 03:00 UTC"
                      : "Automatisk synkronisering er deaktivert"}
                  </p>
                </div>
                <Switch
                  id="sync-toggle"
                  checked={syncEnabled}
                  onCheckedChange={handleToggleSync}
                  disabled={isToggling}
                />
              </div>
              {syncSettings && syncSettings.updatedAt && (
                <div className="flex flex-col gap-1 pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Sist oppdatert:{" "}
                    {formatDateTime(syncSettings.updatedAt) || "Ukjent"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Status</CardTitle>
                <Badge variant={getStatusVariant(syncStatus.status)}>
                  {formatStatus(syncStatus.status)}
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
                    {syncStatus.status === "started"
                      ? "Varighet"
                      : "Total varighet"}
                  </p>
                  <p className="text-sm text-muted-foreground">{duration}</p>
                </div>
              )}

              {syncStatus.message && (
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">Melding</p>
                  <p className="text-sm text-muted-foreground">
                    {syncStatus.message}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
