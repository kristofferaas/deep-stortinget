"use client";

import AsciiSpinner from "../ascii-spinner";

export default function Loading() {
  return (
    <div className="bg-white h-dvh p-4 text-black font-mono text-sm">
      <AsciiSpinner />
    </div>
  );
}
