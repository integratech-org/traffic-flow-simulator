import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSimStore } from "@/features/simulation/store"
import { TrafficCone, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { SignalStatus } from "@/api/simulation"

interface TrafficLightStatusPanelProps {
  open: boolean
  onClose: () => void
}

const SIGNAL_LABELS: Record<string, string> = {
  S1: "North",
  S2: "South",
  S3: "East",
  S4: "West",
}

const PHASE_COLORS: Record<string, string> = {
  red: "bg-red-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
}

const PHASE_TEXT_COLORS: Record<string, string> = {
  red: "text-red-900 dark:text-red-100",
  yellow: "text-yellow-900 dark:text-yellow-100",
  green: "text-green-900 dark:text-green-100",
}

const PHASE_BG_COLORS: Record<string, string> = {
  red: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800",
  yellow:
    "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800",
  green: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800",
}

function getVehicleInstruction(phase: string): string {
  return phase === "green" ? "Vehicles may proceed." : "Vehicles must stop."
}

function TrafficLightIndicator({ phase }: { phase: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={`size-3 rounded-full ${phase === "red" ? PHASE_COLORS.red : "bg-gray-300 dark:bg-gray-700"}`}
      />
      <div
        className={`size-3 rounded-full ${phase === "yellow" ? PHASE_COLORS.yellow : "bg-gray-300 dark:bg-gray-700"}`}
      />
      <div
        className={`size-3 rounded-full ${phase === "green" ? PHASE_COLORS.green : "bg-gray-300 dark:bg-gray-700"}`}
      />
    </div>
  )
}

function SignalRow({ signal }: { signal: SignalStatus }) {
  const label = SIGNAL_LABELS[signal.signal_id] || signal.signal_id
  const phaseUpper = signal.phase.toUpperCase()
  const instruction = getVehicleInstruction(signal.phase)

  return (
    <div
      className={`rounded-lg border p-3 ${PHASE_BG_COLORS[signal.phase] || "bg-muted"}`}
    >
      <div className="flex items-start gap-3">
        {/* Traffic Light Indicator */}
        <TrafficLightIndicator phase={signal.phase} />

        {/* Content */}
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Road {label} — {label}bound
            </h3>
            <span
              className={`text-xs font-bold ${PHASE_TEXT_COLORS[signal.phase]}`}
            >
              {phaseUpper}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span
              className={`font-mono font-semibold ${PHASE_TEXT_COLORS[signal.phase]}`}
            >
              {signal.seconds_remaining} seconds remaining
            </span>
          </div>

          <p className="text-xs text-muted-foreground">{instruction}</p>
        </div>
      </div>
    </div>
  )
}

export function TrafficLightStatusPanel({
  open,
  onClose,
}: TrafficLightStatusPanelProps) {
  const tick = useSimStore((s) => s.tick)
  const status = useSimStore((s) => s.status)

  if (!open) return null

  // Show placeholder when simulation is not running
  if (!tick || status === "idle") {
    return (
      <Card className="absolute top-20 right-4 z-[1000] w-[380px] shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between border-b px-5 py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrafficCone className="size-4 text-amber-600" />
            Live Traffic Signals
          </CardTitle>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-6 rounded-md hover:bg-muted"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <div className="rounded-full bg-muted p-4">
              <TrafficCone className="size-12 text-muted-foreground" />
            </div>
            <div className="space-y-2 text-center">
              <p className="font-medium text-muted-foreground">
                No Simulation Running
              </p>
              <p className="text-sm text-muted-foreground">
                Start the simulation to view live traffic signal status
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Sort signals by ID to maintain consistent order (S1, S2, S3, S4)
  const sortedSignals = [...tick.signals].sort((a, b) =>
    a.signal_id.localeCompare(b.signal_id)
  )

  return (
    <Card className="absolute top-20 right-4 z-[1000] w-[380px] shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between border-b px-5 py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrafficCone className="size-4 text-amber-600" />
          Live Traffic Signals
        </CardTitle>
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-6 rounded-md hover:bg-muted"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {sortedSignals.map((signal) => (
          <SignalRow key={signal.signal_id} signal={signal} />
        ))}

        <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs dark:border-blue-800 dark:bg-blue-950">
          <p className="font-medium text-blue-900 dark:text-blue-100">
            ℹ️ Real-Time Signal Logic
          </p>
          <p className="mt-1 text-blue-800 dark:text-blue-200">
            Colors and timers are connected to the simulation logic. Vehicle
            movement behavior updates based on these signals.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
