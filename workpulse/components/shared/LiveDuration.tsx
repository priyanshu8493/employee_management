"use client";

import { useState, useEffect, useRef } from "react";
import { formatDuration } from "@/lib/utils";

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h === 0) return `${m}m ${s}s`;
  return `${h}h ${m}m`;
}

interface LiveDurationProps {
  durationMinutes: number | null | undefined;
  checkInAt: string;
  totalPauseMs?: number;
  pausedAt?: string | null;
}

export function LiveDuration({
  durationMinutes,
  checkInAt,
  totalPauseMs = 0,
  pausedAt,
}: LiveDurationProps) {
  const isActive = durationMinutes == null;

  if (!isActive) {
    return <span>{formatDuration(durationMinutes)}</span>;
  }

  return (
    <LiveCounter
      checkInAt={checkInAt}
      totalPauseMs={totalPauseMs}
      pausedAt={pausedAt}
    />
  );
}

function LiveCounter({
  checkInAt,
  totalPauseMs,
  pausedAt,
}: {
  checkInAt: string;
  totalPauseMs: number;
  pausedAt?: string | null;
}) {
  const startRef = useRef(new Date(checkInAt).getTime());
  const [elapsed, setElapsed] = useState("0h 0m");

  useEffect(() => {
    startRef.current = new Date(checkInAt).getTime();
  }, [checkInAt]);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      let elapsedMs = now - startRef.current - totalPauseMs;

      if (pausedAt) {
        const pauseStart = new Date(pausedAt).getTime();
        const pauseElapsed = now - pauseStart;
        elapsedMs = pauseStart - startRef.current - totalPauseMs;
        if (elapsedMs < 0) elapsedMs = 0;
      }

      elapsedMs = Math.max(elapsedMs, 0);
      const totalSeconds = Math.floor(elapsedMs / 1000);
      setElapsed(formatElapsed(totalSeconds));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [checkInAt, totalPauseMs, pausedAt]);

  return (
    <span className="font-medium text-primary">
      {elapsed}
    </span>
  );
}
