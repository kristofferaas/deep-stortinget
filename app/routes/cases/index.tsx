import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import AsciiSpinner from "../../components/ascii-spinner";
import React from "react";

export const Route = createFileRoute("/cases/")({
  component: CasesPage,
  validateSearch: (search: Record<string, unknown>) => {
    const pageParam = search.page;
    const page =
      typeof pageParam === "string" || typeof pageParam === "number"
        ? Number(pageParam)
        : 1;
    return {
      page: Number.isFinite(page) && page > 0 ? page : 1,
    };
  },
});

function CasesPage() {
  const { page } = Route.useSearch();
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
      <Link to="/">
        <h1>Deep Stortinget</h1>
      </Link>
      <br />
      <hr />
      <br />
      <ul>
        {data.cases.map((c) => (
          <React.Fragment key={c.id}>
            <li key={c.id}>
              <Link to="/cases/$id" params={{ id: c.id.toString() }}>
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
  const prettyDate = new Date(date).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const prettyTime = new Date(date).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
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
  return (
    <>
      {current > 1 && (
        <Link to="/cases" search={{ page: 1 }}>
          [First]
        </Link>
      )}
      {current > 1 && " "}
      {current > 1 && (
        <Link to="/cases" search={{ page: Math.max(1, current - 1) }}>
          [Previous]
        </Link>
      )}
      {current > 1 && current < totalPages && " "}
      <span>
        {" "}
        Page {current} of {totalPages}{" "}
      </span>
      {current < totalPages && (
        <Link to="/cases" search={{ page: Math.min(totalPages, current + 1) }}>
          [Next]
        </Link>
      )}
      {current < totalPages && " "}
      {current < totalPages && (
        <Link to="/cases" search={{ page: totalPages }}>
          [Last]
        </Link>
      )}
    </>
  );
};
