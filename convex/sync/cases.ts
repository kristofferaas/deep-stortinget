import { internalAction, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import {
  caseResponseSchema,
  computeChecksum,
  stripStortingetDtoMetadata,
  batcher,
} from "./helpers";
import { internal } from "../_generated/api";
import { caseValidator } from "./validators";

export const syncCases = internalAction({
  handler: async (ctx) => {
    const baseUrl =
      process.env.STORTINGET_BASE_URL ?? "https://data.stortinget.no";
    const url = new URL("/eksport/saker", baseUrl);
    url.searchParams.set("format", "json");

    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    const json = await response.json();
    const parsed = caseResponseSchema.parse(json);

    // Compute checksums for all cases
    const casesWithChecksums = await Promise.all(
      parsed.saker_liste.map(async (c) => {
        const stripped = stripStortingetDtoMetadata(c);
        const checksum = await computeChecksum(stripped);
        return { id: c.id, data: stripped, checksum: checksum };
      }),
    );

    // Process cases in batches
    await batcher(casesWithChecksums, async (batch) => {
      return await ctx.runMutation(internal.sync.cases.batchUpsertCases, {
        batch,
      });
    });

    return casesWithChecksums.map((c) => c.id);
  },
});

export const batchUpsertCases = internalMutation({
  args: v.object({
    batch: v.array(
      v.object({
        id: v.number(),
        data: caseValidator,
        checksum: v.string(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    for (const dto of args.batch) {
      // First, check if a sync cache entry exists
      // This only queries the index, not the full document (cheap!)
      const cachedSync = await ctx.db
        .query("syncCache")
        .withIndex("by_table_and_external_id", (q) =>
          q.eq("table", "cases").eq("externalId", dto.id),
        )
        .unique();

      if (cachedSync && cachedSync.checksum === dto.checksum) {
        // Checksum matches - skip (no database read or write needed!)
        continue;
      }

      if (!cachedSync) {
        // New record - insert case and sync cache entry
        const caseId = await ctx.db.insert("cases", dto.data);
        await ctx.db.insert("syncCache", {
          table: "cases",
          externalId: dto.id,
          checksum: dto.checksum,
          internalId: caseId,
        });
      } else {
        // Checksum changed - update case using stored internalId (no lookup needed!)
        await ctx.db.replace(cachedSync.internalId, dto.data);
        await ctx.db.patch(cachedSync._id, { checksum: dto.checksum });
      }
    }
    return null;
  },
});
