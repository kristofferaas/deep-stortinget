import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../_generated/api";
import { internalAction, internalMutation } from "../_generated/server";
import {
  stortingetDtoSchema,
  stripStortingetDtoMetadata,
  computeChecksum,
  batcher,
} from "./helpers";
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
  returns: v.object({
    partyIds: v.array(v.string()),
    skipped: v.number(),
  }),
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

    // Compute checksums for all parties
    const partiesWithChecksums = await Promise.all(
      parsed.partier_liste.map(async (p) => {
        const stripped = stripStortingetDtoMetadata(p);
        const checksum = await computeChecksum(stripped);
        return { id: p.id, data: stripped, checksum: checksum };
      }),
    );

    // Process parties in batches
    const results: number[] = await batcher(
      partiesWithChecksums,
      async (batch): Promise<number> => {
        return await ctx.runMutation(internal.sync.parties.batchUpsertParties, {
          batch,
        });
      },
    );

    // Aggregate skipped counts from all batches
    const totalSkipped = results.reduce((sum: number, r: number) => sum + r, 0);

    return {
      partyIds: partiesWithChecksums.map((p) => p.id),
      skipped: totalSkipped,
    };
  },
});

export const batchUpsertParties = internalMutation({
  args: v.object({
    batch: v.array(
      v.object({
        id: v.string(),
        data: partyValidator,
        checksum: v.string(),
      }),
    ),
  }),
  returns: v.number(),
  handler: async (ctx, args) => {
    let skippedCount = 0;
    for (const dto of args.batch) {
      // First, check if a sync cache entry exists
      // This only queries the index, not the full document (cheap!)
      const cachedSync = await ctx.db
        .query("syncCache")
        .withIndex("by_table_and_external_id", (q) =>
          q.eq("table", "parties").eq("externalId", dto.id),
        )
        .unique();

      if (cachedSync && cachedSync.checksum === dto.checksum) {
        // Checksum matches - skip (no database read or write needed!)
        skippedCount++;
        continue;
      }

      if (!cachedSync) {
        // New record - insert party and sync cache entry
        const partyId = await ctx.db.insert("parties", dto.data);
        await ctx.db.insert("syncCache", {
          table: "parties",
          externalId: dto.id,
          checksum: dto.checksum,
          internalId: partyId,
        });
      } else {
        // Checksum changed - update party using stored internalId (no lookup needed!)
        await ctx.db.replace(cachedSync.internalId, dto.data);
        await ctx.db.patch(cachedSync._id, { checksum: dto.checksum });
      }
    }
    return skippedCount;
  },
});
