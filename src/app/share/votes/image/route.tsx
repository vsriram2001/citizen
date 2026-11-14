import { readFile } from "fs/promises";
import path from "path";
import { ImageResponse } from "next/og";
import { parseBallotId } from "@/lib/ledger";
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
  // Parsed, not printed as given, so the card can't carry arbitrary text. An ID
  // here proves nothing by itself; /verify is what checks it.
  const ballotId = parseBallotId(searchParams.get("ballot") ?? "");

  const fontDir = path.join(process.cwd(), "src", "fonts");
  const [asks, playfairBuffer, pubSans400Buffer, pubSans700Buffer] = await Promise.all([
    getApprovedSubmissionsByIds(ids),
    readFile(path.join(fontDir, "playfair-display.ttf")),
    readFile(path.join(fontDir, "public-sans-400.ttf")),
    readFile(path.join(fontDir, "public-sans-700.ttf")),
  ]);
  const year = new Date().getUTCFullYear();

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
  const BALLOT_BLOCK = ballotId ? 170 : 0;
  const estimatedHeight = HEADER_BLOCK + rowsHeight + CHROME + BALLOT_BLOCK;
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
          background: CANVAS,
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
            background: "#FFFFFF",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              height: 22,
              backgroundImage:
                `repeating-linear-gradient(90deg, #1A1A18 0 11px, ${CANVAS} 11px 22px)`,
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
              <LogoMark />
              <span
                style={{
                  fontSize: 22,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  color: "#8A8A82",
                  marginBottom: 20,
                }}
              >
                {`Citizen Poll · My ballot ${year}`}
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

            <TearLine />

            <div style={{ display: "flex", flexDirection: "column", marginTop: -56 }}>
              {asks.map((ask, i) => (
                <div
                  key={ask.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 30,
                    padding: "44px 0",
                    ...(i > 0 ? { borderTop: "1px solid #D9D7CF" } : {}),
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

            <TearLine />

            {ballotId && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span
                  style={{
                    fontSize: 22,
                    letterSpacing: 3,
                    textTransform: "uppercase",
                    color: "#8A8A82",
                  }}
                >
                  Ballot ID
                </span>
                <span style={{ fontSize: 36, fontWeight: 700, color: "#1A1A18", letterSpacing: 1 }}>
                  {ballotId}
                </span>
                <span style={{ fontSize: 24, color: "#8A8A82" }}>
                  Check these votes at citizenpoll.in/verify
                </span>
              </div>
            )}
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

const CANVAS = "#F1EFE8";

/** The logo (nav/Logo.tsx), as the ballot animation ends on it. */
function LogoMark() {
  return (
    <svg width={86} height={110} viewBox="54.5 37 234.5 299" fill="none" style={{ marginBottom: 30 }}>
      <path d="M68.5 336V180C68.5 116 114 51 171.75 51C229.5 51 275 116 275 180V336" stroke="#1A1A18" strokeWidth={28} />
      <path
        d="M132 66C112 88 105.5 104 105.5 124V202C105.5 233 135.2 257 171.75 257C208.3 257 238 233 238 202V124C238 104 231.5 88 211.5 66"
        stroke="#1A1A18"
        strokeWidth={17.5}
      />
      <path d="M171.75 202.5V278.75" stroke="#0248A6" strokeWidth={35} strokeLinecap="round" />
    </svg>
  );
}

/**
 * A ticket's tear line, as on the page (VotesShareClient): dashes across and a
 * half-circle notch cut into each edge, canvas-coloured discs centred on the
 * card's edge that the card clips in half. Spans the card's 72px side padding.
 */
function TearLine() {
  return (
    <div style={{ display: "flex", position: "relative", height: 56, margin: "0 -72px" }}>
      <div
        style={{
          position: "absolute",
          left: 64,
          right: 64,
          top: 27,
          borderTop: "3px dashed #D9D7CF",
        }}
      />
      <div style={{ position: "absolute", left: -28, top: 0, width: 56, height: 56, borderRadius: 28, background: CANVAS }} />
      <div style={{ position: "absolute", right: -28, top: 0, width: 56, height: 56, borderRadius: 28, background: CANVAS }} />
    </div>
  );
}
