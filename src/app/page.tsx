'use client';

import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import AsciiSpinner from './ascii-spinner';

export default function Home() {
  const hearingsCount = useQuery(api.stortinget.hearings.hearingCount);
  const casesCount = useQuery(api.stortinget.cases.caseCount);
  const votesCount = useQuery(api.stortinget.votes.voteCount);
  const syncStatus = useQuery(api.sync.workflow.getSyncStatus);
  return (
    <div className="bg-white h-dvh p-4 text-black font-mono text-sm">
      <h1>
        Deep Stortinget
        {syncStatus?.status === 'in_progress' ? (
          <>
            {' '}
            <AsciiSpinner />
          </>
        ) : null}
      </h1>
      <br />
      <p>Hearings in DB: {hearingsCount ?? <AsciiSpinner />}</p>
      <p>Cases in DB: {casesCount ?? <AsciiSpinner />}</p>
      <p>Votes in DB: {votesCount ?? <AsciiSpinner />}</p>
      <br />
      <p>Sync status: {syncStatus ? syncStatus.status : <AsciiSpinner />}</p>
      <p>Sync message: {syncStatus ? syncStatus.message : <AsciiSpinner />}</p>
      <p>
        Last finished{' '}
        {syncStatus ? (
          syncStatus.lastFinishedAt && syncStatus.lastFinishedAt > 0 ? (
            new Date(syncStatus.lastFinishedAt).toLocaleString()
          ) : (
            'never'
          )
        ) : (
          <AsciiSpinner />
        )}
      </p>
    </div>
  );
}
