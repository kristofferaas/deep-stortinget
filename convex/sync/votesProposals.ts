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
  returns: v.array(v.number()),
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
    await batcher(voteProposalsWithChecksums, async (batch) => {
      return await ctx.runMutation(
        internal.sync.votesProposals.batchUpsertVoteProposals,
        {
          batch,
        },
      );
    });

    return voteProposalsWithChecksums.map((p) => p.id);
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
  handler: async (ctx, args) => {
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
      } else {
        // Checksum changed - update vote proposal using stored internalId (no lookup needed!)
        await ctx.db.replace(cachedSync.internalId, dto.data);
        await ctx.db.patch(cachedSync._id, { checksum: dto.checksum });
      }
    }
    return null;
  },
});
