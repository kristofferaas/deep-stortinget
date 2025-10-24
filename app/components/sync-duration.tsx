import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  status?: "idle" | "started" | "success" | "error" | "canceled";
  startedAt?: number;
  finishedAt?: number;
  /** How often to tick in ms while started */
  tickMs?: number;
  /** Optional formatter for duration in ms */
  render?: (durationMs: number) => React.ReactNode;
};

function defaultRender(durationMs: number) {
  const totalSeconds = Math.round(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  parts.push(`${seconds}s`);

  return parts.join(" ");
}

export default function SyncDuration({
  status,
  startedAt,
  finishedAt,
  tickMs = 1000,
  render = defaultRender,
}: Props) {
  const [now, setNow] = useState<number>(() => Date.now());
  const intervalRef = useRef<number | null>(null);

  const isInProgress = status === "started";

  useEffect(() => {
    if (isInProgress) {
      // start ticking
      intervalRef.current = window.setInterval(
        () => setNow(Date.now()),
        tickMs,
      );
      return () => {
        if (intervalRef.current !== null) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } else {
      // stop ticking if not in progress
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [isInProgress, tickMs]);

  const durationMs = useMemo(() => {
    if (!startedAt) return undefined;
    const end = finishedAt ?? (isInProgress ? now : undefined);
    if (!end || end < startedAt) return undefined;
    return end - startedAt;
  }, [startedAt, finishedAt, isInProgress, now]);

  if (!durationMs) return <span>—</span>;
  return <span>{render(durationMs)}</span>;
}
