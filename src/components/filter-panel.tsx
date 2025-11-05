"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { X, Filter } from "lucide-react";
import { useState } from "react";

export type CaseType = "budsjett" | "lovsak" | "alminneligsak";
export type CaseStatus =
  | "varslet"
  | "mottatt"
  | "til_behandling"
  | "behandlet"
  | "trukket"
  | "bortfalt";

interface FilterPanelProps {
  selectedTypes: CaseType[];
  selectedStatuses: CaseStatus[];
  onTypesChange: (types: CaseType[]) => void;
  onStatusesChange: (statuses: CaseStatus[]) => void;
  visible: boolean;
}

const CASE_TYPES: { value: CaseType; label: string }[] = [
  { value: "budsjett", label: "Budsjett" },
  { value: "lovsak", label: "Lovsak" },
  { value: "alminneligsak", label: "Alminnelig sak" },
];

const CASE_STATUSES: { value: CaseStatus; label: string }[] = [
  { value: "varslet", label: "Varslet" },
  { value: "mottatt", label: "Mottatt" },
  { value: "til_behandling", label: "Til behandling" },
  { value: "behandlet", label: "Behandlet" },
  { value: "trukket", label: "Trukket" },
  { value: "bortfalt", label: "Bortfalt" },
];

export function FilterPanel({
  selectedTypes,
  selectedStatuses,
  onTypesChange,
  onStatusesChange,
  visible,
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleType = (type: CaseType) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter((t) => t !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  };

  const toggleStatus = (status: CaseStatus) => {
    if (selectedStatuses.includes(status)) {
      onStatusesChange(selectedStatuses.filter((s) => s !== status));
    } else {
      onStatusesChange([...selectedStatuses, status]);
    }
  };

  const clearAllFilters = () => {
    onTypesChange([]);
    onStatusesChange([]);
  };

  const activeFilterCount = selectedTypes.length + selectedStatuses.length;

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-in-out ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-[200%] opacity-0 pointer-events-none"
      }`}
    >
      {!isExpanded ? (
        <Button
          onClick={() => setIsExpanded(true)}
          variant="default"
          className="shadow-lg"
        >
          <Filter className="mr-2 h-4 w-4" />
          Filtrer
          {activeFilterCount > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-primary-foreground text-primary rounded-full">
              {activeFilterCount}
            </span>
          )}
        </Button>
      ) : (
        <Card className="p-6 shadow-xl max-w-2xl w-[calc(100vw-2rem)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <h3 className="font-semibold text-lg">Filtrer saker</h3>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsExpanded(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Type Filters */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Type</Label>
              <div className="space-y-3">
                {CASE_TYPES.map((type) => (
                  <div key={type.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`type-${type.value}`}
                      checked={selectedTypes.includes(type.value)}
                      onCheckedChange={() => toggleType(type.value)}
                    />
                    <Label
                      htmlFor={`type-${type.value}`}
                      className="cursor-pointer font-normal"
                    >
                      {type.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Filters */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Status</Label>
              <div className="space-y-3">
                {CASE_STATUSES.map((status) => (
                  <div key={status.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`status-${status.value}`}
                      checked={selectedStatuses.includes(status.value)}
                      onCheckedChange={() => toggleStatus(status.value)}
                    />
                    <Label
                      htmlFor={`status-${status.value}`}
                      className="cursor-pointer font-normal"
                    >
                      {status.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div className="mt-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="w-full"
              >
                Nullstill alle filtre
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
