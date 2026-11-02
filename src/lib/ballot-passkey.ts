import { parseBallotId } from "@/lib/ledger";

/*
  Keeps a Ballot ID in a passkey, in iCloud Keychain or Google Password Manager.
  The ID travels as the passkey's user handle, the one small piece of data a
  passkey hands back after fingerprint or face unlock.

  So the passkey is a vault, not a login: the page reads the ID out, and the
  server never sees or checks the signature, because the ID alone already opens
  a ballot and needs no further proof. That's also why this needs no table.
*/

export type SaveMethod = "passkey" | "password";

/** Android saves to Google Password Manager; anything with Touch ID or Face ID gets a passkey. */
export async function ballotSaveMethod(): Promise<SaveMethod> {
  if (/android/i.test(navigator.userAgent)) return "password";
  try {
    const available =
      await window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable();
    return available ? "passkey" : "password";
  } catch {
    return "password";
  }
}

function challenge() {
  // Random only because the API demands one: nothing verifies the signature.
  return crypto.getRandomValues(new Uint8Array(32));
}

export async function saveBallotPasskey(id: string, year: number): Promise<void> {
  const name = `${year}_citizen_poll`;
  await navigator.credentials.create({
    publicKey: {
      challenge: challenge(),
      rp: { name: "Citizen Poll" },
      user: { id: new TextEncoder().encode(id), name, displayName: name },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "required",
        userVerification: "required",
      },
      attestation: "none",
    },
  });
}

/** The ID in the passkey the person picks, or null if it doesn't hold one. Throws if they cancel. */
export async function readBallotPasskey(): Promise<string | null> {
  const credential = (await navigator.credentials.get({
    publicKey: { challenge: challenge(), userVerification: "required" },
  })) as PublicKeyCredential | null;
  const handle = (credential?.response as AuthenticatorAssertionResponse | undefined)?.userHandle;
  return handle ? parseBallotId(new TextDecoder().decode(handle)) : null;
}
