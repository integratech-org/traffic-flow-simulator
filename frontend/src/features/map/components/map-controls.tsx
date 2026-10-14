import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Search,
  Lightbulb,
  Car,
  Settings2,
  ChartPie,
  Square,
} from "lucide-react"

interface MapControlsProps {
  onRunSimulation?: () => void
  onStop?: () => void
  runStatus?: "idle" | "created" | "running" | "paused"
  onReset?: () => void
  onTrafficLightClick?: () => void
  onVehicleClick?: () => void
  onSettingsClick?: () => void
  isTrafficLightActive?: boolean
  isVehicleActive?: boolean
  isSettingsActive?: boolean
  isMetricsActive?: boolean
  isSidebarOpen?: boolean
}

export function MapControls({
  onRunSimulation,
  onStop,
  runStatus = "idle",
  onReset,
  onTrafficLightClick,
  onVehicleClick,
  onSettingsClick,
  isTrafficLightActive,
  isVehicleActive,
  isSettingsActive,
  isMetricsActive,
  isSidebarOpen,
}: MapControlsProps) {
  return (
    <>
      {/* Search Input - Top Left */}
      <div
        className={`absolute top-4 z-[1000] transition-all duration-300 ${isSidebarOpen ? "left-[400px]" : "left-4"}`}
      >
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search Location"
            className="h-12 w-64 rounded-full border-border bg-background pr-4 pl-10 text-sm"
          />
        </div>
      </div>

      {/* Control Buttons - Top Right */}
      <div
        className="absolute top-4 right-4 z-[1000]"
        id="control-buttons-container"
      >
        <div className="flex items-center gap-2 rounded-full border border-border bg-background p-2 shadow-lg">
          <Button
            variant="ghost"
            size="icon"
            className={`size-10 rounded-full ${isTrafficLightActive ? "bg-[#0D1628] text-white hover:bg-[#0D1628] hover:text-white" : "hover:bg-muted"}`}
            title="Traffic Lights"
            onClick={onTrafficLightClick}
          >
            <Lightbulb className="size-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={`size-10 rounded-full ${isVehicleActive ? "bg-[#0D1628] text-white hover:bg-[#0D1628] hover:text-white" : "hover:bg-muted"}`}
            title="Vehicles"
            onClick={onVehicleClick}
          >
            <Car className="size-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={`size-10 rounded-full ${isSettingsActive ? "bg-[#0D1628] text-white hover:bg-[#0D1628] hover:text-white" : "hover:bg-muted"}`}
            title="Settings"
            onClick={onSettingsClick}
          >
            <Settings2 className="size-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={`size-10 rounded-full ${isMetricsActive ? "bg-[#0D1628] text-white hover:bg-[#0D1628] hover:text-white" : "hover:bg-muted"}`}
            title="Metrics"
            onClick={onReset}
          >
            <ChartPie className="size-5" />
          </Button>

          <Separator orientation="vertical" className="mx-1 h-8" />

          {runStatus !== "idle" && (
            <Button
              variant="ghost"
              size="icon"
              className="size-10 rounded-full hover:bg-muted"
              title="Stop and reset"
              onClick={onStop}
            >
              <Square className="size-5" />
            </Button>
          )}

          <Button
            variant="default"
            className="h-10 rounded-full bg-[#0D1628] px-6 text-sm font-medium text-white hover:bg-[#0D1628]/90"
            onClick={onRunSimulation}
          >
            {runStatus === "running"
              ? "Pause"
              : runStatus === "paused"
                ? "Resume"
                : "Run Simulation"}
          </Button>
        </div>
      </div>
    </>
  )
}
