import Road from "@/assets/road.svg"
import Image from "next/image"

export function Hero() {
  return (
    <section
      id="hero"
      className="relative flex min-h-[calc(100dvh-4rem)] items-center overflow-hidden"
    >
      <Image
        src={Road}
        alt=""
        priority
        className="pointer-events-none absolute right-0 bottom-0 hidden h-full w-auto max-w-none select-none md:block"
      />

      <div className="relative mx-auto max-w-7xl p-4 md:p-6">
        <div className="flex max-w-xl flex-col items-center text-center lg:max-w-3xl">
          <h2 className="text-[8rem] leading-none [text-shadow:8px_8px_0_#b8b3b0] md:text-[12rem] lg:text-[16rem] lg:[text-shadow:12px_12px_0_#b8b3b0]">
            TALA
          </h2>

          <h3 className="text-2xl md:text-3xl lg:text-5xl">
            <span className="text-green-500">T</span>RAFFIC{" "}
            <span className="text-yellow-400">A</span>NALYSIS and{" "}
            <span className="text-red-500">L</span>IGHT{" "}
            <span className="text-yellow-400">A</span>LLOCATION
          </h3>

          <p className="mt-3 max-w-md text-base lg:max-w-xl lg:text-xl">
            A Cellular Automata-Based Traffic Simulation and Signal Timing
            Optimization System in Mindanao Avenue and Commonwealth Avenue
            crossing
          </p>
        </div>
      </div>
    </section>
  )
}
