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
  const getStatusVariant = (status: string) => {
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
  const formatStatus = (status: string) => {
    switch (status) {
      case "varslet":
        return "Varslet";
      case "motatt":
        return "Mottatt";
      case "til_behandling":
        return "Til behandling";
      case "behandlet":
        return "Behandlet";
      case "trukket":
        return "Trukket";
      case "bortfalt":
        return "Bortfalt";
      default:
        throw new Error("Unknown status");
    }
  };

  // Format type text for display
  const formatType = (type: string): string => {
    switch (type) {
      case "budsjett":
        return "Budsjett";
      case "lovsak":
        return "Lovsak";
      case "alminneligsak":
        return "Alminnelig sak";
      default:
        throw new Error("Unknown format type");
    }
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
          {cases.map((caseDto) => (
            <Link
              key={caseDto.id}
              href={`/cases/${caseDto.id}`}
              className="transition-transform hover:scale-[1.01]"
            >
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-xl">
                    {caseDto.korttittel}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {caseDto.tittel}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={getStatusVariant(caseDto.status)}>
                      {formatStatus(caseDto.status)}
                    </Badge>
                    <Badge variant="secondary">
                      {formatType(caseDto.type)}
                    </Badge>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <p className="text-sm text-muted-foreground">
                    {caseDto.votes}{" "}
                    {caseDto.votes === 1 ? "votering" : "voteringer"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Sist oppdatert:{" "}
                    {new Date(caseDto.sist_oppdatert_dato).toLocaleDateString(
                      "nb-NO",
                    )}
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
