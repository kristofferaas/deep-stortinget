"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { InferQueryResult, cn } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";
import { useIsMobile } from "@/hooks/use-mobile";

type SyncRun = InferQueryResult<typeof api.sync.workflow.getSyncRuns>[number];

interface SyncRunDetailsDialogProps {
  syncRun: SyncRun;
}

export function SyncRunDetailsDialog({ syncRun }: SyncRunDetailsDialogProps) {
  const [open, setOpen] = React.useState(false);
  const isMobile = useIsMobile();

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

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Info className="h-4 w-4" />
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Synkroniseringsdetaljer</DrawerTitle>
            <DrawerDescription>
              Detaljert oversikt over synkroniseringen
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto max-h-[60vh] px-4">
            <SyncRunDetailsContent
              entities={entities}
              message={syncRun.message}
            />
          </div>
          <DrawerFooter className="pt-2">
            <DrawerClose asChild>
              <Button variant="outline">Lukk</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
        <SyncRunDetailsContent entities={entities} message={syncRun.message} />
      </DialogContent>
    </Dialog>
  );
}

interface Entity {
  name: string;
  total: number;
  added: number;
  updated: number;
  skipped: number;
}

function SyncRunDetailsContent({
  entities,
  message,
  className,
}: {
  entities: Entity[];
  message?: string | null;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4 mt-4", className)}>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Type</th>
              <th className="text-right p-3 font-medium">Lagt til</th>
              <th className="text-right p-3 font-medium">Oppdatert</th>
              <th className="text-right p-3 font-medium">Hoppet over</th>
            </tr>
          </thead>
          <tbody>
            {entities.map((entity, index) => (
              <tr
                key={entity.name}
                className={index !== entities.length - 1 ? "border-b" : ""}
              >
                <td className="p-3 font-medium">{entity.name}</td>
                <td className="p-3 text-right text-green-600 dark:text-green-400 font-medium">
                  {entity.added}
                </td>
                <td className="p-3 text-right text-blue-600 dark:text-blue-400 font-medium">
                  {entity.updated}
                </td>
                <td className="p-3 text-right text-gray-600 dark:text-gray-400 font-medium">
                  {entity.skipped}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2">
        <div className="font-medium text-sm">Melding:</div>
        <pre className="bg-muted p-3 rounded-lg overflow-x-auto text-xs font-mono border min-h-[60px] flex items-center">
          <code>{message || "Ingen melding"}</code>
        </pre>
      </div>
    </div>
  );
}
