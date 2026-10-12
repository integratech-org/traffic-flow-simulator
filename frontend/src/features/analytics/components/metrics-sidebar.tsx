import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, Clock, MoreHorizontal, FileText } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts"

interface MetricsSidebarProps {
  open: boolean
  onClose: () => void
}

// TODO: Replace with real data from backend
const mockMetricsData = {
  avgWaitingTime: 43.8,
  vehicleVolume: 41,
  throughput: 1512,
}

// TODO: Replace with real data from backend
const mockQueueData = [
  { time: "0s", queue: 200 },
  { time: "100s", queue: 250 },
  { time: "200s", queue: 300 },
  { time: "300s", queue: 260 },
  { time: "400s", queue: 100 },
  { time: "500s", queue: 210 },
  { time: "600s", queue: 180 },
]

const chartConfig = {
  queue: {
    label: "Queue Length",
    color: "#0D1628",
  },
} satisfies ChartConfig

export function MetricsSidebar({ open, onClose }: MetricsSidebarProps) {
  return (
    <>
      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-[999] bg-black/20" onClick={onClose} />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 z-[1000] h-full w-96 bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col overflow-y-auto">
          {/* Header */}
          <div className="border-b p-6">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img
                  src="/favicon-32x32.png"
                  alt="Traffic Flow Simulation"
                  className="size-6"
                />
                <span className="text-sm font-medium">
                  Traffic Flow Simulation
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={onClose}
              >
                <X className="size-4" />
              </Button>
            </div>
            <h1 className="text-2xl font-bold">Metrics and Results</h1>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-6 p-6">
            {/* Average Network Performance */}
            <div className="space-y-3">
              <h2 className="font-semibold">Average Network Performance</h2>

              {/* Single Card with all metrics */}
              <Card>
                <CardContent className="p-0">
                  {/* Metric 1 */}
                  <div className="flex items-center gap-4 p-4">
                    <div className="flex size-12 items-center justify-center rounded-full bg-[#0D1628] text-white">
                      <Clock className="size-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">
                        Avg waiting time per vehicle
                      </p>
                      <p className="text-2xl font-bold">
                        {mockMetricsData.avgWaitingTime} s
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Metric 2 */}
                  <div className="flex items-center gap-4 p-4">
                    <div className="flex size-12 items-center justify-center rounded-full bg-[#0D1628] text-white">
                      <MoreHorizontal className="size-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">
                        Max queue length
                      </p>
                      <p className="text-2xl font-bold">
                        {mockMetricsData.vehicleVolume}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Metric 3 */}
                  <div className="flex items-center gap-4 p-4">
                    <div className="flex size-12 items-center justify-center rounded-full bg-[#0D1628] text-white">
                      <FileText className="size-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">
                        Throughput
                      </p>
                      <p className="text-2xl font-bold">
                        {mockMetricsData.throughput}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Queue Length Chart */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold">
                  Queue length over time
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                <ChartContainer
                  config={chartConfig}
                  className="h-[280px] w-full"
                >
                  <LineChart data={mockQueueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="time"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{ fontSize: 12, fill: "#6b7280" }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      domain={[0, 400]}
                      tick={{ fontSize: 12, fill: "#6b7280" }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="queue"
                      stroke="#0D1628"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
