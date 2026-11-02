# Ballot ID and vote ledger

## Goal
Each person gets a unique ID for the year that stands for their votes. Anyone holding it can
see those votes at `/verify` and check that they haven't changed since they were sealed.

## How it works
- **Ballot ID:** `CP26-XXXXX-XXXXX-XXXXX-XXXXC`. HMAC-SHA256(`BALLOT_ID_SECRET`, voter + year),
  95 bits in Crockford base32 plus a check character that catches typos. One per person per
  year, derived rather than stored (`lib/ballot.ts`).
- **Year:** the UTC year the vote was finished. Finishing votes either side of New Year gives
  two IDs, each holding that year's votes.
- **Sealing:** the first visit to `/share/votes` after "Finish & share" adds a block to
  `vote_ledger`. It runs apart from the vote itself, so a ledger failure can't cost a vote.
- **Block:** height, previous hash, fingerprint of the ID, one hash per vote, timestamp, and
  its own hash (`lib/ledger.ts`). No voter id and no ask id, so the public chain reveals no
  choices. The private link is `votes.block_height`.
- **Verifying:** `/verify` fetches the ballot and the whole chain, then recomputes every hash
  in the browser with the same code that sealed them.

## Decisions
- **It's a hash chain, not a blockchain network.** It shows tampering but has one operator.
- **Viewing only.** An ID opens votes; it can't cast, change or sign in. Votes are locked once
  finished, and an ID that's meant to be shared must not double as a password.
- **The ID is printed on the share card**, so anyone who sees the card can check it. The card
  already shows those votes, so this exposes little more, except votes finished later that
  year under the same ID. The "i" explaining it is on the page only, not the image.
- **The card image takes the ID as `?ballot=`.** Reading it from the cookie instead would make
  the image private to one voter, and it's served with a public cache header. The ID does reach
  our request logs, which adds nothing: we can derive every ID anyway. The value is parsed
  first, so the card can't print arbitrary text.
- **Lookup is a POST** and `/verify` keeps the ID out of the URL, away from browser history.
- **Passkey on Mac and iPhone** (`lib/ballot-passkey.ts`), named `{year}_citizen_poll`. The ID
  is the passkey's user handle, and `/verify` reads it back after fingerprint or face unlock. It
  works as a vault, not a login: the server never checks the signature, so no table is needed.
  Passkeys belong to one domain, so `localhost` ones don't carry to the live site.
- **Password on Android and as the fallback:** `{year}_citizen_poll` + the ID as the password
  (`components/vote/SaveBallotId.tsx`), which lands in Google Password Manager on Android. A
  site can only ask the browser to save, never write to the vault. Chrome and Edge get the
  Credential Management API; Safari and Firefox need a real
  form submit, hence `api/ballot/saved`. The save is tied to the site's domain, and browsers
  don't offer it in private windows. `/verify` is a password field, so saved IDs autofill.
  The prompt can't be forced or detected, and browsers may skip values nobody typed, so the
  details for adding it by hand are always shown under the button (on the share card's compact
  Save, once it's been tapped).

## Limits to keep in mind
- **It doesn't prove one person, one ID.** With Google sign-in off, a private window is a new
  voter with a new ID. Uniqueness can only come from sign-in plus Turnstile.
- **We could rewrite the entire chain** and recompute every hash, because we run it. The fix is
  publishing the latest block hash somewhere we don't control, such as a public git repo, on a
  schedule (tracked in tech-debt).
- **Anyone with `BALLOT_ID_SECRET` and the votes table can work out every voter's ID.** Treat
  the secret like the service role key. Rotating it changes every ID, so don't.

## To switch on
1. Set `BALLOT_ID_SECRET` (`openssl rand -hex 32`) in `.env.local` and on Vercel. It must be
   the same value everywhere, or seals made in different places get different IDs.
2. Apply `supabase/migrations/202611011200_vote_ledger.sql`.

Without both, `/share/votes` works as before and shows no ID.

## Done when
Migration applied, secret set, a real ballot sealed and verified on `/verify`.
