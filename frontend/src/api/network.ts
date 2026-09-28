import { fetchJson } from "./client"

export interface Lane {
  legId: string
  direction: string
  laneIndex: number
  numCells: number
  cellCoords: [number, number][]
  connectsTo: string | null
}

export interface Network {
  cellSizeMeters: number
  junction: string
  lanes: Record<string, Lane>
}

export const fetchNetwork = async () => {
  return await fetchJson<Network>("/network")
}
