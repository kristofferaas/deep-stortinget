'use client';

import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import AsciiSpinner from './ascii-spinner';
import SyncDuration from './sync-duration';

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
        Total time{' '}
        {syncStatus ? (
          <SyncDuration
            status={syncStatus.status}
            startedAt={syncStatus.startedAt}
            finishedAt={syncStatus.finishedAt}
          />
        ) : (
          <AsciiSpinner />
        )}
      </p>
      <p>
        Last finished{' '}
        {syncStatus ? (
          syncStatus.finishedAt && syncStatus.finishedAt > 0 ? (
            new Date(syncStatus.finishedAt).toLocaleString()
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
