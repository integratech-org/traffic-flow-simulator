import { useRef, useCallback, useState } from "react"
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox"
import type {
  MapRef,
  LayerProps,
  ViewStateChangeEvent,
} from "react-map-gl/mapbox"
import "mapbox-gl/dist/mapbox-gl.css"
import { useNetwork } from "@/features/map/hooks/use-network"
import { MapControls } from "./map-controls"
import { MapSearch } from "./map-search"
import { MetricsSidebar } from "@/features/analytics/components/metrics-sidebar"
import { TrafficLightDialog } from "@/features/traffic-lights/components/traffic-light-dialog"
import { TrafficLightStatusPanel } from "@/features/traffic-lights/components/traffic-light-status-panel"
import { VehicleConfigDialog } from "@/features/vehicles/components/vehicle-config-dialog"
import { ScenarioSettingsDialog } from "@/features/settings/components/scenario-settings-dialog"
// import { AccidentPlacementDialog } from "@/features/accidents/components/accident-placement-dialog"
import { MapboxAccidentPlacementDialog } from "@/features/accidents/components/mapbox-accident-placement-dialog"
import { useSimulationControls } from "@/features/simulation/hooks/use-simulation-controls"
import { useTickStream } from "@/features/simulation/hooks/use-tick-stream"
import { useSimStore } from "@/features/simulation/store"
// import { TrafficLightMarker } from "@/features/simulation/components/traffic-light-marker"
import { MapLegend } from "@/features/analytics/components/legend"
import { Info } from "lucide-react"
import type { CongestionLevel, Phase } from "@/api/simulation"

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

const LEVEL_COLOR: Record<CongestionLevel, string> = {
  light: "#22c55e",
  moderate: "#f97316",
  heavy: "#ef4444",
}

const IDLE_COLOR = { inbound: "#3388ff", outbound: "#888" } as const

// Helper function to create traffic light HTML
function createTrafficLightHTML(
  phase: Phase,
  directionLabel?: string,
  directionColor?: string
): string {
  const isRedActive = phase === "red"
  const isYellowActive = phase === "yellow"
  const isGreenActive = phase === "green"

  return `
    <div class="traffic-light-container" style="
      display: flex;
      flex-direction: column;
      align-items: center;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
    ">
      ${
        directionColor
          ? `
      <div style="
        position: absolute;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: ${directionColor};
        opacity: 0.3;
        top: 24px;
        z-index: -1;
        box-shadow: 0 0 12px ${directionColor};
      "></div>
      `
          : ""
      }
      
      <div style="
        background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
        border: 2px solid #404040;
        border-radius: 8px;
        padding: 6px;
        box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.1), 0 4px 8px rgba(0, 0, 0, 0.4);
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 32px;
      ">
        <div style="
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${
            isRedActive
              ? "radial-gradient(circle at 30% 30%, #ff4444, #cc0000)"
              : "radial-gradient(circle at 30% 30%, #4a0000, #2a0000)"
          };
          border: 1px solid ${isRedActive ? "#ff6666" : "#3a0000"};
          box-shadow: ${
            isRedActive
              ? "0 0 10px #ff0000, 0 0 20px #ff000080"
              : "inset 0 2px 4px rgba(0,0,0,0.5)"
          };
          opacity: ${isRedActive ? "1" : "0.3"};
        "></div>
        <div style="
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${
            isYellowActive
              ? "radial-gradient(circle at 30% 30%, #ffff44, #ffcc00)"
              : "radial-gradient(circle at 30% 30%, #4a4a00, #2a2a00)"
          };
          border: 1px solid ${isYellowActive ? "#ffff66" : "#3a3a00"};
          box-shadow: ${
            isYellowActive
              ? "0 0 10px #ffff00, 0 0 20px #ffff0080"
              : "inset 0 2px 4px rgba(0,0,0,0.5)"
          };
          opacity: ${isYellowActive ? "1" : "0.3"};
        "></div>
        <div style="
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${
            isGreenActive
              ? "radial-gradient(circle at 30% 30%, #44ff44, #00cc00)"
              : "radial-gradient(circle at 30% 30%, #004a00, #002a00)"
          };
          border: 1px solid ${isGreenActive ? "#66ff66" : "#003a00"};
          box-shadow: ${
            isGreenActive
              ? "0 0 10px #00ff00, 0 0 20px #00ff0080"
              : "inset 0 2px 4px rgba(0,0,0,0.5)"
          };
          opacity: ${isGreenActive ? "1" : "0.3"};
        "></div>
      </div>
      <div style="width: 4px; height: 16px; background: linear-gradient(90deg, #555 0%, #333 50%, #555 100%); border-radius: 2px;"></div>
      <div style="width: 12px; height: 4px; background: linear-gradient(135deg, #444 0%, #222 100%); border-radius: 2px;"></div>
      ${
        directionLabel
          ? `
      <div style="
        margin-top: 4px;
        background: ${directionColor || "rgba(0, 0, 0, 0.8)"};
        color: white;
        padding: 3px 10px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: bold;
        font-family: system-ui, -apple-system, sans-serif;
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
        text-align: center;
        white-space: nowrap;
      ">${directionLabel}</div>
      `
          : ""
      }
    </div>
  `
}

