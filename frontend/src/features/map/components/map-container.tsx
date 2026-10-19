import { useNetwork } from "@/features/map/hooks/use-network"
import { MapContainer as LeafletMap, TileLayer } from "react-leaflet"
import { MapControls } from "./map-controls"
import { ZoomControls } from "./zoom-controls"
import { MetricsSidebar } from "@/features/analytics/components/metrics-sidebar"
import { TrafficLightDialog } from "@/features/traffic-lights/components/traffic-light-dialog"
import { TrafficLightStatusPanel } from "@/features/traffic-lights/components/traffic-light-status-panel"
import { VehicleConfigDialog } from "@/features/vehicles/components/vehicle-config-dialog"
import { ScenarioSettingsDialog } from "@/features/settings/components/scenario-settings-dialog"
import { AccidentPlacementDialog } from "@/features/accidents/components/accident-placement-dialog"
import { DirectionMarkers } from "./direction-markers"
import { useState } from "react"
import { SimulationLayers } from "@/features/simulation/components/simulation-layers"
import { useSimulationControls } from "@/features/simulation/hooks/use-simulation-controls"
import { useTickStream } from "@/features/simulation/hooks/use-tick-stream"

function MapContainer() {
  const { laneById, errors } = useNetwork()
  const { status, toggle, reset } = useSimulationControls()
  useTickStream() // pass "car" | "motorcycle" to filter by vehicle type
  const [isTrafficLightDialogOpen, setIsTrafficLightDialogOpen] =
    useState(false)
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false)
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false)
  const [isAccidentDialogOpen, setIsAccidentDialogOpen] = useState(false)
  const [isMetricsSidebarOpen, setIsMetricsSidebarOpen] = useState(false)
  const [isSignalStatusOpen, setIsSignalStatusOpen] = useState(false)
  const [activeDirection, setActiveDirection] = useState<
    "north" | "south" | "east" | "west"
  >("north")

  const handleMetricsToggle = () => setIsMetricsSidebarOpen((open) => !open)

  const handleTrafficLightClick = () => {
    setIsTrafficLightDialogOpen(true)
    setIsVehicleDialogOpen(false)
    setIsSettingsDialogOpen(false)
    setIsSignalStatusOpen(false)
  }

  const handleVehicleClick = () => {
    setIsVehicleDialogOpen(true)
    setIsTrafficLightDialogOpen(false)
    setIsSettingsDialogOpen(false)
    setIsSignalStatusOpen(false)
  }

  const handleSettingsClick = () => {
    setIsSettingsDialogOpen(true)
    setIsTrafficLightDialogOpen(false)
    setIsVehicleDialogOpen(false)
    setIsSignalStatusOpen(false)
  }

  const handleAddAccidentFromSettings = () => {
    console.log("Add Accident clicked - opening dialog")
    setIsAccidentDialogOpen(true)
    // Keep settings dialog open so user can return to it
  }

  const handleSignalStatusClick = () => {
    setIsSignalStatusOpen((open) => !open)
    // Close other dialogs
    if (!isSignalStatusOpen) {
      setIsTrafficLightDialogOpen(false)
      setIsVehicleDialogOpen(false)
      setIsSettingsDialogOpen(false)
    }
  }

  if (errors) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          <p className="font-medium">Failed to load network</p>
          <p className="mt-1 text-sm">{errors}</p>
        </div>
      </div>
    )
  }

  const junctionCenter: [number, number] = [14.721306, 121.052105]

  return (
    <div className="relative h-full w-full">
      {/* Metrics Sidebar */}
      <MetricsSidebar
        open={isMetricsSidebarOpen}
        onClose={() => setIsMetricsSidebarOpen(false)}
      />

      {/* Top Controls */}
      <MapControls
        onRunSimulation={toggle}
        onStop={reset}
        runStatus={status}
        onReset={handleMetricsToggle}
        onTrafficLightClick={handleTrafficLightClick}
        onVehicleClick={handleVehicleClick}
        onSettingsClick={handleSettingsClick}
        onSignalStatusClick={handleSignalStatusClick}
        isTrafficLightActive={isTrafficLightDialogOpen}
        isVehicleActive={isVehicleDialogOpen}
        isSettingsActive={isSettingsDialogOpen}
        isMetricsActive={isMetricsSidebarOpen}
        isSignalStatusActive={isSignalStatusOpen}
        isSidebarOpen={isMetricsSidebarOpen}
      />

      {/* Traffic Light Configuration Dialog */}
      <TrafficLightDialog
        open={isTrafficLightDialogOpen}
        onOpenChange={setIsTrafficLightDialogOpen}
        activeDirection={activeDirection}
        onDirectionChange={setActiveDirection}
      />

      {/* Vehicle Configuration Dialog */}
      <VehicleConfigDialog
        open={isVehicleDialogOpen}
        onOpenChange={setIsVehicleDialogOpen}
      />

      {/* Settings Dialog */}
      <ScenarioSettingsDialog
        open={isSettingsDialogOpen}
        onOpenChange={setIsSettingsDialogOpen}
        onAddAccidentClick={handleAddAccidentFromSettings}
      />

      {/* Accident Placement Dialog */}
      <AccidentPlacementDialog
        open={isAccidentDialogOpen}
        onOpenChange={setIsAccidentDialogOpen}
      />

      {/* Traffic Light Status Panel */}
      <TrafficLightStatusPanel
        open={isSignalStatusOpen}
        onClose={() => setIsSignalStatusOpen(false)}
      />

      {/* Map Container */}
      <LeafletMap
        className="h-full w-full"
        center={junctionCenter}
        zoom={17}
        zoomControl={false} // Disable default zoom controls
        preferCanvas // ~250 vehicle markers updating 10x/sec: canvas, not SVG
      >
        <TileLayer
          attribution='&copy; <a href="https://stadiamaps.com/attribution/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
        />

        {laneById && <SimulationLayers laneById={laneById} />}

        {/* Direction Markers - Only visible when traffic light dialog is open */}
        {isTrafficLightDialogOpen && (
          <DirectionMarkers
            center={junctionCenter}
            activeDirection={activeDirection}
            onDirectionChange={setActiveDirection}
          />
        )}

        {/* Custom Zoom Controls (inside map) */}
        <ZoomControls isSidebarOpen={isMetricsSidebarOpen} />
      </LeafletMap>

      {/* Legend (outside map) */}
      {/* Moved to ZoomControls as a popover */}
    </div>
  )
}

export default MapContainer
