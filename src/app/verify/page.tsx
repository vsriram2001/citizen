import type { Metadata } from "next";
import { SiteHeader } from "@/components/nav/SiteHeader";
import { VerifyBallot } from "@/components/vote/VerifyBallot";

export const metadata: Metadata = {
  title: "Verify a ballot · Citizen Poll",
  description: "Enter a Ballot ID to see its votes and check them against the public ledger.",
};

export default function Verify() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 mx-auto w-full max-w-lg px-4 sm:px-6 py-6 sm:py-14 pb-[max(2rem,env(safe-area-inset-bottom))] flex flex-col gap-6">
        <VerifyBallot />

        <p className="text-[13px] text-text-muted leading-relaxed">
          The ledger shows if a sealed ballot has been changed. It&rsquo;s run by Citizen Poll, not
          a network of independent computers, and it doesn&rsquo;t show that each ID belongs to a
          different person.
        </p>
      </main>
    </div>
  );
}