// Convert lane segments to GeoJSON
function createRoadsGeoJSON(
  laneById: Record<string, any>,
  segmentsByLane: Map<string, any[]>
) {
  const features: any[] = []

  for (const [laneId, lane] of Object.entries(laneById)) {
    if (lane.laneIndex !== 0) continue // Only center lanes

    const segments = segmentsByLane.get(laneId) || []

    if (segments.length === 0) {
      // Full lane with idle color
      features.push({
        type: "Feature",
        properties: {
          color: IDLE_COLOR[lane.direction as "inbound" | "outbound"] ?? "#888",
          laneId: laneId,
        },
        geometry: {
          type: "LineString",
          coordinates: lane.cellCoords.map(([lng, lat]: number[]) => [
            lng,
            lat,
          ]),
        },
      })
    } else {
      // Each segment with its own color
      for (const segment of segments) {
        const segmentCoords = lane.cellCoords.slice(
          segment.start_cell,
          segment.end_cell + 1
        )
        if (segmentCoords.length < 2) continue

        features.push({
          type: "Feature",
          properties: {
            color: LEVEL_COLOR[segment.level as CongestionLevel],
            laneId: laneId,
            segment: `${segment.start_cell}-${segment.end_cell}`,
          },
          geometry: {
            type: "LineString",
            coordinates: segmentCoords.map(([lng, lat]: number[]) => [
              lng,
              lat,
            ]),
          },
        })
      }
    }
  }

  return {
    type: "FeatureCollection" as const,
    features,
  }
}

// Road layer style
const roadLayerStyle: LayerProps = {
  id: "roads-layer",
  type: "line",
  paint: {
    "line-color": ["get", "color"],
    "line-width": 4,
    "line-opacity": 0.9,
  },
}

