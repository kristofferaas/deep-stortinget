import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../_generated/api";
import { internalAction, internalMutation } from "../_generated/server";
import { stortingetDtoSchema, stripStortingetDtoMetadata } from "./helpers";
import { partyValidator } from "./validators";

export const partySchema = stortingetDtoSchema.extend({
  id: z.string(),
  navn: z.string(),
  representert_parti: z.boolean(),
});

const partyResponseSchema = stortingetDtoSchema.extend({
  partier_liste: z.array(partySchema),
  sesjon_id: z.string().nullable(),
  stortingsperiode_id: z.string().nullable(),
});

export const syncParties = internalAction({
  handler: async (ctx) => {
    const baseUrl =
      process.env.STORTINGET_BASE_URL ?? "https://data.stortinget.no";
    const url = new URL("/eksport/allepartier", baseUrl);
    url.searchParams.set("format", "json");

    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    const json = await response.json();
    const parsed = partyResponseSchema.parse(json);

    await ctx.runMutation(internal.sync.parties.upsertParties, {
      parties: parsed.partier_liste.map(stripStortingetDtoMetadata),
    });
  },
});

export const upsertParties = internalMutation({
  args: {
    parties: v.array(partyValidator),
  },
  handler: async (ctx, args) => {
    const partyIds: string[] = [];
    for (const party of args.parties) {
      const existing = await ctx.db
        .query("parties")
        .withIndex("by_party_id", (q) => q.eq("id", party.id))
        .unique();

      if (existing) {
        // Toggle representert_parti if it has changed
        if (existing.representert_parti !== party.representert_parti) {
          await ctx.db.replace(existing._id, party);
          partyIds.push(party.id);
        }
      } else {
        await ctx.db.insert("parties", party);
        partyIds.push(party.id);
      }
    }
    return partyIds;
  },
});
