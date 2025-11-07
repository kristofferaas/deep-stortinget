import { v } from "convex/values";
import { query } from "../_generated/server";
import { paginationOptsValidator } from "convex/server";
import { caseValidator, voteValidator } from "../sync/validators";

export const paginatedCases = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(
      v.object({
        id: v.number(),
        type: v.string(),
        tittel: v.string(),
        korttittel: v.string(),
        status: v.string(),
        dokumentgruppe: v.string(),
        sist_oppdatert_dato: v.string(),
        sak_fremmet_id: v.number(),
        henvisning: v.optional(v.string()),
        votes: v.number(),
      }),
    ),
    isDone: v.boolean(),
    continueCursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("cases")
      .withIndex("by_last_updated_date")
      .order("desc")
      .paginate(args.paginationOpts);

    const votesForCases = await Promise.all(
      result.page.map((doc) =>
        ctx.db
          .query("votes")
          .withIndex("by_case_id", (q) => q.eq("sak_id", doc.id))
          .collect(),
      ),
    );

    const cases = result.page.map((doc, index) => ({
      id: doc.id,
      type: doc.type,
      tittel: doc.tittel,
      korttittel: doc.korttittel,
      status: doc.status,
      dokumentgruppe: doc.dokumentgruppe,
      sist_oppdatert_dato: doc.sist_oppdatert_dato,
      sak_fremmet_id: doc.sak_fremmet_id,
      henvisning: doc.henvisning,
      votes: votesForCases[index]?.length ?? 0,
    }));

    return {
      page: cases,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const getCaseById = query({
  args: { id: v.number() },
  returns: v.union(
    v.object({
      case: caseValidator,
      votes: v.array(voteValidator),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("cases")
      .withIndex("by_case_id", (q) => q.eq("id", args.id))
      .unique();

    if (!doc) return null;

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_case_id", (q) => q.eq("sak_id", args.id))
      .collect();

    const serializedCase = {
      id: doc.id,
      type: doc.type,
      tittel: doc.tittel,
      korttittel: doc.korttittel,
      status: doc.status,
      dokumentgruppe: doc.dokumentgruppe,
      sist_oppdatert_dato: doc.sist_oppdatert_dato,
      sak_fremmet_id: doc.sak_fremmet_id,
      henvisning: doc.henvisning,
    };

    const serializedVotes = votes.map((v) => ({
      sak_id: v.sak_id,
      vedtatt: v.vedtatt,
      votering_id: v.votering_id,
      votering_resultat_type: v.votering_resultat_type,
      votering_resultat_type_tekst: v.votering_resultat_type_tekst,
      votering_tema: v.votering_tema,
      votering_tid: v.votering_tid,
    }));

    return {
      case: serializedCase,
      votes: serializedVotes,
    };
  },
});
