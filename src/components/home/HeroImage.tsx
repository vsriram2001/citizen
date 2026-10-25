import Image from "next/image";

/*
  Hero image.

  Source is /public/hero.jpg — cropped from the supplied docs/assets/hero-source.png (941x1671)
  to a head-and-shoulders framing (941x1106) at the user's request, no
  burned-in captions.

  object-cover is safe because the parent panel (in page.tsx) is sized with
  aspect-[941/1106] — hero.jpg's exact pixel ratio, confirmed via `sips`, not
  an approximated class. Box and photo share the same ratio, so cover has
  nothing to crop.

  Rights caveat worth keeping visible: this is a frame from The Notebook (New
  Line Cinema). Fine as a placeholder while designing; a real exposure once
  the site is public, on a product whose value is being hard to dismiss.
*/
export function HeroImage() {
  return (
    <div className="relative w-full h-full bg-ink overflow-hidden">
      <Image
        src="/hero.jpg"
        alt="A man leaning against a car, mid-gesture, asking what you want"
        fill
        priority
        quality={90}
        sizes="(max-width: 1024px) 100vw, 52vw"
        // On a phone the band is wider than the photo, so cover crops top and
        // bottom; bias it up to keep the face. (Desktop matches the ratio,
        // so nothing is cropped there.)
        className="object-cover object-[50%_28%]"
      />
    </div>
  );
}
