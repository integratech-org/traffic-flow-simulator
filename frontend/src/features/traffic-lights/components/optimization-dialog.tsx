import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { useSimStore } from "@/features/simulation/store"
import {
  optimizeSignalPlan,
  updateSignalPlan,
  type OptimizationResult,
} from "@/api/simulation"

interface OptimizationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOptimizationComplete?: () => void
}

export function OptimizationDialog({
  open,
  onOpenChange,
  onOptimizationComplete,
}: OptimizationDialogProps) {
  const simConfig = useSimStore((s) => s.config)
  const patchConfig = useSimStore((s) => s.patchConfig)
  const runId = useSimStore((s) => s.runId)
  const status = useSimStore((s) => s.status)

  const [isOptimizing, setIsOptimizing] = useState(false)
  const [result, setResult] = useState<OptimizationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Optimization parameters
  const [populationSize, setPopulationSize] = useState("20")
  const [generations, setGenerations] = useState("10")
  const [ticksPerEval, setTicksPerEval] = useState("600")
  const [wThroughput, setWThroughput] = useState("1.0")
  const [wWait, setWWait] = useState("1.0")
  const [wQueue, setWQueue] = useState("1.0")

  const handleOptimize = async () => {
    setIsOptimizing(true)
    setError(null)
    setResult(null)

    try {
      const optimizationResult = await optimizeSignalPlan({
        base_config: simConfig,
        population_size: Number(populationSize),
        generations: Number(generations),
        ticks_per_eval: Number(ticksPerEval),
        w_throughput: Number(wThroughput),
        w_wait: Number(wWait),
        w_queue: Number(wQueue),
      })

      setResult(optimizationResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Optimization failed")
    } finally {
      setIsOptimizing(false)
    }
  }

  const handleApply = async () => {
    if (!result) return

    try {
      // Update the frontend store
      patchConfig({
        signal_plan: result.best_signal_plan,
      })

      // If simulation is running, also update the backend
      if (runId && (status === "running" || status === "paused")) {
        await updateSignalPlan(runId, result.best_signal_plan)
      }

      onOptimizationComplete?.()
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to apply optimized plan:", error)
    }
  }

  const handleReset = () => {
    setResult(null)
    setError(null)
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[1150] bg-black/50"
        onClick={() => !isOptimizing && onOpenChange(false)}
      />

      {/* Dialog */}
      <Card className="fixed top-1/2 left-1/2 z-[1200] max-h-[90vh] w-[440px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between px-5 pt-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4" />
            Auto-Optimize Traffic Lights
          </CardTitle>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-6 rounded-md hover:bg-muted"
            onClick={() => onOpenChange(false)}
            disabled={isOptimizing}
          >
            <X className="size-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 px-5 pb-4">
          {!result && !error && (
            <>
              <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                <p className="font-medium">What this does:</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs">
                  <li>Maximizes vehicle throughput</li>
                  <li>Reduces average waiting time</li>
                  <li>Minimizes maximum queue length</li>
                </ul>
              </div>

              {/* Optimization Parameters */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="population" className="text-xs">
                      Population Size
                    </Label>
                    <Input
                      id="population"
                      type="number"
                      min="4"
                      max="100"
                      value={populationSize}
                      onChange={(e) => setPopulationSize(e.target.value)}
                      disabled={isOptimizing}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="generations" className="text-xs">
                      Generations
                    </Label>
                    <Input
                      id="generations"
                      type="number"
                      min="1"
                      max="100"
                      value={generations}
                      onChange={(e) => setGenerations(e.target.value)}
                      disabled={isOptimizing}
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ticks" className="text-xs">
                    Simulation Duration (ticks)
                  </Label>
                  <Input
                    id="ticks"
                    type="number"
                    min="100"
                    max="3600"
                    value={ticksPerEval}
                    onChange={(e) => setTicksPerEval(e.target.value)}
                    disabled={isOptimizing}
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">
                    600 ticks ≈ 10 minutes simulated time
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">
                    Optimization Weights
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="w_throughput" className="text-xs">
                        Throughput
                      </Label>
                      <Input
                        id="w_throughput"
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={wThroughput}
                        onChange={(e) => setWThroughput(e.target.value)}
                        disabled={isOptimizing}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="w_wait" className="text-xs">
                        Wait Time
                      </Label>
                      <Input
                        id="w_wait"
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={wWait}
                        onChange={(e) => setWWait(e.target.value)}
                        disabled={isOptimizing}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="w_queue" className="text-xs">
                        Queue Len
                      </Label>
                      <Input
                        id="w_queue"
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={wQueue}
                        onChange={(e) => setWQueue(e.target.value)}
                        disabled={isOptimizing}
                        className="h-9"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Higher weight = higher priority in optimization
                  </p>
                </div>
              </div>

              <Button
                onClick={handleOptimize}
                disabled={isOptimizing}
                className="h-11 w-full bg-[#0D1628] hover:bg-[#0D1628]/90"
              >
                {isOptimizing ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Optimizing... (this may take 20-60s)
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 size-4" />
                    Start Optimization
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground">
                Estimated time: ~
                {Math.ceil((Number(populationSize) * Number(generations)) / 10)}{" "}
                seconds
              </p>
            </>
          )}

          {/* Success Result */}
          {result && (
            <div className="space-y-4">
              <div className="rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
                <div className="flex items-center gap-2 text-green-900 dark:text-green-200">
                  <CheckCircle2 className="size-5" />
                  <p className="font-medium">Optimization Complete!</p>
                </div>
                <p className="mt-1 text-xs text-green-700 dark:text-green-300">
                  Found optimal configuration in{" "}
                  {result.elapsed_seconds.toFixed(1)}s
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Results:</p>
                <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/50 p-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Throughput</p>
                    <p className="font-medium">
                      {result.best_metrics.throughput.toFixed(0)} vehicles
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Wait</p>
                    <p className="font-medium">
                      {result.best_metrics.avg_wait.toFixed(1)} ticks
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Max Queue</p>
                    <p className="font-medium">
                      {result.best_metrics.max_queue.toFixed(0)} vehicles
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Fitness Score
                    </p>
                    <p className="font-medium">
                      {result.best_metrics.fitness.toFixed(3)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Optimized Signal Timings:</p>
                <div className="space-y-1.5 rounded-md border bg-muted/50 p-3 text-xs">
                  {result.best_signal_plan.signal_timers.map((timer, idx) => {
                    const labels = [
                      "North (S1)",
                      "South (S2)",
                      "East (S3)",
                      "West (S4)",
                    ]
                    return (
                      <div
                        key={timer.signal_id}
                        className="flex justify-between"
                      >
                        <span className="font-medium">{labels[idx]}:</span>
                        <span className="text-muted-foreground">
                          Green {timer.green}s | Yellow {timer.yellow}s | Red{" "}
                          {timer.red}s
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleApply}
                  className="flex-1 bg-[#0D1628] hover:bg-[#0D1628]/90"
                >
                  Apply These Settings
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="flex-1"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="space-y-4">
              <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
                <div className="flex items-center gap-2 text-red-900 dark:text-red-200">
                  <AlertCircle className="size-5" />
                  <p className="font-medium">Optimization Failed</p>
                </div>
                <p className="mt-1 text-xs text-red-700 dark:text-red-300">
                  {error}
                </p>
              </div>

              <Button
                onClick={handleReset}
                variant="outline"
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
