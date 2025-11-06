"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AsciiSpinner from "./ascii-spinner";
import { InferQueryResult } from "@/lib/utils";

type PaginatedCases = InferQueryResult<
  typeof api.stortinget.cases.paginatedCases
>;
type FeedCase = PaginatedCases["page"][number];

export default function Home() {
  const router = useRouter();
  const [allCases, setAllCases] = useState<FeedCase[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const hasInitialized = useRef(false);
  const [chatInput, setChatInput] = useState("");
  const [isCreatingThread, setIsCreatingThread] = useState(false);

  const createThread = useMutation(api.chat.createThread);

  const result = useQuery(api.stortinget.cases.paginatedCases, {
    paginationOpts: { numItems: 25, cursor },
  });

  // Accumulate pages as they load
  useEffect(() => {
    if (!result) return;

    // First load - replace all cases
    if (!hasInitialized.current) {
      setAllCases(result.page);
      setIsDone(result.isDone);
      hasInitialized.current = true;
      setIsFetchingMore(false);
    }
    // Subsequent loads - append new cases
    else if (isFetchingMore) {
      setAllCases((prev) => [...prev, ...result.page]);
      setIsDone(result.isDone);
      setIsFetchingMore(false);
    }
  }, [result, isFetchingMore]);

  const listRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useWindowVirtualizer({
    count: isDone ? allCases.length : allCases.length + 1,
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
      lastItem.index >= allCases.length - 1 &&
      !isDone &&
      !isFetchingMore &&
      result
    ) {
      setIsFetchingMore(true);
      setCursor(result.continueCursor);
    }
  }, [virtualItems, allCases.length, isDone, isFetchingMore, result]);

  // Map status to badge variant
  const getStatusVariant = (status: FeedCase["status"]) => {
    switch (status) {
      case "behandlet":
        return "secondary";
      case "til_behandling":
        return "default";
      case "trukket":
      case "bortfalt":
        return "destructive";
      default:
        return "outline";
    }
  };

  // Format status text for display
  const formatStatus = (status: FeedCase["status"]) => {
    switch (status) {
      case "varslet":
        return "Varslet";
      case "mottatt":
        return "Mottatt";
      case "til_behandling":
        return "Til behandling";
      case "behandlet":
        return "Behandlet";
      case "trukket":
        return "Trukket";
      case "bortfalt":
        return "Bortfalt";
      default:
        throw new Error("Unknown status: " + status);
    }
  };

  // Format type text for display
  const formatType = (type: FeedCase["type"]) => {
    switch (type) {
      case "budsjett":
        return "Budsjett";
      case "lovsak":
        return "Lovsak";
      case "alminneligsak":
        return "Alminnelig sak";
      default:
        throw new Error("Unknown format type: " + type);
    }
  };

  // Handle chat submission
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isCreatingThread) return;

    setIsCreatingThread(true);
    try {
      const threadId = await createThread({
        initialMessage: chatInput.trim(),
      });
      router.push(`/chat/${threadId}`);
    } catch (error) {
      console.error("Failed to create thread:", error);
      setIsCreatingThread(false);
    }
  };

  if (!result && allCases.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AsciiSpinner />
      </div>
    );
  }

  if (allCases.length === 0 && isDone) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Ingen saker funnet</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Siste saker</h1>
      </div>
      <div className="container mx-auto px-4 max-w-4xl">
        <div
          ref={listRef}
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualItems.map((virtualRow) => {
            const isLoaderRow = virtualRow.index >= allCases.length;
            const caseDto = allCases[virtualRow.index];

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
                      <p className="text-muted-foreground">Ingen flere saker</p>
                    ) : (
                      <AsciiSpinner />
                    )}
                  </div>
                ) : (
                  <Link
                    href={`/cases/${caseDto.id}`}
                    className="transition-transform hover:scale-[1.01] block"
                  >
                    <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="text-xl">
                          {caseDto.korttittel}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {caseDto.tittel}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={getStatusVariant(caseDto.status)}>
                            {formatStatus(caseDto.status)}
                          </Badge>
                          <Badge variant="secondary">
                            {formatType(caseDto.type)}
                          </Badge>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between">
                        <p className="text-sm text-muted-foreground">
                          {caseDto.votes}{" "}
                          {caseDto.votes === 1 ? "votering" : "voteringer"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Sist oppdatert:{" "}
                          {new Date(
                            caseDto.sist_oppdatert_dato,
                          ).toLocaleDateString("nb-NO")}
                        </p>
                      </CardFooter>
                    </Card>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Fixed chat input at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <form onSubmit={handleChatSubmit} className="flex gap-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask a question about Norwegian parliamentary data..."
              disabled={isCreatingThread}
              className="flex-1"
            />
            <Button type="submit" disabled={isCreatingThread || !chatInput.trim()}>
              {isCreatingThread ? "Starting..." : "Send"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