function MapboxContainer() {
  const mapRef = useRef<MapRef>(null)
  const { laneById, errors } = useNetwork()
  const { status, toggle, reset } = useSimulationControls()
  useTickStream()
  const tick = useSimStore((s) => s.tick)
  const accidents = useSimStore((s) => s.accidents)

  const [viewState, setViewState] = useState({
    longitude: 121.052105,
    latitude: 14.721306,
    zoom: 17,
    pitch: 60, // 3D tilt
    bearing: 0,
  })

  const [isTrafficLightDialogOpen, setIsTrafficLightDialogOpen] =
    useState(false)
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false)
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false)
  const [isAccidentDialogOpen, setIsAccidentDialogOpen] = useState(false)
  const [isMetricsSidebarOpen, setIsMetricsSidebarOpen] = useState(false)
  const [isSignalStatusOpen, setIsSignalStatusOpen] = useState(false)
  const [showLegend, setShowLegend] = useState(false)
  const [activeDirection, setActiveDirection] = useState<
    "mindanao_ne" | "commonwealth_sw" | "mindanao_sw" | "commonwealth_ne"
  >("mindanao_ne")

  // Build segment map
  const segmentsByLane = new globalThis.Map<string, any[]>()
  if (tick?.segments) {
    for (const segment of tick.segments) {
      if (!segmentsByLane.has(segment.lane_id)) {
        segmentsByLane.set(segment.lane_id, [])
      }
      segmentsByLane.get(segment.lane_id)!.push(segment)
    }
  }

  // Create roads GeoJSON
  const roadsGeoJSON = laneById
    ? createRoadsGeoJSON(laneById, segmentsByLane)
    : { type: "FeatureCollection" as const, features: [] }

  // Traffic light positions
  const directionPositions = {
    mindanao_ne: {
      position: [121.052105, 14.721306 + 0.0008] as [number, number],
      label: "Mindanao NE",
      color: "#3b82f6",
    },
    commonwealth_ne: {
      position: [121.052105 + 0.0008, 14.721306] as [number, number],
      label: "Commonwealth NE",
      color: "#f59e0b",
    },
    mindanao_sw: {
      position: [121.052105, 14.721306 - 0.0012] as [number, number],
      label: "Mindanao SW",
      color: "#ef4444",
    },
    commonwealth_sw: {
      position: [121.052105 - 0.0008, 14.721306] as [number, number],
      label: "Commonwealth SW",
      color: "#10b981",
    },
  }

  // Add 3D buildings on map load
  const onMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map) return

    // Wait for style to load
    if (!map.isStyleLoaded()) {
      map.once("style.load", () => addBuildingsLayer(map))
    } else {
      addBuildingsLayer(map)
    }
  }, [])

  const addBuildingsLayer = (map: any) => {
    // Check if layer already exists
    if (map.getLayer("3d-buildings")) return

    map.addLayer({
      id: "3d-buildings",
      source: "composite",
      "source-layer": "building",
      filter: ["==", "extrude", "true"],
      type: "fill-extrusion",
      minzoom: 15,
      paint: {
        "fill-extrusion-color": "#aaa",
        "fill-extrusion-height": [
          "interpolate",
          ["linear"],
          ["zoom"],
          15,
          0,
          15.05,
          ["get", "height"],
        ],
        "fill-extrusion-base": [
          "interpolate",
          ["linear"],
          ["zoom"],
          15,
          0,
          15.05,
          ["get", "min_height"],
        ],
        "fill-extrusion-opacity": 0.6,
      },
    })
  }

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
    setIsAccidentDialogOpen(true)
    setIsSettingsDialogOpen(false) // Close settings dialog
  }

  const handleSignalStatusClick = () => {
    setIsSignalStatusOpen((open) => !open)
    if (!isSignalStatusOpen) {
      setIsTrafficLightDialogOpen(false)
      setIsVehicleDialogOpen(false)
      setIsSettingsDialogOpen(false)
    }
  }

  const handleLocationSelect = (
    lon: number,
    lat: number,
    _placeName: string
  ) => {
    mapRef.current?.flyTo({
      center: [lon, lat],
      zoom: 17,
      duration: 2000,
    })
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

      {/* Search Box */}
      <MapSearch
        onLocationSelect={handleLocationSelect}
        isSidebarOpen={isMetricsSidebarOpen}
      />

      {/* Dialogs */}
      <TrafficLightDialog
        open={isTrafficLightDialogOpen}
        onOpenChange={setIsTrafficLightDialogOpen}
        activeDirection={activeDirection}
        onDirectionChange={setActiveDirection}
      />
      <VehicleConfigDialog
        open={isVehicleDialogOpen}
        onOpenChange={setIsVehicleDialogOpen}
      />
      <ScenarioSettingsDialog
        open={isSettingsDialogOpen}
        onOpenChange={setIsSettingsDialogOpen}
        onAddAccidentClick={handleAddAccidentFromSettings}
      />
      <MapboxAccidentPlacementDialog
        open={isAccidentDialogOpen}
        onOpenChange={setIsAccidentDialogOpen}
      />
      <TrafficLightStatusPanel
        open={isSignalStatusOpen}
        onClose={() => setIsSignalStatusOpen(false)}
      />

      {/* Mapbox Map */}
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt: ViewStateChangeEvent) => setViewState(evt.viewState)}
        onLoad={onMapLoad}
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        attributionControl={false}
      >
        {/* Roads Layer */}
        <Source id="roads" type="geojson" data={roadsGeoJSON}>
          <Layer {...roadLayerStyle} />
        </Source>

        {/* Traffic Light Markers */}
        {tick?.signals.map((sig) => {
          const directionData =
            directionPositions[sig.leg_id as keyof typeof directionPositions]
          if (!directionData) return null

          return (
            <Marker
              key={`traffic-light-${sig.signal_id}`}
              longitude={directionData.position[0]}
              latitude={directionData.position[1]}
              anchor="bottom"
            >
              <div
                style={{ cursor: "pointer" }}
                dangerouslySetInnerHTML={{
                  __html: createTrafficLightHTML(
                    sig.phase,
                    directionData.label,
                    directionData.color
                  ),
                }}
              />
            </Marker>
          )
        })}

        {/* Direction Markers - Show when simulation not running */}
        {!tick &&
          Object.entries(directionPositions).map(([key, data]) => (
            <Marker
              key={`direction-${key}`}
              longitude={data.position[0]}
              latitude={data.position[1]}
              anchor="center"
            >
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: data.color,
                  border: "2px solid white",
                  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: "bold",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                {data.label.split(" ")[1]}
              </div>
            </Marker>
          ))}

        {/* Small traffic light dots at stop lines - synced with signal phase */}
        {tick?.signals.map((sig) => {
          // Find stop line position (last cell of inbound lane for this leg)
          const lane = Object.values(laneById || {}).find(
            (l) =>
              l.legId === sig.leg_id &&
              l.direction === "inbound" &&
              l.laneIndex === 0
          )
          if (!lane || !lane.cellCoords.length) return null

          const stopLineCoord = lane.cellCoords[lane.cellCoords.length - 1]
          const phaseColor =
            sig.phase === "green"
              ? "#22c55e"
              : sig.phase === "yellow"
                ? "#eab308"
                : "#ef4444"

          return (
            <Marker
              key={`stopline-${sig.signal_id}`}
              longitude={stopLineCoord[0]}
              latitude={stopLineCoord[1]}
              anchor="center"
            >
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  background: phaseColor,
                  boxShadow: `0 0 8px ${phaseColor}, 0 2px 4px rgba(0,0,0,0.3)`,
                  opacity: 0.9,
                }}
              />
            </Marker>
          )
        })}

        {/* Accident Markers */}
        {accidents.map((accident) => {
          if (
            tick &&
            tick.tick >= accident.created_at_tick + accident.duration_seconds
          ) {
            return null
          }

          return (
            <Marker
              key={accident.id}
              longitude={accident.lon}
              latitude={accident.lat}
            >
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  backgroundColor: "#ef4444",
                  borderRadius: "50%",
                  border: "2px solid white",
                }}
              />
            </Marker>
          )
        })}
      </Map>

      {/* Legend Button - Bottom Left (above Mapbox logo) */}
      <div
        className={`absolute bottom-12 z-1000 transition-all duration-300 ${isMetricsSidebarOpen ? "left-[400px]" : "left-4"}`}
      >
        {showLegend && (
          <div className="mb-2">
            <MapLegend />
          </div>
        )}

        <button
          onClick={() => setShowLegend(!showLegend)}
          className={`flex size-10 items-center justify-center rounded-md shadow-lg transition-colors ${
            showLegend
              ? "bg-[#0D1628] text-white hover:bg-[#0D1628]/90"
              : "bg-white hover:bg-gray-50"
          }`}
          title="Toggle Road Indicator"
        >
          <Info className="size-5" />
        </button>
      </div>
    </div>
  )
}

export default MapboxContainer
