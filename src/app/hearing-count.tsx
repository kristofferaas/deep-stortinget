'use client';

import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export default function HearingCount() {
  const count = useQuery(api.stortinget.hearings.hearingCount);
  return (
    <div className="text-black font-geist-sans text-sm">
      Hearings in DB: {count ?? '…'}
    </div>
  );
}
