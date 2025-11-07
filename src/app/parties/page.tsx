"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AsciiSpinner from "../ascii-spinner";

export default function PartiesPage() {
  const parties = useQuery(api.stortinget.parties.listParties);

  if (parties === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AsciiSpinner />
      </div>
    );
  }

  if (parties.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Ingen partier funnet</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Partier</h1>
          <p className="text-muted-foreground">
            Oversikt over politiske partier på Stortinget
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {parties.map((party) => (
            <Card key={party.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl">{party.navn}</CardTitle>
                <CardDescription className="text-sm">
                  Parti-ID: {party.id}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={party.representert_parti ? "default" : "secondary"}
                  >
                    {party.representert_parti
                      ? "Representert"
                      : "Ikke representert"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
