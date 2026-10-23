import Image from "next/image"
import { Cta } from "./cta"
import { Footer } from "./footer"

export function CtaFooter() {
  return (
    <section
      id="Cta"
      className="relative flex min-h-dvh flex-col items-center overflow-hidden"
    >
      <Image
        src="/illustrations/road-landscape.svg"
        alt=""
        width={4320}
        height={1266}
        className="pointer-events-none absolute inset-x-0 bottom-0 w-full select-none"
      />

      <div className="pointer-events-none absolute inset-0 z-10 bg-linear-to-b from-transparent to-black/70" />

      <Cta />
      <Footer />
    </section>
  )
}
