import { v } from "convex/values";
import { z } from "zod";
import { internalAction, internalMutation } from "../_generated/server";
import { stortingetDtoSchema, computeChecksum, batcher } from "./helpers";
import { partySchema } from "./parties";
import { voteProposalValidator, VoteProposal } from "./validators";
import { internal } from "../_generated/api";

const voteProposalSchema = stortingetDtoSchema.extend({
  forslag_betegnelse: z
    .string()
    .nullable()
    .transform((val) => val ?? undefined),
  forslag_betegnelse_kort: z
    .string()
    .nullable()
    .transform((val) => val ?? undefined),
  forslag_id: z.number(),
  forslag_levert_av_parti_liste: z.array(partySchema),
  forslag_levert_av_representant: z.unknown(),
  forslag_paa_vegne_av_tekst: z
    .string()
    .nullable()
    .transform((val) => val ?? undefined),
  forslag_sorteringsnummer: z.number(),
  forslag_tekst: z
    .string()
    .nullable()
    .transform((val) => val ?? undefined),
  forslag_type: z.number(),
});

const voteProposalsResponseSchema = stortingetDtoSchema.extend({
  votering_id: z.number(),
  voteringsforslag_liste: z.array(voteProposalSchema),
});

type VoteProposalDTO = z.infer<typeof voteProposalsResponseSchema>;

const normalizeVoteProposals = async (
  dto: VoteProposalDTO,
): Promise<
  Array<{
    id: number;
    data: Omit<VoteProposal, "checksum">;
    checksum: string;
  }>
> => {
  const voteId = dto.votering_id;
  return await Promise.all(
    dto.voteringsforslag_liste.map(async (proposal) => {
      const normalized = {
        votering_id: voteId,
        forslag_betegnelse: proposal.forslag_betegnelse,
        forslag_betegnelse_kort: proposal.forslag_betegnelse_kort,
        forslag_id: proposal.forslag_id,
        forslag_paa_vegne_av_tekst: proposal.forslag_paa_vegne_av_tekst,
        forslag_sorteringsnummer: proposal.forslag_sorteringsnummer,
        forslag_tekst: proposal.forslag_tekst,
        forslag_type: proposal.forslag_type,
      };
      const checksum = await computeChecksum(normalized);
      return {
        id: proposal.forslag_id,
        data: normalized,
        checksum: checksum,
      };
    }),
  );
};

export const syncVoteProposals = internalAction({
  args: { voteId: v.number() },
  returns: v.object({
    voteProposalIds: v.array(v.number()),
    added: v.number(),
    updated: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx, args) => {
    const baseUrl =
      process.env.STORTINGET_BASE_URL ?? "https://data.stortinget.no";
    const url = new URL("/eksport/voteringsforslag", baseUrl);
    url.searchParams.set("format", "json");
    url.searchParams.set("voteringid", args.voteId.toString());

    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    const json = await response.json();
    const parsed = voteProposalsResponseSchema.parse(json);

    const voteProposalsWithChecksums = await normalizeVoteProposals(parsed);

    // Process vote proposals in batches
    const results: Array<{
      added: number;
      updated: number;
      skipped: number;
    }> = await batcher(
      voteProposalsWithChecksums,
      async (
        batch,
      ): Promise<{ added: number; updated: number; skipped: number }> => {
        return await ctx.runMutation(
          internal.sync.votesProposals.batchUpsertVoteProposals,
          {
            batch,
          },
        );
      },
    );

    // Aggregate counts from all batches
    const totals = results.reduce(
      (acc, r) => ({
        added: acc.added + r.added,
        updated: acc.updated + r.updated,
        skipped: acc.skipped + r.skipped,
      }),
      { added: 0, updated: 0, skipped: 0 },
    );

    return {
      voteProposalIds: voteProposalsWithChecksums.map((p) => p.id),
      ...totals,
    };
  },
});

export const batchUpsertVoteProposals = internalMutation({
  args: v.object({
    batch: v.array(
      v.object({
        id: v.number(),
        data: voteProposalValidator,
        checksum: v.string(),
      }),
    ),
  }),
  returns: v.object({
    added: v.number(),
    updated: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx, args) => {
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const dto of args.batch) {
      // First, check if a sync cache entry exists
      // This only queries the index, not the full document (cheap!)
      const cachedSync = await ctx.db
        .query("syncCache")
        .withIndex("by_table_and_external_id", (q) =>
          q.eq("table", "voteProposals").eq("externalId", dto.id),
        )
        .unique();

      if (cachedSync && cachedSync.checksum === dto.checksum) {
        // Checksum matches - skip (no database read or write needed!)
        skippedCount++;
        continue;
      }

      if (!cachedSync) {
        // New record - insert vote proposal and sync cache entry
        const voteProposalId = await ctx.db.insert("voteProposals", dto.data);
        await ctx.db.insert("syncCache", {
          table: "voteProposals",
          externalId: dto.id,
          checksum: dto.checksum,
          internalId: voteProposalId,
        });
        addedCount++;
      } else {
        // Checksum changed - update vote proposal using stored internalId (no lookup needed!)
        await ctx.db.replace(cachedSync.internalId, dto.data);
        await ctx.db.patch(cachedSync._id, { checksum: dto.checksum });
        updatedCount++;
      }
    }
    return { added: addedCount, updated: updatedCount, skipped: skippedCount };
  },
});
