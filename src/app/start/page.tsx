import { SiteHeader } from "@/components/nav/SiteHeader";
import { StartClient } from "@/components/start/StartClient";
import { TOPIC_NAMES } from "@/lib/topics";

export const metadata = { title: "What matters to you? · Citizen Poll" };

/*
  Between onboarding and the list. People who land straight on Popular
  anchor on what's already winning; this asks about them first. Their
  picks become the topic tabs on /search, and the list opens on the first.
  Every topic shows, in a fixed order, even ones with few asks yet: ordering
  by count would steer people toward what's already common.
*/
export default function Start() {
  return (
    <div className="min-h-dvh flex flex-col">
      <SiteHeader sticky />
      <main className="flex-1 flex flex-col mx-auto w-full max-w-3xl px-4 sm:px-6 pt-4 sm:pt-8">
        <StartClient topics={TOPIC_NAMES} />
      </main>
    </div>
  );
}
