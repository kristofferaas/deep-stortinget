"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AsciiSpinner from "./ascii-spinner";

export default function Home() {
  const cases = useQuery(api.stortinget.cases.feedCases);

  // Map status to badge variant
  const getStatusVariant = (
    status: string
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "behandlet":
        return "secondary";
      case "til_behandling":
        return "default";
      case "trukket":
      case "bortfalt":
        return "destructive";
      default:
        return "outline";
    }
  };

  // Format status text for display
  const formatStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      varslet: "Varslet",
      mottatt: "Mottatt",
      til_behandling: "Til behandling",
      behandlet: "Behandlet",
      trukket: "Trukket",
      bortfalt: "Bortfalt",
    };
    return statusMap[status] || status;
  };

  // Format type text for display
  const formatType = (type: string): string => {
    const typeMap: Record<string, string> = {
      budsjett: "Budsjett",
      lovsak: "Lovsak",
      alminneligsak: "Alminnelig sak",
    };
    return typeMap[type] || type;
  };

  if (!cases) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AsciiSpinner />
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Ingen saker funnet</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Siste saker</h1>
        <div className="flex flex-col gap-4">
          {cases.map((case_) => (
            <Link
              key={case_.id}
              href={`/cases/${case_.id}`}
              className="transition-transform hover:scale-[1.01]"
            >
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-xl">
                    {case_.korttittel}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {case_.tittel}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={getStatusVariant(case_.status)}>
                      {formatStatus(case_.status)}
                    </Badge>
                    <Badge variant="secondary">{formatType(case_.type)}</Badge>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <p className="text-sm text-muted-foreground">
                    {case_.votes} {case_.votes === 1 ? "votering" : "voteringer"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Sist oppdatert: {new Date(case_.sist_oppdatert_dato).toLocaleDateString("nb-NO")}
                  </p>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
