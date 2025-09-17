"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import AsciiSpinner from "../../ascii-spinner";
import Link from "next/link";

export default function CaseDetailsPage() {
  const params = useParams();
  const idParam =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : "";
  const idNum = Number(idParam);

  const data = useQuery(
    api.stortinget.cases.getCaseById,
    idNum ? { id: idNum } : "skip",
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
          <div>ID: {data.case.id}</div>
          <div>TITLE: {data.case.tittel}</div>
          <div>SHORT: {data.case.korttittel}</div>
          <div>TYPE: {data.case.type}</div>
          <div>STATUS: {data.case.status}</div>
          <div>DOCGROUP: {data.case.dokumentgruppe}</div>
          <div>LAST UPDATED: {data.case.sist_oppdatert_dato}</div>
          <div>PROMOTED ID: {data.case.sak_fremmet_id}</div>
          {data.case.henvisning ? <div>REF: {data.case.henvisning}</div> : null}
          <div className="mt-2">
            <Link href="/cases">[ Back to list ]</Link>
          </div>
          <code>
            <pre>{JSON.stringify(data.votes, null, 2)}</pre>
          </code>
        </div>
      )}
    </div>
  );
}
