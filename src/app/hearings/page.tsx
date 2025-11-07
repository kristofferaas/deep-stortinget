"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useEffect, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import AsciiSpinner from "../ascii-spinner";
import { InferQueryResult } from "@/lib/utils";

type PaginatedHearings = InferQueryResult<
  typeof api.stortinget.hearings.paginatedHearings
>;
type FeedHearing = PaginatedHearings["page"][number];

export default function HearingsPage() {
  const [allHearings, setAllHearings] = useState<FeedHearing[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const hasInitialized = useRef(false);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<number | undefined>(
    undefined,
  );
  const [typeFilter, setTypeFilter] = useState<number | undefined>(undefined);

  const result = useQuery(api.stortinget.hearings.paginatedHearings, {
    paginationOpts: { numItems: 25, cursor },
    status: statusFilter,
    type: typeFilter,
  });

  // Reset when filters change
  useEffect(() => {
    hasInitialized.current = false;
    setAllHearings([]);
    setCursor(null);
    setIsDone(false);
  }, [statusFilter, typeFilter]);

  // Accumulate pages as they load
  useEffect(() => {
    if (!result) return;

    // First load - replace all hearings
    if (!hasInitialized.current) {
      setAllHearings(result.page);
      setIsDone(result.isDone);
      hasInitialized.current = true;
      setIsFetchingMore(false);
    }
    // Subsequent loads - append new hearings
    else if (isFetchingMore) {
      setAllHearings((prev) => [...prev, ...result.page]);
      setIsDone(result.isDone);
      setIsFetchingMore(false);
    }
  }, [result, isFetchingMore]);

  const listRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useWindowVirtualizer({
    count: isDone ? allHearings.length : allHearings.length + 1,
    estimateSize: () => 200,
    overscan: 5,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  // Trigger fetching next page when scrolling near the end
  useEffect(() => {
    const lastItem = virtualItems[virtualItems.length - 1];

    if (!lastItem) return;

    if (
      lastItem.index >= allHearings.length - 1 &&
      !isDone &&
      !isFetchingMore &&
      result
    ) {
      setIsFetchingMore(true);
      setCursor(result.continueCursor);
    }
  }, [virtualItems, allHearings.length, isDone, isFetchingMore, result]);

  // Format status text for display
  const formatStatus = (status: number) => {
    switch (status) {
      case 1:
        return "Aktiv";
      case 2:
        return "Avsluttet";
      default:
        return `Status ${status}`;
    }
  };

  // Format type text for display
  const formatType = (type: number) => {
    switch (type) {
      case 1:
        return "Offentlig høring";
      case 2:
        return "Skriftlig høring";
      default:
        return `Type ${type}`;
    }
  };

  const clearFilters = () => {
    setStatusFilter(undefined);
    setTypeFilter(undefined);
  };

  if (!result && allHearings.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AsciiSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Høringer</h1>
          <p className="text-muted-foreground">
            Bla gjennom og filtrer høringer fra Stortinget
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtrer høringer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status-filter">Status</Label>
                <Select
                  value={statusFilter?.toString() ?? "all"}
                  onValueChange={(value) =>
                    setStatusFilter(value === "all" ? undefined : Number(value))
                  }
                >
                  <SelectTrigger id="status-filter">
                    <SelectValue placeholder="Alle statuser" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle statuser</SelectItem>
                    <SelectItem value="1">Aktiv</SelectItem>
                    <SelectItem value="2">Avsluttet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type-filter">Type</Label>
                <Select
                  value={typeFilter?.toString() ?? "all"}
                  onValueChange={(value) =>
                    setTypeFilter(value === "all" ? undefined : Number(value))
                  }
                >
                  <SelectTrigger id="type-filter">
                    <SelectValue placeholder="Alle typer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle typer</SelectItem>
                    <SelectItem value="1">Offentlig høring</SelectItem>
                    <SelectItem value="2">Skriftlig høring</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="w-full"
                >
                  Nullstill filtre
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results count */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            {allHearings.length} høringer funnet
            {!isDone && " (laster mer...)"}
          </p>
        </div>

        {/* List */}
        {allHearings.length === 0 && isDone ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Ingen høringer funnet</p>
          </div>
        ) : (
          <div
            ref={listRef}
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualItems.map((virtualRow) => {
              const isLoaderRow = virtualRow.index >= allHearings.length;
              const hearing = allHearings[virtualRow.index];

              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start - rowVirtualizer.options.scrollMargin}px)`,
                  }}
                  className="pb-4"
                >
                  {isLoaderRow ? (
                    <div className="flex items-center justify-center py-8">
                      {isDone ? (
                        <p className="text-muted-foreground">
                          Ingen flere høringer
                        </p>
                      ) : (
                        <AsciiSpinner />
                      )}
                    </div>
                  ) : (
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-xl">
                              Høring #{hearing.id}
                            </CardTitle>
                            <CardDescription className="text-sm mt-1">
                              {hearing.status_info_tekst}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            <Badge
                              variant={
                                hearing.status === 1 ? "default" : "secondary"
                              }
                            >
                              {formatStatus(hearing.status)}
                            </Badge>
                            <Badge variant="outline">
                              {formatType(hearing.type)}
                            </Badge>
                            {hearing.skriftlig && (
                              <Badge variant="secondary">Skriftlig</Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">
                                Startdato:{" "}
                              </span>
                              <span>
                                {new Date(hearing.start_dato).toLocaleDateString(
                                  "nb-NO",
                                )}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Søknadsfrist:{" "}
                              </span>
                              <span>
                                {new Date(
                                  hearing.soknadfrist_dato,
                                ).toLocaleDateString("nb-NO")}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Innspillsfrist:{" "}
                              </span>
                              <span>
                                {new Date(
                                  hearing.innspillsfrist,
                                ).toLocaleDateString("nb-NO")}
                              </span>
                            </div>
                          </div>

                          {hearing.horing_status && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">
                                Høringsstatus:{" "}
                              </span>
                              <span>{hearing.horing_status}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                      {hearing.sesjon_id && (
                        <CardFooter>
                          <p className="text-sm text-muted-foreground">
                            Sesjon: {hearing.sesjon_id}
                          </p>
                        </CardFooter>
                      )}
                    </Card>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
