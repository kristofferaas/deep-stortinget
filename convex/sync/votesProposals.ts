import { v } from "convex/values";
import { z } from "zod";
import { internalAction, internalMutation } from "../_generated/server";
import { stortingetDtoSchema } from "./helpers";
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

const normalizeVoteProposals = (dto: VoteProposalDTO): VoteProposal[] => {
  const voteId = dto.votering_id;
  return dto.voteringsforslag_liste.map((proposal) => ({
    votering_id: voteId,
    forslag_betegnelse: proposal.forslag_betegnelse,
    forslag_betegnelse_kort: proposal.forslag_betegnelse_kort,
    forslag_id: proposal.forslag_id,
    forslag_paa_vegne_av_tekst: proposal.forslag_paa_vegne_av_tekst,
    forslag_sorteringsnummer: proposal.forslag_sorteringsnummer,
    forslag_tekst: proposal.forslag_tekst,
    forslag_type: proposal.forslag_type,
  }));
};

export const syncVoteProposals = internalAction({
  args: { voteId: v.number() },
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

    const upserted: number[] = await ctx.runMutation(
      internal.sync.votesProposals.upsertVoteProposals,
      {
        voteProposals: normalizeVoteProposals(parsed),
      },
    );

    return upserted;
  },
});

export const upsertVoteProposals = internalMutation({
  args: { voteProposals: v.array(voteProposalValidator) },
  handler: async (ctx, args) => {
    const voteProposalIds: number[] = [];
    for (const voteProposal of args.voteProposals) {
      const existing = await ctx.db
        .query("voteProposals")
        .withIndex("by_vote_proposal_id", (q) =>
          q.eq("forslag_id", voteProposal.forslag_id),
        )
        .unique();

      if (existing) {
        // TODO: Determine if we need to update the vote proposal
      } else {
        await ctx.db.insert("voteProposals", voteProposal);
        voteProposalIds.push(voteProposal.forslag_id);
      }
    }
    return voteProposalIds;
  },
});
