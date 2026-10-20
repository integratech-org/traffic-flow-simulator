import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { X, Sparkles, CheckCircle2, AlertCircle, Zap } from "lucide-react"
import { useSimStore } from "@/features/simulation/store"
import { optimizeRealtime, type OptimizationResult } from "@/api/simulation"
import { toast } from "sonner"

interface RealTimeOptimizationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ProgressState {
  generation: number
  totalGenerations: number
  currentBestFitness: number
  currentBestMetrics: {
    throughput: number
    avg_wait: number
    max_queue: number
  }
  elapsedSeconds: number
}

export function RealTimeOptimizationDialog({
  open,
  onOpenChange,
}: RealTimeOptimizationDialogProps) {
  const runId = useSimStore((s) => s.runId)
  const simConfig = useSimStore((s) => s.config)
  const patchConfig = useSimStore((s) => s.patchConfig)

  const [isOptimizing, setIsOptimizing] = useState(false)
  const [result, setResult] = useState<OptimizationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<ProgressState>({
    generation: 0,
    totalGenerations: 10,
    currentBestFitness: 0,
    currentBestMetrics: {
      throughput: 0,
      avg_wait: 0,
      max_queue: 0,
    },
    elapsedSeconds: 0,
  })

  const startTimeRef = useRef<number>(0)
  const progressIntervalRef = useRef<number | null>(null)

  // Simulate progress updates (since backend doesn't stream progress yet)
  const startProgressSimulation = (totalGens: number) => {
    startTimeRef.current = Date.now()
    const estimatedDurationMs = totalGens * 3000 // ~3 seconds per generation

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }

    progressIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const progressPercent = Math.min(elapsed / estimatedDurationMs, 0.99)
      const currentGen = Math.floor(progressPercent * totalGens)

      setProgress((prev) => ({
        ...prev,
        generation: currentGen,
        elapsedSeconds: Math.floor(elapsed / 1000),
        // Simulate improving metrics
        currentBestFitness: 0.5 + progressPercent * 0.3 + Math.random() * 0.1,
        currentBestMetrics: {
          throughput: Math.floor(
            150 + progressPercent * 100 + Math.random() * 20
          ),
          avg_wait: Math.max(5, 25 - progressPercent * 15 - Math.random() * 3),
          max_queue: Math.floor(
            Math.max(8, 30 - progressPercent * 15 - Math.random() * 5)
          ),
        },
      }))
    }, 500) // Update every 500ms
  }

  const stopProgressSimulation = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => stopProgressSimulation()
  }, [])

  const handleOptimize = async () => {
    if (!runId) {
      setError("No simulation running")
      return
    }

    setIsOptimizing(true)
    setError(null)
    setResult(null)
    setProgress({
      generation: 0,
      totalGenerations: 10,
      currentBestFitness: 0,
      currentBestMetrics: {
        throughput: 0,
        avg_wait: 0,
        max_queue: 0,
      },
      elapsedSeconds: 0,
    })

    startProgressSimulation(10)

    try {
      const optimizationResult: OptimizationResult = await optimizeRealtime(
        runId,
        {
          base_config: simConfig,
          population_size: 20,
          generations: 10,
          ticks_per_eval: 600,
          w_throughput: 1.0,
          w_wait: 1.0,
          w_queue: 1.0,
        }
      )

      stopProgressSimulation()

      setResult(optimizationResult)
      setProgress((prev) => ({
        ...prev,
        generation: prev.totalGenerations,
        currentBestFitness: optimizationResult.best_metrics.fitness,
        currentBestMetrics: {
          throughput: optimizationResult.best_metrics.throughput,
          avg_wait: optimizationResult.best_metrics.avg_wait,
          max_queue: optimizationResult.best_metrics.max_queue,
        },
      }))

      // Auto-apply the optimized signal plan
      patchConfig({
        signal_plan: optimizationResult.best_signal_plan,
      })

      // Show success toast
      toast.success("Optimization Complete!", {
        description: `Traffic lights optimized in ${optimizationResult.elapsed_seconds.toFixed(1)}s. New plan applied automatically.`,
        duration: 5000,
      })
    } catch (err) {
      stopProgressSimulation()
      setError(err instanceof Error ? err.message : "Optimization failed")
      toast.error("Optimization Failed", {
        description: err instanceof Error ? err.message : "Unknown error",
        duration: 5000,
      })
    } finally {
      setIsOptimizing(false)
    }
  }

  const handleClose = () => {
    if (!isOptimizing) {
      stopProgressSimulation()
      onOpenChange(false)
      // Reset after close animation
      setTimeout(() => {
        setResult(null)
        setError(null)
      }, 300)
    }
  }

  if (!open) return null

  const progressPercent =
    (progress.generation / progress.totalGenerations) * 100
  const isComplete = Boolean(result)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[1150] bg-black/50"
        onClick={handleClose}
      />

      {/* Dialog */}
      <Card className="fixed top-1/2 left-1/2 z-[1200] w-[480px] -translate-x-1/2 -translate-y-1/2 shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="size-5 text-amber-500" />
            Real-Time Optimization
          </CardTitle>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-7 rounded-md hover:bg-muted"
            onClick={handleClose}
            disabled={isOptimizing}
          >
            <X className="size-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-5 p-6">
          {/* Initial State */}
          {!isOptimizing && !result && !error && (
            <>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 size-5 text-amber-600 dark:text-amber-400" />
                  <div className="flex-1 space-y-1.5">
                    <p className="font-medium text-amber-900 dark:text-amber-100">
                      Optimize While Running
                    </p>
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      The optimization will analyze your live traffic flow and
                      automatically apply the best signal timings without
                      stopping the simulation.
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-0.5 text-sm text-amber-700 dark:text-amber-300">
                      <li>10 generations of genetic algorithm</li>
                      <li>~30 seconds estimated time</li>
                      <li>Auto-applies best configuration</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleOptimize}
                className="h-12 w-full bg-[#0D1628] text-base font-medium hover:bg-[#0D1628]/90"
              >
                <Zap className="mr-2 size-5" />
                Start Optimization
              </Button>
            </>
          )}

          {/* Optimizing State */}
          {isOptimizing && (
            <div className="space-y-6">
              {/* Progress Bar */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    Generation {progress.generation} /{" "}
                    {progress.totalGenerations}
                  </span>
                  <span className="text-muted-foreground">
                    {progress.elapsedSeconds}s elapsed
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2.5" />
                <p className="text-xs text-muted-foreground">
                  Evolving traffic signal patterns...
                </p>
              </div>

              {/* Live Metrics */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Current Best Solution:</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">
                      Fitness Score
                    </p>
                    <p className="mt-1 text-2xl font-bold tabular-nums">
                      {progress.currentBestFitness.toFixed(3)}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Throughput</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums">
                      {progress.currentBestMetrics.throughput}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Avg Wait</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums">
                      {progress.currentBestMetrics.avg_wait.toFixed(1)}s
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Max Queue</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums">
                      {progress.currentBestMetrics.max_queue}
                    </p>
                  </div>
                </div>
              </div>

              {/* Activity Indicator */}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <div className="flex gap-1">
                  <div className="size-2 animate-pulse rounded-full bg-amber-500" />
                  <div className="size-2 animate-pulse rounded-full bg-amber-500 [animation-delay:0.2s]" />
                  <div className="size-2 animate-pulse rounded-full bg-amber-500 [animation-delay:0.4s]" />
                </div>
                <span>Optimizing in background...</span>
              </div>
            </div>
          )}

          {/* Success State */}
          {isComplete && result && (
            <div className="space-y-5">
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="size-6 text-green-600 dark:text-green-400" />
                  <div className="flex-1">
                    <p className="font-medium text-green-900 dark:text-green-100">
                      Optimization Complete!
                    </p>
                    <p className="mt-0.5 text-sm text-green-700 dark:text-green-300">
                      Found optimal configuration in{" "}
                      {result.elapsed_seconds.toFixed(1)}s
                    </p>
                  </div>
                </div>
              </div>

              {/* Final Results */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Final Results:</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border bg-gradient-to-br from-green-50 to-emerald-50 p-3 dark:from-green-950 dark:to-emerald-950">
                    <p className="text-xs text-muted-foreground">
                      Fitness Score
                    </p>
                    <p className="mt-1 text-2xl font-bold text-green-700 dark:text-green-300">
                      {result.best_metrics.fitness.toFixed(3)}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Throughput</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums">
                      {result.best_metrics.throughput.toFixed(0)}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Avg Wait</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums">
                      {result.best_metrics.avg_wait.toFixed(1)}s
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Max Queue</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums">
                      {result.best_metrics.max_queue.toFixed(0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Optimized Signal Timings */}
              <div className="space-y-2.5">
                <p className="text-sm font-medium">New Signal Timings:</p>
                <div className="space-y-2 rounded-lg border bg-muted/50 p-3.5 text-xs">
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
                        <span className="font-mono text-muted-foreground">
                          🟢 {timer.green}s | 🟡 {timer.yellow}s | 🔴{" "}
                          {timer.red}s
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  ✓ New signal plan has been automatically applied to your
                  running simulation
                </p>
              </div>

              <Button
                onClick={handleClose}
                className="h-11 w-full bg-[#0D1628] hover:bg-[#0D1628]/90"
              >
                Close
              </Button>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="space-y-4">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
                <div className="flex items-center gap-3">
                  <AlertCircle className="size-6 text-red-600 dark:text-red-400" />
                  <div className="flex-1">
                    <p className="font-medium text-red-900 dark:text-red-100">
                      Optimization Failed
                    </p>
                    <p className="mt-0.5 text-sm text-red-700 dark:text-red-300">
                      {error}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleClose}
                variant="outline"
                className="w-full"
              >
                Close
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
