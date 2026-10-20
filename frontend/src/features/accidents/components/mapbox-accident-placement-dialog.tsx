import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, MapPin, Trash2 } from "lucide-react"
import { useSimStore } from "@/features/simulation/store"
import type { Accident } from "@/api/simulation"
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox"
import type { MapRef, LayerProps } from "react-map-gl/mapbox"
import "mapbox-gl/dist/mapbox-gl.css"
import { addAccident, deleteAccident } from "@/api/simulation"
import { useNetwork } from "@/features/map/hooks/use-network"
import { useRef } from "react"

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

interface MapboxAccidentPlacementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface TempAccident {
  lat: number
  lon: number
}

// Lane colors matching main map
const LANE_COLOR = { inbound: "#3388ff", outbound: "#888" } as const

export function MapboxAccidentPlacementDialog({
  open,
  onOpenChange,
}: MapboxAccidentPlacementDialogProps) {
  const mapRef = useRef<MapRef>(null)
  const addAccidentToStore = useSimStore((s) => s.addAccident)
  const removeAccidentFromStore = useSimStore((s) => s.removeAccident)
  const accidents = useSimStore((s) => s.accidents)
  const runId = useSimStore((s) => s.runId)
  const tick = useSimStore((s) => s.tick)
  const { laneById } = useNetwork()

  const [tempAccident, setTempAccident] = useState<TempAccident | null>(null)
  const [duration, setDuration] = useState("60")
  const [loading, setLoading] = useState(false)
  const [viewState, setViewState] = useState({
    longitude: 121.052105,
    latitude: 14.721306,
    zoom: 17,
  })

  // Create GeoJSON for lanes
  const lanesGeoJSON = {
    type: "FeatureCollection" as const,
    features: Object.values(laneById || {}).map((lane) => ({
      type: "Feature" as const,
      properties: {
        color: LANE_COLOR[lane.direction as "inbound" | "outbound"] || "#888",
      },
      geometry: {
        type: "LineString" as const,
        coordinates: lane.cellCoords,
      },
    })),
  }

  const laneLayerStyle: LayerProps = {
    id: "lanes-layer",
    type: "line",
    paint: {
      "line-color": ["get", "color"],
      "line-width": 3,
      "line-opacity": 0.6,
    },
  }

  const handleMapClick = (event: any) => {
    const { lng, lat } = event.lngLat
    setTempAccident({ lat, lon: lng })
  }

  const handleAddAccident = async () => {
    if (!tempAccident) return

    if (!runId || !tick) {
      alert("No active simulation run. Please start a simulation first.")
      return
    }

    setLoading(true)
    try {
      const durationNum = Number.parseInt(duration)
      if (Number.isNaN(durationNum) || durationNum <= 0) {
        alert("Duration must be a positive number")
        return
      }

      const newAccident: Accident = {
        id: `accident-${Date.now()}`,
        lat: tempAccident.lat,
        lon: tempAccident.lon,
        severity: "severe",
        duration_seconds: durationNum,
        created_at_tick: tick.tick,
      }

      await addAccident(runId, newAccident)
      addAccidentToStore(newAccident)
      setTempAccident(null)
      setDuration("60")
    } catch (error) {
      console.error("Failed to add accident:", error)
      alert("Failed to add accident")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccident = async (accidentId: string) => {
    if (!runId) {
      alert("No active simulation run")
      return
    }

    setLoading(true)
    try {
      await deleteAccident(runId, accidentId)
      removeAccidentFromStore(accidentId)
    } catch (error) {
      console.error("Failed to delete accident:", error)
      alert("Failed to delete accident")
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="flex h-[80vh] w-[90vw] flex-col">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Place Accident
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="flex flex-1 gap-4 overflow-hidden p-4">
          {/* Map */}
          <div className="relative flex-1 overflow-hidden rounded-lg border">
            <Map
              ref={mapRef}
              {...viewState}
              onMove={(evt) => setViewState(evt.viewState)}
              onClick={handleMapClick}
              mapboxAccessToken={MAPBOX_TOKEN}
              style={{ width: "100%", height: "100%" }}
              mapStyle="mapbox://styles/mapbox/dark-v11"
            >
              {/* Lanes Layer */}
              <Source id="lanes" type="geojson" data={lanesGeoJSON}>
                <Layer {...laneLayerStyle} />
              </Source>

              {/* Existing Accidents */}
              {accidents.map((accident) => (
                <Marker
                  key={accident.id}
                  longitude={accident.lon}
                  latitude={accident.lat}
                  anchor="center"
                >
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: "#ef4444",
                      border: "2px solid white",
                      boxShadow: "0 0 10px rgba(239, 68, 68, 0.5)",
                      cursor: "pointer",
                    }}
                    title={`Accident #${accident.id}`}
                  />
                </Marker>
              ))}

              {/* Temp Accident */}
              {tempAccident && (
                <Marker
                  longitude={tempAccident.lon}
                  latitude={tempAccident.lat}
                  anchor="center"
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: "#fbbf24",
                      border: "3px solid white",
                      boxShadow: "0 0 15px rgba(251, 191, 36, 0.7)",
                      animation: "pulse 1s infinite",
                    }}
                  />
                </Marker>
              )}
            </Map>

            {/* Instructions */}
            <div className="absolute top-4 left-4 rounded-lg bg-black/80 px-4 py-2 text-sm text-white">
              Click on the map to place an accident
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex w-80 flex-col gap-4">
            {/* Add Accident Form */}
            {tempAccident && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">New Accident</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Location</Label>
                    <p className="text-sm text-muted-foreground">
                      {tempAccident.lat.toFixed(6)},{" "}
                      {tempAccident.lon.toFixed(6)}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="duration">Duration (seconds)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      min="1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAddAccident}
                      disabled={loading}
                      className="flex-1"
                    >
                      Add Accident
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setTempAccident(null)}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Existing Accidents List */}
            <Card className="flex flex-1 flex-col overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base">
                  Active Accidents ({accidents.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-2 overflow-y-auto">
                {accidents.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No accidents placed
                  </p>
                ) : (
                  accidents.map((accident) => (
                    <div
                      key={accident.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          Accident #{accident.id}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {accident.lat.toFixed(6)}, {accident.lon.toFixed(6)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Duration: {accident.duration_seconds}s
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAccident(accident.id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}
