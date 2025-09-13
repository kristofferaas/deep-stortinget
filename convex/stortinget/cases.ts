import { v } from 'convex/values';
import { query } from '../_generated/server';
import { caseValidator, voteValidator } from '../sync/validators';

export const caseCount = query({
  args: {},
  returns: v.number(),
  handler: async ctx => {
    const cases = await ctx.db.query('cases').collect();
    return cases.length;
  },
});

export const latestCases = query({
  handler: async ctx => {
    const docs = await ctx.db
      .query('cases')
      .withIndex('by_last_updated_date')
      .order('desc')
      .take(50);

    const votesForCases = await Promise.all(
      docs.map(doc =>
        ctx.db
          .query('votes')
          .withIndex('by_case_id', q => q.eq('sak_id', doc.id))
          .collect()
      )
    );

    return docs.map((doc, index) => ({
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
  },
});

export const paginatedCases = query({
  args: {
    page: v.number(),
    pageSize: v.number(),
  },
  returns: v.object({
    total: v.number(),
    page: v.number(),
    pageSize: v.number(),
    cases: v.array(
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
      })
    ),
  }),
  handler: async (ctx, args) => {
    const page = Math.max(1, Math.floor(args.page));
    const pageSize = Math.min(100, Math.max(1, Math.floor(args.pageSize)));

    const total = (await ctx.db.query('cases').collect()).length;

    const offset = (page - 1) * pageSize;

    const docs = await ctx.db
      .query('cases')
      .withIndex('by_last_updated_date')
      .order('desc')
      .take(offset + pageSize);

    const slice = docs.slice(offset, offset + pageSize);

    const votesForCases = await Promise.all(
      slice.map(doc =>
        ctx.db
          .query('votes')
          .withIndex('by_case_id', q => q.eq('sak_id', doc.id))
          .collect()
      )
    );

    const cases = slice.map((doc, index) => ({
      id: doc.id,
      type: doc.type,
      tittel: doc.tittel,
      korttittel: doc.korttittel,
      status: doc.status,
      dokumentgruppe: doc.dokumentgruppe,
      sist_oppdatert_dato: doc.sist_oppdatert_dato,
      sak_fremmet_id: doc.sak_fremmet_id ?? null,
      henvisning: doc.henvisning,
      votes: votesForCases[index]?.length ?? 0,
    }));

    return { total, page, pageSize, cases };
  },
});

export const getCaseById = query({
  args: { id: v.number() },
  returns: v.union(
    v.object({
      case: caseValidator,
      votes: v.array(voteValidator),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query('cases')
      .withIndex('by_case_id', q => q.eq('id', args.id))
      .unique();

    if (!doc) return null;

    const votes = await ctx.db
      .query('votes')
      .withIndex('by_case_id', q => q.eq('sak_id', args.id))
      .collect();

    console.log('For case', args.id, 'found', votes.length, 'votes');

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

    const serializedVotes = votes.map(v => ({
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
