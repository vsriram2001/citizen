import Image from "next/image";

/*
  Hero image.

  Source is /public/hero.jpg — converted from the supplied ryan.png
  (941x1671), uncropped, no burned-in captions.

  object-cover is safe because the parent panel (in page.tsx) is sized with
  aspect-[941/1671] — hero.jpg's exact pixel ratio, confirmed via `sips`, not
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
        className="object-cover"
      />
    </div>
  );
}
