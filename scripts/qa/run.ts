/*
  QA sweep: drives the running app at phone and desktop sizes, screenshots
  every screen and vote state, and records console errors, failed requests,
  sideways scroll, small tap targets and axe accessibility violations.

    npx tsx scripts/qa/run.ts [baseUrl] [outDir]

  Signed-in flows use a throwaway Supabase user (QA_TEST_EMAIL /
  QA_TEST_PASSWORD in .env.local) logged in with a password, its session
  written into the browser as the same cookie @supabase/ssr would set — so no
  Google round trip. Its votes are wiped before and after the run. This writes
  to the SHARED database (votes on real asks, then removed).
*/
import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    // Never inherit the local TLS-off workaround into the test run.
    if (m && m[1] !== "NODE_TLS_REJECT_UNAUTHORIZED" && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv();

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = process.argv[3] ?? "qa-output";
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const admin = createClient(SUPA_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const VIEWPORTS = {
  mobile: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
} as const;
type VP = keyof typeof VIEWPORTS;

type Finding = { vp: VP; shot: string; kind: string; detail: string };
const findings: Finding[] = [];
const shots: string[] = [];

// ---------- test user ----------

let qaUserId = "";

async function sessionCookies() {
  const jar = new Map<string, string>();
  const supabase = createServerClient(SUPA_URL, ANON, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: process.env.QA_TEST_EMAIL!,
    password: process.env.QA_TEST_PASSWORD!,
  });
  if (error) throw new Error(`QA sign-in failed: ${error.message}`);
  qaUserId = data.user!.id;
  const host = new URL(BASE).hostname;
  return [...jar].map(([name, value]) => ({ name, value, domain: host, path: "/" }));
}

async function resetQaUser() {
  if (!qaUserId) return;
  await admin.from("votes").delete().eq("session_token", qaUserId);
  await admin.from("sessions").delete().eq("id", qaUserId);
}

// ---------- page instrumentation ----------

function instrument(page: Page, vp: VP, label: () => string) {
  page.on("console", (m) => {
    if (m.type() === "error")
      findings.push({ vp, shot: label(), kind: "console", detail: m.text().slice(0, 300) });
  });
  page.on("pageerror", (e) =>
    findings.push({ vp, shot: label(), kind: "pageerror", detail: e.message.slice(0, 300) }),
  );
  page.on("response", (r) => {
    const u = r.url();
    if (r.status() >= 400 && u.startsWith(BASE) && !u.includes("/_next/webpack-hmr"))
      findings.push({ vp, shot: label(), kind: "http", detail: `${r.status()} ${r.request().method()} ${u.replace(BASE, "")}` });
  });
  page.on("requestfailed", (r) => {
    const u = r.url();
    if (u.startsWith(BASE) && !u.includes("_rsc") && !u.includes("webpack-hmr"))
      findings.push({ vp, shot: label(), kind: "requestfailed", detail: `${r.failure()?.errorText} ${u.replace(BASE, "")}` });
  });
}

async function check(page: Page, vp: VP, name: string, opts: { axe?: boolean } = {}) {
  await page.waitForTimeout(600);
  const file = `${vp}-${name}.png`;
  await page.screenshot({ path: path.join(OUT, file), fullPage: vp === "mobile" });
  shots.push(file);

  const layout = await page.evaluate(() => {
    const doc = document.documentElement;
    const overflowX = doc.scrollWidth - window.innerWidth;
    // Interactive elements that are visible but smaller than a fingertip.
    const small: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("a, button, input, select, [role=button]")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const st = getComputedStyle(el);
      if (st.visibility === "hidden" || st.display === "none") continue;
      if (r.height < 32 || r.width < 32) {
        const t = (el.innerText || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 40);
        small.push(`${t} (${Math.round(r.width)}×${Math.round(r.height)})`);
      }
    }
    // Text that spills out of its box horizontally.
    const clipped: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("h1, h2, h3, p, span, a, button")) {
      if (el.children.length > 0) continue;
      if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== "visible") {
        clipped.push((el.innerText || "").trim().slice(0, 50));
      }
    }
    return { overflowX, small: [...new Set(small)].slice(0, 15), clipped: [...new Set(clipped)].slice(0, 10) };
  });
  if (layout.overflowX > 1)
    findings.push({ vp, shot: file, kind: "overflow-x", detail: `page is ${layout.overflowX}px wider than the viewport` });
  if (vp === "mobile" && layout.small.length)
    findings.push({ vp, shot: file, kind: "tap-target", detail: layout.small.join(" · ") });
  if (layout.clipped.length)
    findings.push({ vp, shot: file, kind: "clipped-text", detail: layout.clipped.join(" · ") });

  if (opts.axe !== false) {
    try {
      const res = await // axe bundles its own playwright-core types; the runtime object is the same.
      new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]["page"] }).withTags(["wcag2a", "wcag2aa"]).analyze();
      for (const v of res.violations)
        findings.push({
          vp,
          shot: file,
          kind: `a11y:${v.impact}`,
          detail: `${v.id} — ${v.help} (${v.nodes.length}×: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", ")})`,
        });
    } catch (e) {
      findings.push({ vp, shot: file, kind: "axe-failed", detail: String(e).slice(0, 200) });
    }
  }
}

