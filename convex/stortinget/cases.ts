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
      versjon: doc.versjon,
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
      versjon: doc.versjon,
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
