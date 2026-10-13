import { useCallback } from "react"
import { createRun, deleteRun, pauseRun, startRun } from "@/api/simulation"
import { useSimStore } from "../store"

export function useSimulationControls() {
  const status = useSimStore((s) => s.status)

  /** Run / Pause / Resume in one button. */
  const toggle = useCallback(async () => {
    const { runId, status, config, setRun, setStatus } = useSimStore.getState()
    try {
      if (status === "running" && runId) {
        setStatus((await pauseRun(runId)).state)
        return
      }
      let id = runId
      if (!id) {
        id = (await createRun(config)).run_id // config is validated server-side
        setRun(id)
      }
      setStatus((await startRun(id)).state)
    } catch (err) {
      console.error("Simulation request failed:", err)
    }
  }, [])

  /** Stop and discard the run so the next Run picks up edited settings. */
  const reset = useCallback(async () => {
    const { runId, clearRun } = useSimStore.getState()
    clearRun()
    if (runId) await deleteRun(runId).catch(console.error)
  }, [])

  return { status, toggle, reset }
}
