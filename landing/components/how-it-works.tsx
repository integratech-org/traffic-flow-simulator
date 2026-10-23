import { Car, SlidersHorizontal, Timer } from "lucide-react"

const steps = [
  {
    icon: SlidersHorizontal,
    title: "Define the scenario",
    description:
      "Traffic light inputs, vehicle parameters, and scenario conditions.",
  },
  {
    icon: Car,
    title: "Simulate movement",
    description:
      "A two-dimensional cellular automata model updates vehicles over time.",
  },
  {
    icon: Timer,
    title: "Optimize timings",
    description: "Four-phase green times that minimize mean waiting time.",
  },
]

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="flex min-h-[calc(100dvh-4rem)] scroll-mt-16 items-center overflow-hidden bg-[#3b3b3b] text-primary-foreground"
    >
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
        <h2 className="text-center text-5xl uppercase [text-shadow:4px_4px_0_rgba(0,0,0,0.4)] md:text-6xl lg:text-7xl">
          HOW IT WORKS
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-lg lg:text-xl">
          Three simple steps from traffic data to better signal timing.
        </p>

        <ol className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1

            return (
              <li key={step.title} className="flex gap-4 md:flex-col md:gap-6">
                {/* TIMELINE */}
                <div className="flex flex-col items-center md:w-full md:flex-row md:gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card font-heading text-lg text-neutral-800">
                    {index + 1}
                  </span>

                  {!isLast && (
                    <span className="mt-2 w-0.5 flex-1 rounded-full bg-card md:mt-0 md:h-0.5 md:w-auto" />
                  )}
                </div>

                {/* CARD */}
                <div className="flex flex-1 flex-col rounded-2xl bg-card p-5 text-neutral-800 md:min-h-64">
                  <div className="flex items-center gap-3 md:flex-col md:items-start md:gap-6">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-neutral-600 text-card">
                      <step.icon className="size-6" />
                    </div>
                    <h3 className="text-xl uppercase md:text-2xl">
                      {step.title}
                    </h3>
                  </div>

                  <p className="mt-4 text-neutral-600">{step.description}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
