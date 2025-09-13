'use client';

import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import AsciiSpinner from '../ascii-spinner';
import Link from 'next/link';
import React from 'react';
import { useSearchParams } from 'next/navigation';

export default function Home() {
  const searchParams = useSearchParams();
  const pageParam = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const pageSize = 25;

  const data = useQuery(api.stortinget.cases.paginatedCases, {
    page,
    pageSize,
  });

  if (!data)
    return (
      <div className="bg-white h-dvh p-4 text-black font-mono text-sm">
        <AsciiSpinner />
      </div>
    );

  return (
    <div className="bg-white h-dvh p-4 text-black font-mono text-sm">
      <Link href="/">
        <h1>Deep Stortinget</h1>
      </Link>
      <br />
      <hr />
      <br />
      <ul>
        {data.cases.map(c => (
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
      <hr />
      <br />
      {/* Pagination */}
      <Pagination
        total={data.total}
        pageSize={data.pageSize}
        current={data.page}
      />
      <br />
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

const Pagination = ({
  total,
  pageSize,
  current,
}: {
  total: number;
  pageSize: number;
  current: number;
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstHref = `/cases?page=1`;
  const prevHref = `/cases?page=${Math.max(1, current - 1)}`;
  const nextHref = `/cases?page=${Math.min(totalPages, current + 1)}`;
  const lastHref = `/cases?page=${totalPages}`;
  return (
    <>
      {current > 1 && <Link href={firstHref}>[First]</Link>}
      {current > 1 && ' '}
      {current > 1 && <Link href={prevHref}>[Previous]</Link>}
      {current > 1 && current < totalPages && ' '}
      <span>
        {' '}
        Page {current} of {totalPages}{' '}
      </span>
      {current < totalPages && <Link href={nextHref}>[Next]</Link>}
      {current < totalPages && ' '}
      {current < totalPages && <Link href={lastHref}>[Last]</Link>}
    </>
  );
};
