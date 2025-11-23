"use client";

import { useEffect, useState } from "react";

// Format duration helper
const formatDuration = (durationMs: number): string => {
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

interface DurationCellProps {
  startedAt: number;
  finishedAt?: number;
}

export function DurationCell({ startedAt, finishedAt }: DurationCellProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    // Only set up interval if the sync is still running (no finishedAt)
    if (!finishedAt) {
      const interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000); // Update every second

      return () => clearInterval(interval);
    }
  }, [finishedAt]);

  const end = finishedAt || currentTime;
  const durationMs = end - startedAt;
  const duration = formatDuration(durationMs);

  return <div className="text-sm">{duration}</div>;
}
