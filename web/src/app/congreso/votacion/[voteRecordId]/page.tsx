import { VoteDetail } from "@/components/congress/VoteDetail";
import { congressVoteQueries } from "@/lib/pageQueries";
import { PrefetchedQueries } from "@/lib/prefetch";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Votación - La Brecha",
  description: "Detalle de una votación nominal del Congreso, con el voto de cada bloque.",
};

interface VotePageProps {
  params: Promise<{ voteRecordId: string }>;
}

export default async function VotePage({ params }: VotePageProps) {
  const { voteRecordId } = await params;
  return (
    <PrefetchedQueries queries={congressVoteQueries(voteRecordId)}>
      <VoteDetail voteRecordId={voteRecordId} />
    </PrefetchedQueries>
  );
}
