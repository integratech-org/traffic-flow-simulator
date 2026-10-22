import Image from "next/image"
import trafficLight from "@/assets/traffic-light.svg"

export function Cta() {
  return (
    <div className="relative w-full flex-1">
      <Image
        src={trafficLight}
        alt=""
        className="pointer-events-none absolute top-0 right-0 hidden w-[45%] max-w-3xl select-none md:block"
      />
    </div>
  )
}
