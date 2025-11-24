import { v } from "convex/values";
import { z } from "zod";
import { internalAction, internalMutation } from "../_generated/server";
import {
  parseMicrosoftJsonDate,
  stortingetDtoSchema,
  stripStortingetDtoMetadata,
  computeChecksum,
  batcher,
} from "./helpers";
import { voteValidator } from "./validators";
import { internal } from "../_generated/api";

const voteSchema = stortingetDtoSchema.extend({
  // alternativ_votering_id: z.number(),
  // antall_for: z.number(),
  // antall_ikke_tilstede: z.number(),
  // antall_mot: z.number(),
  // behandlingsrekkefoelge: z.number(),
  // dagsorden_sak_nummer: z.number(),
  // fri_votering: z.boolean(),
  // kommentar: z.string().nullable(),
  // mote_kart_nummer: z.number(),
  // personlig_votering: z.boolean(),
  // president: z.unknown(),
  sak_id: z.number(),
  vedtatt: z.boolean(),
  votering_id: z.number(),
  votering_resultat_type: z.number(),
  votering_resultat_type_tekst: z
    .string()
    .nullable()
    .transform((val) => val ?? undefined),
  votering_tema: z.string(),
  votering_tid: z.string().transform(parseMicrosoftJsonDate),
});

const voteResponseSchema = stortingetDtoSchema.extend({
  sak_id: z.number(),
  sak_votering_liste: z.array(voteSchema),
});

export const syncVotesForCase = internalAction({
  args: { caseId: v.number() },
  returns: v.object({
    voteIds: v.array(v.number()),
    skipped: v.number(),
  }),
  handler: async (ctx, args) => {
    const baseUrl =
      process.env.STORTINGET_BASE_URL ?? "https://data.stortinget.no";
    const url = new URL("/eksport/voteringer", baseUrl);
    url.searchParams.set("format", "json");
    url.searchParams.set("sakid", args.caseId.toString());

    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    const json = await response.json();
    const parsed = voteResponseSchema.parse(json);

    // Compute checksums for all votes
    const votesWithChecksums = await Promise.all(
      parsed.sak_votering_liste.map(async (voteDto) => {
        const stripped = stripStortingetDtoMetadata(voteDto);
        const checksum = await computeChecksum(stripped);
        return {
          id: voteDto.votering_id,
          data: stripped,
          checksum: checksum,
        };
      }),
    );

    // Process votes in batches
    const results = await batcher(votesWithChecksums, async (batch) => {
      const result: { voteIds: number[]; skipped: number } =
        await ctx.runMutation(internal.sync.votes.batchUpsertVotes, { batch });
      return result;
    });

    const allVoteIds = results.flatMap((r) => r.voteIds);
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
    return { voteIds: allVoteIds, skipped: totalSkipped };
  },
});

export const batchUpsertVotes = internalMutation({
  args: v.object({
    batch: v.array(
      v.object({
        id: v.number(),
        data: voteValidator,
        checksum: v.string(),
      }),
    ),
  }),
  returns: v.object({
    voteIds: v.array(v.number()),
    skipped: v.number(),
  }),
  handler: async (ctx, args) => {
    const voteIds: number[] = [];
    let skippedCount = 0;
    for (const dto of args.batch) {
      // First, check if a sync cache entry exists
      // This only queries the index, not the full document (cheap!)
      const cachedSync = await ctx.db
        .query("syncCache")
        .withIndex("by_table_and_external_id", (q) =>
          q.eq("table", "votes").eq("externalId", dto.id),
        )
        .unique();

      if (cachedSync && cachedSync.checksum === dto.checksum) {
        // Checksum matches - skip (no database read or write needed!)
        voteIds.push(dto.id);
        skippedCount++;
        continue;
      }

      if (!cachedSync) {
        // New record - insert vote and sync cache entry
        const voteId = await ctx.db.insert("votes", dto.data);
        await ctx.db.insert("syncCache", {
          table: "votes",
          externalId: dto.id,
          checksum: dto.checksum,
          internalId: voteId,
        });
      } else {
        // Checksum changed - update vote using stored internalId (no lookup needed!)
        await ctx.db.replace(cachedSync.internalId, dto.data);
        await ctx.db.patch(cachedSync._id, { checksum: dto.checksum });
      }

      voteIds.push(dto.id);
    }
    return { voteIds, skipped: skippedCount };
  },
});
