import Image from "next/image"
import { Cta } from "./cta"
import { Footer } from "./footer"
import roadLandscape from "@/assets/road-landscape.svg"

export function CtaFooter() {
  return (
    <section
      id="Cta"
      className="relative flex min-h-dvh flex-col items-center overflow-hidden"
    >
      <Image
        src={roadLandscape}
        alt=""
        className="pointer-events-none absolute inset-x-0 bottom-0 w-full select-none"
      />

      <div className="pointer-events-none absolute inset-0 z-10 bg-linear-to-b from-transparent to-black/70" />

      <Cta />
      <Footer />
    </section>
  )
}