async function newPage(browser: Browser, vp: VP, opts: { signedIn?: boolean; onboarded?: boolean } = {}) {
  const ctx: BrowserContext = await browser.newContext({ ...VIEWPORTS[vp], baseURL: BASE });
  if (opts.signedIn) await ctx.addCookies(await sessionCookies());
  if (opts.onboarded)
    await ctx.addInitScript(() => {
      window.localStorage.setItem(
        "citizen:onboarding",
        JSON.stringify({ age: 30, location: { state: "Karnataka" }, gender: "prefer-not" }),
      );
    });
  const page = await ctx.newPage();
  let current = "start";
  instrument(page, vp, () => current);
  return {
    page,
    ctx,
    shot: async (name: string, o?: { axe?: boolean }) => {
      current = `${vp}-${name}.png`;
      await check(page, vp, name, o);
    },
    go: async (url: string) => {
      current = url;
      await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 }).catch(() => page.waitForLoadState("load"));
    },
  };
}

const voteButtons = (page: Page) => page.getByRole("button", { name: "Vote", exact: true });

async function step(name: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    findings.push({ vp: "desktop", shot: name, kind: "script", detail: String(e).split("\n")[0].slice(0, 300) });
    console.error(`  ✗ ${name}: ${String(e).split("\n")[0]}`);
  }
}

// ---------- scenarios ----------

async function signedOut(browser: Browser, vp: VP) {
  const { page, ctx, shot, go } = await newPage(browser, vp);
  await step(`${vp} home`, async () => {
    await go("/");
    await shot("01-home");
  });
  await step(`${vp} search`, async () => {
    await go("/search");
    await shot("02-search");
  });
  await step(`${vp} search-typed`, async () => {
    await page.getByPlaceholder(/Search for an ask/).fill("water");
    await page.waitForTimeout(2500);
    await shot("03-search-water");
  });
  await step(`${vp} search-nomatch`, async () => {
    await page.getByPlaceholder(/Search for an ask/).fill("free wifi in every government school");
    await page.waitForTimeout(9000);
    await shot("04-search-no-match");
  });
  if (vp === "mobile")
    await step(`${vp} menu`, async () => {
      await go("/search");
      await page.getByRole("button", { name: /menu/i }).first().click();
      await shot("05-mobile-menu");
    });
  await step(`${vp} vote-signed-out-not-onboarded`, async () => {
    await go("/search");
    await voteButtons(page).first().click();
    await page.waitForURL(/onboarding/, { timeout: 10_000 });
    await shot("06-onboarding-from-vote");
  });
  await step(`${vp} onboarding-filled`, async () => {
    // Continue stays disabled until the required fields are filled.
    await page.getByPlaceholder("e.g. 27").fill("30");
    await page.getByRole("button", { name: "Male", exact: true }).click();
    await shot("07-onboarding-partly-filled");
  });
  await step(`${vp} share`, async () => {
    await go("/share");
    await shot("08-share");
    await go("/share/d87e4ed8-3f29-41ed-862d-d9635fe33338");
    await shot("09-share-ask");
    await page.getByRole("link", { name: "Vote for this ask" }).click();
    await page.waitForURL(/search\?q=/);
    await page.waitForTimeout(2500);
    await shot("09b-vote-from-share");
    await go("/share/votes");
    await shot("10-share-votes-signed-out");
    await go("/share/does-not-exist");
    await shot("11-share-missing-ask");
    await go("/nope");
    await shot("12-404");
  });
  await ctx.close();

  const o = await newPage(browser, vp, { onboarded: true });
  await step(`${vp} sign-in-modal`, async () => {
    await o.go("/search");
    await voteButtons(o.page).first().click();
    await o.page.waitForTimeout(500);
    await o.shot("13-sign-in-modal");
  });
  await o.ctx.close();
}

async function signedIn(browser: Browser, vp: VP) {
  await resetQaUser();
  const { page, ctx, shot, go } = await newPage(browser, vp, { signedIn: true, onboarded: true });
  // Vote for the top asks only — they have plenty of other votes, so a
  // retract can never drop one to 0 (which deletes the ask).
  await step(`${vp} signed-in flow`, async () => {
    await go("/search");
    await shot("20-search-signed-in");
    await voteButtons(page).first().click();
    await page.waitForTimeout(1500);
    await shot("21-one-vote");
    await voteButtons(page).first().click();
    await page.waitForTimeout(1500);
    await voteButtons(page).first().click();
    await page.waitForTimeout(1500);
    await shot("22-three-votes");
    await voteButtons(page).first().click();
    await page.waitForTimeout(800);
    await shot("23-replace-card");
    await page.getByRole("button", { name: "Replace" }).last().click();
    await page.waitForTimeout(2500);
    await shot("24-after-replace");
    // Phone tray says "Review", desktop "Review my votes".
    await page.getByRole("button", { name: /^review/i }).click();
    await page.waitForTimeout(600);
    await shot("25-review");
    await page.getByRole("button", { name: /submit & share/i }).click();
    await page.waitForTimeout(1200);
    await shot("26-ballot-animation", { axe: false });
    await page.waitForURL(/share\/votes/, { timeout: 20_000 });
    await page.waitForTimeout(1500);
    await shot("27-share-votes");
    await go("/search");
    await page.waitForTimeout(1500);
    await shot("28-search-all-submitted");
    await page.getByRole("button", { name: /my votes/i }).last().click();
    await page.waitForTimeout(600);
    await shot("29-review-locked");
  });
  await ctx.close();
  await resetQaUser();
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  // The installed Chrome — no separate browser download needed.
  const browser = await chromium.launch({ channel: "chrome" });
  for (const vp of ["mobile", "desktop"] as VP[]) {
    console.log(`▶ ${vp}: signed out`);
    await signedOut(browser, vp);
    console.log(`▶ ${vp}: signed in`);
    await signedIn(browser, vp);
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, "findings.json"), JSON.stringify({ shots, findings }, null, 2));
  console.log(`\n${shots.length} screenshots, ${findings.length} findings → ${OUT}/findings.json`);
}

main().catch(async (e) => {
  console.error(e);
  await resetQaUser();
  process.exit(1);
});
