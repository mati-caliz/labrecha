import type { ReactElement } from "react";
import { CountryStatus } from "@/components/home/CountryStatus";
import { GapsTeaser } from "@/components/home/GapsTeaser";
import { HomeHero } from "@/components/home/HomeHero";
import { IdeasHome } from "@/components/home/IdeasHome";
import { homeQueries } from "@/lib/pageQueries";
import { PrefetchedQueries } from "@/lib/prefetch";

export default function HomePage(): ReactElement {
  return (
    <PrefetchedQueries queries={homeQueries()}>
      <HomeHero />
      <CountryStatus />
      <GapsTeaser />
      <IdeasHome />
    </PrefetchedQueries>
  );
}
