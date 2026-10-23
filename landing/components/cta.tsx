import Image from "next/image"
import { Button } from "./ui/button"

export function Cta() {
  return (
    <div className="relative w-full flex-1">
      <Image
        src="/illustrations/traffic-light.svg"
        alt=""
        width={2148}
        height={792}
        className="pointer-events-none absolute top-0 right-0 hidden w-[45%] max-w-3xl select-none md:block"
      />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-16 md:px-6 md:pt-24">
        <div className="max-w-xl text-center md:text-left">
          <h2 className="text-5xl text-primary uppercase md:text-6xl lg:text-7xl">
            See the signals in action
          </h2>

          <p className="mt-4 max-w-md text-lg text-[#141b2d] lg:text-xl">
            Run the simulation and watch how optimized signal timing changes
            traffic flow at the crossing.
          </p>

          <Button size="lg" className="mt-8 h-14 rounded-full px-10 text-lg">
            Try the Simulation
          </Button>
        </div>
      </div>
    </div>
  )
}
