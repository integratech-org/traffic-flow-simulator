import { useNetwork } from "@/hooks/use-network"
import { MapContainer, Polyline, TileLayer } from "react-leaflet"

function Map() {
  const { lanes, errors } = useNetwork()

  if (errors) return <div>Failed to load network: {errors}</div>

  return (
    <MapContainer
      className="h-full w-full"
      center={[14.721306, 121.052105]}
      zoom={17}
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
    </MapContainer>
  )
}

export default Map
