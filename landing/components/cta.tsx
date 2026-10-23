import Image from "next/image"

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
    </div>
  )
}
