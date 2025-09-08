import { internalAction, internalMutation, query } from '../_generated/server';
import { v } from 'convex/values';
import { caseResponseSchema } from './helpers';
import { internal } from '../_generated/api';
import { caseValidator } from '../validators';

// latestCases moved to end of file

export const syncCases = internalAction({
  args: {},
  returns: v.object({
    status: v.number(),
    newCaseCount: v.number(),
  }),
  handler: async ctx => {
    const baseUrl =
      process.env.STORTINGET_BASE_URL ?? 'https://data.stortinget.no';
    const url = new URL('/eksport/saker', baseUrl);
    url.searchParams.set('format', 'json');

    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    try {
      const json = await response.json();
      const parsed = caseResponseSchema.parse(json);

      const inserted: number = await ctx.runMutation(
        internal.stortinget.cases.insertMissingCases,
        { cases: parsed.saker_liste }
      );

      return { status: response.status, newCaseCount: inserted };
    } catch (err) {
      console.error(err);
      return { status: response.status, newCaseCount: 0 };
    }
  },
});

export const insertMissingCases = internalMutation({
  args: {
    cases: v.array(caseValidator),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    let insertedCount = 0;
    for (const sak of args.cases) {
      const existing = await ctx.db
        .query('cases')
        .withIndex('by_case_id', q => q.eq('id', sak.id))
        .unique();
      if (!existing) {
        await ctx.db.insert('cases', sak);
        insertedCount += 1;
      }
    }
    return insertedCount;
  },
});

export const caseCount = query({
  args: {},
  returns: v.number(),
  handler: async ctx => {
    const cases = await ctx.db.query('cases').collect();
    return cases.length;
  },
});

export const latestCases = query({
  args: {},
  returns: v.array(caseValidator),
  handler: async ctx => {
    const docs = await ctx.db
      .query('cases')
      .withIndex('by_last_updated_date')
      .order('desc')
      .take(100);

    return docs.map(doc => ({
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
    }));
  },
});

export const getCaseById = query({
  args: { id: v.number() },
  returns: v.union(caseValidator, v.null()),
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query('cases')
      .withIndex('by_case_id', q => q.eq('id', args.id))
      .unique();

    if (!doc) return null;

    return {
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
  },
});
