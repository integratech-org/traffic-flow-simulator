import Image from "next/image"
import { Cta } from "./cta"
import { Footer } from "./footer"

export function CtaFooter() {
  return (
    <section
      id="Cta"
      className="relative isolate flex min-h-dvh flex-col items-center overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[60%] select-none">
        <Image
          src="/illustrations/road-landscape.svg"
          alt=""
          fill
          className="object-cover object-bottom"
        />

        {/* GRADIENT: sakop lang ang wrapper ng image */}
        <div className="absolute inset-0 bg-linear-to-b from-transparent to-black/70" />
      </div>

      <Cta />
      <Footer />
    </section>
  )
}
