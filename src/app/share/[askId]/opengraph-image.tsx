import { ImageResponse } from "next/og";
import { getApprovedSubmission } from "@/lib/submissions";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ImageResponse renders via Satori, which only understands inline styles —
// no Tailwind classes, no external CSS. Mirrors ShareCard's layout by hand
// using the same palette tokens (see globals.css) since @theme values
// aren't reachable here either.
export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ askId: string }>;
}) {
  const { askId } = await params;
  const ask = await getApprovedSubmission(askId);

  const askText = ask?.askText ?? "A specific, quantifiable policy ask";
  const deadline = ask?.timeframe;
  const current = ask?.currentValue;
  const target = ask?.targetValue;
  const votes = ask?.voteCount ?? 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#FAFAF7",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 22,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#8A8A82",
          }}
        >
          <span>Citizen Poll</span>
          {deadline && <span>Deadline {deadline}</span>}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 56,
            fontWeight: 900,
            lineHeight: 1.15,
            color: "#33322E",
            maxWidth: 980,
          }}
        >
          {askText}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {current && target && (
            <div style={{ display: "flex", alignItems: "center", fontSize: 30 }}>
              <span style={{ color: "#5A5A54" }}>{current}</span>
              <span style={{ color: "#8A8A82", margin: "0 16px" }}>→</span>
              <span style={{ color: "#1A1A18", fontWeight: 700 }}>{target}</span>
            </div>
          )}
          <div style={{ display: "flex", fontSize: 24, color: "#5A5A54" }}>
            {votes.toLocaleString("en-IN")} {votes === 1 ? "vote" : "votes"}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
