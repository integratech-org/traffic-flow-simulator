import { useNetwork } from "@/features/map/hooks/use-network"
import { MapContainer as LeafletMap, Polyline, TileLayer } from "react-leaflet"
import { MapControls } from "./map-controls"
import { ZoomControls } from "./zoom-controls"
import { MapLegend } from "@/features/analytics/components/legend"
import { MetricsSidebar } from "@/features/analytics/components/metrics-sidebar"
import { TrafficLightDialog } from "@/features/traffic-lights/components/traffic-light-dialog"
import { VehicleConfigDialog } from "@/features/vehicles/components/vehicle-config-dialog"
import { ScenarioSettingsDialog } from "@/features/settings/components/scenario-settings-dialog"
import { DirectionMarkers } from "./direction-markers"
import { useState } from "react"

function MapContainer() {
  const { lanes, errors } = useNetwork()
  const [isSimulating, setIsSimulating] = useState(false)
  const [isTrafficLightDialogOpen, setIsTrafficLightDialogOpen] =
    useState(false)
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false)
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false)
  const [isMetricsSidebarOpen, setIsMetricsSidebarOpen] = useState(false)
  const [activeDirection, setActiveDirection] = useState<
    "north" | "south" | "east" | "west"
  >("north")

  const handleRunSimulation = () => {
    setIsSimulating(!isSimulating)
    console.log("Simulation toggled:", !isSimulating)
    // TODO: Start/stop simulation logic
  }

  const handleReset = () => {
    setIsSimulating(false)
    setIsMetricsSidebarOpen(!isMetricsSidebarOpen)
    console.log("Metrics sidebar toggled:", !isMetricsSidebarOpen)
  }

  const handleTrafficLightClick = () => {
    setIsTrafficLightDialogOpen(true)
    setIsVehicleDialogOpen(false)
    setIsSettingsDialogOpen(false)
  }

  const handleVehicleClick = () => {
    setIsVehicleDialogOpen(true)
    setIsTrafficLightDialogOpen(false)
    setIsSettingsDialogOpen(false)
  }

  const handleSettingsClick = () => {
    setIsSettingsDialogOpen(true)
    setIsTrafficLightDialogOpen(false)
    setIsVehicleDialogOpen(false)
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
        onRunSimulation={handleRunSimulation}
        onReset={handleReset}
        onTrafficLightClick={handleTrafficLightClick}
        onVehicleClick={handleVehicleClick}
        onSettingsClick={handleSettingsClick}
        isTrafficLightActive={isTrafficLightDialogOpen}
        isVehicleActive={isVehicleDialogOpen}
        isSettingsActive={isSettingsDialogOpen}
        isMetricsActive={isMetricsSidebarOpen}
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
      />

      {/* Map Container */}
      <LeafletMap
        className="h-full w-full"
        center={junctionCenter}
        zoom={17}
        zoomControl={false} // Disable default zoom controls
      >
        <TileLayer
          attribution='&copy; <a href="https://stadiamaps.com/attribution/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
        />

        {lanes?.map((lane) => (
          <Polyline
            key={`${lane.legId}_${lane.direction}_${lane.laneIndex}`}
            positions={lane.cellCoords.map(([lng, lat]) => [lat, lng])}
            pathOptions={{
              color: lane.direction === "inbound" ? "#3388ff" : "#888",
              weight: 3,
            }}
          />
        ))}

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
      <MapLegend />
    </div>
  )
}

export default MapContainer
