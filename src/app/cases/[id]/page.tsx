"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import AsciiSpinner from "../../ascii-spinner";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { InferQueryResult } from "@/lib/utils";

type CaseData = NonNullable<
  InferQueryResult<typeof api.stortinget.feed.getCaseById>
>;
type CaseStatus = CaseData["case"]["status"];
type CaseType = CaseData["case"]["type"];

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
    api.stortinget.feed.getCaseById,
    idNum ? { id: idNum } : "skip",
  );

  // Map status to badge variant
  const getStatusVariant = (status: CaseStatus) => {
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
  const formatStatus = (status: CaseStatus) => {
    switch (status) {
      case "varslet":
        return "Varslet";
      case "mottatt":
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
        return status;
    }
  };

  // Format type text for display
  const formatType = (type: CaseType) => {
    switch (type) {
      case "budsjett":
        return "Budsjett";
      case "lovsak":
        return "Lovsak";
      case "alminneligsak":
        return "Alminnelig sak";
      default:
        return type;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("nb-NO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Format vote result
  const formatVoteResult = (vedtatt: boolean) => {
    return vedtatt ? "Vedtatt" : "Ikke vedtatt";
  };

  if (!idNum) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Tilbake til oversikt
          </Link>
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Ugyldig saks-ID</h2>
            <p className="text-muted-foreground">
              Saks-IDen du prøvde å åpne er ugyldig.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (data === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AsciiSpinner />
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Tilbake til oversikt
          </Link>
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Sak ikke funnet</h2>
            <p className="text-muted-foreground">
              Sak med ID {idNum} ble ikke funnet i databasen.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { case: caseData, votes } = data;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Tilbake til oversikt
        </Link>

        <div className="space-y-6">
          {/* Header Section */}
          <div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {caseData.korttittel}
                </h1>
                <p className="text-lg text-muted-foreground">
                  {caseData.tittel}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant={getStatusVariant(caseData.status)}>
                {formatStatus(caseData.status)}
              </Badge>
              <Badge variant="secondary">{formatType(caseData.type)}</Badge>
              <Badge variant="outline">{caseData.dokumentgruppe}</Badge>
            </div>
          </div>

          {/* Details Section */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm font-medium">Saks-ID</p>
              <p className="text-sm text-muted-foreground">{caseData.id}</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Sist oppdatert</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(caseData.sist_oppdatert_dato)}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Fremmet ID</p>
              <p className="text-sm text-muted-foreground">
                {caseData.sak_fremmet_id}
              </p>
            </div>

            {caseData.henvisning && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Henvisning</p>
                <p className="text-sm text-muted-foreground">
                  {caseData.henvisning}
                </p>
              </div>
            )}
          </div>

          {/* Votes Section */}
          {votes.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">
                Voteringer ({votes.length})
              </h2>
              <div className="grid gap-4">
                {votes.map((vote, index) => (
                  <Card key={vote.votering_id || index}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">
                          {vote.votering_tema || "Votering"}
                        </CardTitle>
                        <Badge
                          variant={vote.vedtatt ? "secondary" : "destructive"}
                        >
                          {formatVoteResult(vote.vedtatt)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="grid gap-2 md:grid-cols-2">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Voterings-ID</p>
                          <p className="text-sm text-muted-foreground">
                            {vote.votering_id}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-sm font-medium">Tidspunkt</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(vote.votering_tid)}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-sm font-medium">Resultattype</p>
                          <p className="text-sm text-muted-foreground">
                            {vote.votering_resultat_type}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-sm font-medium">Resultattekst</p>
                          <p className="text-sm text-muted-foreground">
                            {vote.votering_resultat_type_tekst}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {votes.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Voteringer</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Ingen voteringer registrert for denne saken.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
