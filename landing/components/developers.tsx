import { TeamGridWithHoverEffects } from "./team-grid-with-hover-effects"

export function Developers() {
  return (
    <section
      id="developers"
      className="flex min-h-[calc(100dvh-4rem)] scroll-mt-16 items-center overflow-hidden"
    >
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <h2 className="text-5xl uppercase [text-shadow:4px_4px_0_rgba(0,0,0,0.4)] md:text-6xl lg:text-7xl">
          Developers
        </h2>

        <p className="mt-2 text-lg lg:text-xl">
          Meet the team behind the project
        </p>

        <TeamGridWithHoverEffects />
      </div>
    </section>
  )
}
