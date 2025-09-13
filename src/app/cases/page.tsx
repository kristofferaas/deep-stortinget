'use client';

import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import AsciiSpinner from '../ascii-spinner';
import Link from 'next/link';
import React from 'react';

export default function Home() {
  const latestCases = useQuery(api.stortinget.cases.latestCases);

  if (!latestCases)
    return (
      <div className="bg-white h-dvh p-4 text-black font-mono text-sm">
        <AsciiSpinner />
      </div>
    );

  return (
    <div className="bg-white h-dvh p-4 text-black font-mono text-sm">
      <Link href="/cases/new">Filter</Link>
      <br />
      <br />
      <hr />
      <br />
      <ul>
        {latestCases.map(c => (
          <React.Fragment key={c.id}>
            <li key={c.id}>
              <Link href={`/cases/${c.id}`}>
                {c.korttittel}
                <br />
                <DateAndTime date={c.sist_oppdatert_dato} />
                <Delimiter />
                {c.votes} votes
              </Link>
            </li>
            <br />
          </React.Fragment>
        ))}
      </ul>
      {/* Pagination */}
      <Link href="/cases/1">[First]</Link>{' '}
      <Link href="/cases/1">[Previous]</Link>{' '}
      <Link href="/cases/2">[Next]</Link> <Link href="/cases/3">[Last]</Link>
      <br />
      <br />
      <hr />
      <br />
      <h1>Deep Stortinget</h1>
      <br />
    </div>
  );
}

const Delimiter = () => {
  return <span>・</span>;
};

const DateAndTime = ({ date }: { date: string }) => {
  const prettyDate = new Date(date).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const prettyTime = new Date(date).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return (
    <span>
      {prettyDate} {prettyTime}
    </span>
  );
};
