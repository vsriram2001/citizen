import { readFile } from "fs/promises";
import path from "path";
import { ImageResponse } from "next/og";
import { getApprovedSubmissionsByIds } from "@/lib/submissions";

export const runtime = "nodejs";

/**
 * The "my votes" share card as a standalone PNG — a ballot-slip result,
 * not a screenshot of the page. Takes ?ids=a,b,c (voted ask ids, from the
 * client's local vote record — see lib/vote-session.ts) and renders a single
 * branded card listing each ask + its deadline.
 *
 * Fixed 1080x1920 (9:16) portrait canvas rather than a landscape one: a
 * website can't detect which app or surface (WhatsApp chat vs. WhatsApp
 * Story vs. Instagram Story vs. a Twitter post) the OS share sheet hands
 * off to, so there's no way to pick a shape per destination. 9:16 is the
 * one shape that works everywhere without cropping badly — it's the exact
 * ratio Stories require, and chat apps / feed posts all display a tall
 * portrait image inline without the awkward letterboxing a landscape image
 * gets when dropped into a Story.
 *
 * A route handler rather than opengraph-image.tsx because this is a
 * user-triggered download/share action with a dynamic id set, not a
 * per-page OG convention.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 3);

  const fontDir = path.join(process.cwd(), "src", "fonts");
  const [asks, voteIconBuffer, playfairBuffer, pubSans400Buffer, pubSans700Buffer] =
    await Promise.all([
      getApprovedSubmissionsByIds(ids),
      readFile(path.join(process.cwd(), "public", "illustration-vote.png")),
      readFile(path.join(fontDir, "playfair-display.ttf")),
      readFile(path.join(fontDir, "public-sans-400.ttf")),
      readFile(path.join(fontDir, "public-sans-700.ttf")),
    ]);
  const voteIconSrc = `data:image/png;base64,${voteIconBuffer.toString("base64")}`;

  const width = 1080;
  // Portrait canvas (see file header), but height adapts to content between
  // a floor and 1920 — a fixed 1920px for every vote count left a single
  // vote looking like a sparse card floating in a mostly-empty frame, since
  // Satori has no reliable "shrink-wrap, but no smaller than X" primitive
  // to lean on. Estimating from character count and clamping keeps 1-3
  // votes all reading as a filled, intentional card rather than an island.
  const CHARS_PER_LINE = 34;
  const askLines = (text: string) => Math.max(1, Math.ceil(text.length / CHARS_PER_LINE));
  const rowsHeight = asks.reduce((sum, ask) => sum + 158 + askLines(ask.askText) * 48, 0);
  const HEADER_BLOCK = 470;
  const CHROME = 380; // canvas padding + card padding + perforation + footer
  const estimatedHeight = HEADER_BLOCK + rowsHeight + CHROME;
  const height = Math.min(1920, Math.max(1280, estimatedHeight));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#F1EFE8",
          fontFamily: "Public Sans",
          padding: "64px 0",
        }}
      >
        {/* Canvas height is estimated from content above, so the card
            naturally fills most of the frame without empty space — no
            flex-stretch tricks needed here since the frame is already
            close to the card's real size. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 936,
            borderRadius: 32,
            border: "1px solid #D9D7CF",
            background: "#FFFFFF",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              height: 22,
              backgroundImage:
                "repeating-linear-gradient(90deg, #1A1A18 0 11px, #F1EFE8 11px 22px)",
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 56,
              padding: "12px 72px 64px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse requires a raw <img>, not next/image */}
              <img src={voteIconSrc} width={100} height={112} alt="" style={{ marginBottom: 28 }} />
              <span
                style={{
                  fontSize: 22,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  color: "#8A8A82",
                  marginBottom: 20,
                }}
              >
                Citizen Poll · Official Record
              </span>
              <span
                style={{
                  display: "flex",
                  fontFamily: "Playfair Display",
                  fontSize: 60,
                  fontWeight: 900,
                  lineHeight: 1.16,
                  letterSpacing: -0.5,
                  color: "#1A1A18",
                  textWrap: "balance",
                }}
              >
                Here&apos;s what I voted for
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              {asks.map((ask, i) => (
                <div
                  key={ask.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 30,
                    padding: "44px 0",
                    borderTop: "1px solid #D9D7CF",
                    ...(i === asks.length - 1
                      ? { borderBottom: "1px solid #D9D7CF" }
                      : {}),
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      fontFamily: "Playfair Display",
                      fontSize: 42,
                      fontWeight: 900,
                      color: "#8A8A82",
                      width: 48,
                      flexShrink: 0,
                      justifyContent: "center",
                      marginTop: 4,
                    }}
                  >
                    {i + 1}
                  </span>
                  {/* Explicit width: Satori doesn't shrink flex children, so
                      without it long asks run past the divider lines.
                      792 (card inner) - 48 (number) - 30 (gap) = 714. */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      width: 714,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 34,
                        fontWeight: 700,
                        color: "#1A1A18",
                        lineHeight: 1.42,
                      }}
                    >
                      {ask.askText}
                    </span>
                    <span
                      style={{
                        display: "flex",
                        fontSize: 25,
                        color: "#8A8A82",
                        marginTop: 14,
                      }}
                    >
                      Deadline {ask.timeframe}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <span
          style={{
            display: "flex",
            fontSize: 20,
            color: "#8A8A82",
            marginTop: 40,
            letterSpacing: 0.5,
          }}
        >
          citizenpoll.in
        </span>
      </div>
    ),
    {
      width,
      height,
      fonts: [
        {
          name: "Playfair Display",
          data: playfairBuffer,
          weight: 900,
          style: "normal",
        },
        {
          name: "Public Sans",
          data: pubSans400Buffer,
          weight: 400,
          style: "normal",
        },
        {
          name: "Public Sans",
          data: pubSans700Buffer,
          weight: 700,
          style: "normal",
        },
      ],
    },
  );
}
