"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { InferQueryResult } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";

type SyncRun = InferQueryResult<typeof api.sync.workflow.getSyncRuns>[number];

interface SyncRunDetailsDialogProps {
  syncRun: SyncRun;
}

export function SyncRunDetailsDialog({ syncRun }: SyncRunDetailsDialogProps) {
  const entities = [
    {
      name: "Partier",
      total: syncRun.partiesCount ?? 0,
      added: syncRun.partiesAdded ?? 0,
      updated: syncRun.partiesUpdated ?? 0,
      skipped: syncRun.partiesSkipped ?? 0,
    },
    {
      name: "Saker",
      total: syncRun.casesCount ?? 0,
      added: syncRun.casesAdded ?? 0,
      updated: syncRun.casesUpdated ?? 0,
      skipped: syncRun.casesSkipped ?? 0,
    },
    {
      name: "Voteringer",
      total: syncRun.votesCount ?? 0,
      added: syncRun.votesAdded ?? 0,
      updated: syncRun.votesUpdated ?? 0,
      skipped: syncRun.votesSkipped ?? 0,
    },
    {
      name: "Forslag",
      total: syncRun.voteProposalsCount ?? 0,
      added: syncRun.voteProposalsAdded ?? 0,
      updated: syncRun.voteProposalsUpdated ?? 0,
      skipped: syncRun.voteProposalsSkipped ?? 0,
    },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Info className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Synkroniseringsdetaljer</DialogTitle>
          <DialogDescription>
            Detaljert oversikt over synkroniseringen
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {entities.map((entity) => (
            <div key={entity.name} className="border rounded-lg p-4">
              <div className="font-medium mb-2">{entity.name}</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Totalt:</div>
                <div className="font-medium">{entity.total}</div>

                <div className="text-muted-foreground">Lagt til:</div>
                <div className="text-green-600 dark:text-green-400 font-medium">
                  {entity.added}
                </div>

                <div className="text-muted-foreground">Oppdatert:</div>
                <div className="text-blue-600 dark:text-blue-400 font-medium">
                  {entity.updated}
                </div>

                <div className="text-muted-foreground">Hoppet over:</div>
                <div className="text-gray-600 dark:text-gray-400 font-medium">
                  {entity.skipped}
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
