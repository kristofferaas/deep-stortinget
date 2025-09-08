'use client';

import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import AsciiSpinner from '../../ascii-spinner';
import Link from 'next/link';

export default function CaseDetailsPage() {
  const params = useParams();
  const idParam =
    typeof params.id === 'string'
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : '';
  const idNum = Number(idParam);

  const data = useQuery(
    api.stortinget.cases.getCaseById,
    idNum ? { id: idNum } : 'skip'
  );

  if (!idNum) {
    return (
      <div className="bg-white h-dvh p-4 text-black font-mono text-sm">
        <div>ERROR: Invalid id</div>
        <div className="mt-2">
          <Link href="/cases">[ Back to list ]</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white h-dvh p-4 text-black font-mono text-sm">
      {data === undefined ? (
        <AsciiSpinner />
      ) : data === null ? (
        <div>
          <div>NOT FOUND: Case {idNum} not found</div>
          <div className="mt-2">
            <Link href="/cases">[ Back to list ]</Link>
          </div>
        </div>
      ) : (
        <div>
          <div>ID: {data.id}</div>
          <div>TITLE: {data.tittel}</div>
          <div>SHORT: {data.korttittel}</div>
          <div>TYPE: {data.type}</div>
          <div>STATUS: {data.status}</div>
          <div>DOCGROUP: {data.dokumentgruppe}</div>
          <div>LAST UPDATED: {data.sist_oppdatert_dato}</div>
          <div>PROMOTED ID: {data.sak_fremmet_id}</div>
          {data.henvisning ? <div>REF: {data.henvisning}</div> : null}
          <div className="mt-2">
            <Link href="/cases">[ Back to list ]</Link>
          </div>
        </div>
      )}
    </div>
  );
}
