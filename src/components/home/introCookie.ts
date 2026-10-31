/** Set once a phone has played MobileIntro. A cookie rather than localStorage
 *  so the server can leave the overlay out, and returning visitors never see
 *  it flash before the page's scripts load. */
export const INTRO_SEEN_COOKIE = "cp_intro_seen";
