import type { Chamber } from "@/lib/chambers";

export interface CongressVote {
  vote_record_id: string;
  chamber: Chamber;
  period_number: number | null;
  session_type: string | null;
  date: string | null;
  title: string | null;
  vote_type: string | null;
  result: string | null;
  president_name: string | null;
  affirmative_votes: number | null;
  negative_votes: number | null;
  abstentions: number | null;
  absents: number | null;
  summary: string | null;
  topic: string | null;
}

export interface CongressVoteDetail {
  vote_record_id: string;
  legislator_name: string | null;
  bloc: string | null;
  district: string | null;
  vote: string | null;
}

export interface SanctionedLaw {
  law_number: string;
  project_id: string | null;
  sanctioning_chamber: string | null;
  initial_file: string | null;
  first_half_sanction: string | null;
  second_half_sanction: string | null;
  final_sanction: string | null;
  title: string | null;
  summary: string | null;
}

export interface BlocAttendance {
  chamber: Chamber;
  bloc: string;
  total_votes: number;
  present_votes: number;
  attendance_pct: string;
}

export interface Senator {
  senator_id: string;
  last_name: string | null;
  first_name: string | null;
  bloc: string | null;
  province: string | null;
  party: string | null;
  mandate_start: string | null;
  mandate_end: string | null;
}

export interface BlocSummary {
  bloc: string | null;
  count: number;
}
