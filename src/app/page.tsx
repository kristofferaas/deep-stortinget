'use client';

import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import AsciiSpinner from './ascii-spinner';

export default function Home() {
  const hearingsCount = useQuery(api.stortinget.hearings.hearingCount);
  const casesCount = useQuery(api.stortinget.cases.caseCount);
  return (
    <div className="bg-white h-dvh p-4 text-black font-mono text-sm">
      <h1>Deep Stortinget</h1>
      <br />
      <p>Hearings in DB: {hearingsCount ?? <AsciiSpinner />}</p>
      <p>Cases in DB: {casesCount ?? <AsciiSpinner />}</p>
    </div>
  );
}
