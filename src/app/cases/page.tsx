'use client';

import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import AsciiSpinner from '../ascii-spinner';
import Link from 'next/link';

export default function Home() {
  const latestCases = useQuery(api.stortinget.cases.latestCases);
  return (
    <div className="bg-white h-dvh p-4 text-black font-mono text-sm">
      {latestCases ? (
        <ul>
          {latestCases.map(c => (
            <li key={c.id}>
              {c.korttittel} <Link href={`/cases/${c.id}`}>[View]</Link>
            </li>
          ))}
        </ul>
      ) : (
        <AsciiSpinner />
      )}
    </div>
  );
}
