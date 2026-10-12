import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { X } from "lucide-react"

interface TrafficLightTiming {
  green: string
  yellow: string
  red: string
}

interface TrafficLightConfig {
  north: TrafficLightTiming
  south: TrafficLightTiming
  west: TrafficLightTiming
  east: TrafficLightTiming
}

interface TrafficLightDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDirectionChange: (direction: keyof TrafficLightConfig) => void
}

const defaultTiming: TrafficLightTiming = {
  green: "8.00",
  yellow: "8.00",
  red: "8.00",
}

const initialConfig: TrafficLightConfig = {
  north: { ...defaultTiming },
  south: { ...defaultTiming },
  west: { ...defaultTiming },
  east: { ...defaultTiming },
}

export function TrafficLightDialog({
  open,
  onOpenChange,
  onDirectionChange,
}: TrafficLightDialogProps) {
  const [config, setConfig] = useState<TrafficLightConfig>(initialConfig)
  const [activeDirection, setActiveDirection] =
    useState<keyof TrafficLightConfig>("north")

  const handleTimingChange = (
    direction: keyof TrafficLightConfig,
    phase: keyof TrafficLightTiming,
    value: string
  ) => {
    setConfig((prev) => ({
      ...prev,
      [direction]: {
        ...prev[direction],
        [phase]: value,
      },
    }))
  }

  const handleDirectionChange = (value: string) => {
    const direction = value as keyof TrafficLightConfig
    setActiveDirection(direction)
    onDirectionChange(direction)
  }

  const handleSave = () => {
    console.log("Saving traffic light configuration:", config)
    // TODO: Send configuration to backend
    onOpenChange(false)
  }

  const currentTiming = config[activeDirection]

  if (!open) return null

  return (
    <Card className="absolute top-20 right-4 z-[1000] w-[340px] shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between px-5 pt-2">
        <CardTitle className="text-base">Traffic Light Configuration</CardTitle>
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-6 rounded-md hover:bg-muted"
          onClick={() => onOpenChange(false)}
        >
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-4">
        <Tabs value={activeDirection} onValueChange={handleDirectionChange}>
          <TabsList className="grid w-full grid-cols-4 bg-gray-100 dark:bg-gray-800">
            <TabsTrigger
              value="north"
              className="transition-none data-active:bg-[#0D1628] data-active:text-white hover:data-active:text-white"
            >
              North
            </TabsTrigger>
            <TabsTrigger
              value="south"
              className="transition-none data-active:bg-[#0D1628] data-active:text-white hover:data-active:text-white"
            >
              South
            </TabsTrigger>
            <TabsTrigger
              value="west"
              className="transition-none data-active:bg-[#0D1628] data-active:text-white hover:data-active:text-white"
            >
              West
            </TabsTrigger>
            <TabsTrigger
              value="east"
              className="transition-none data-active:bg-[#0D1628] data-active:text-white hover:data-active:text-white"
            >
              East
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeDirection} className="mt-4 space-y-4">
            {/* Green Light Timing */}
            <div className="space-y-2">
              <Label htmlFor="green" className="text-sm">
                Green
              </Label>
              <div className="relative">
                <Input
                  id="green"
                  type="number"
                  step="0.01"
                  value={currentTiming.green}
                  onChange={(e) =>
                    handleTimingChange(activeDirection, "green", e.target.value)
                  }
                  className="pr-20"
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                  seconds
                </span>
              </div>
            </div>

            {/* Yellow Light Timing */}
            <div className="space-y-2">
              <Label htmlFor="yellow" className="text-sm">
                Yellow
              </Label>
              <div className="relative">
                <Input
                  id="yellow"
                  type="number"
                  step="0.01"
                  value={currentTiming.yellow}
                  onChange={(e) =>
                    handleTimingChange(
                      activeDirection,
                      "yellow",
                      e.target.value
                    )
                  }
                  className="pr-20"
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                  seconds
                </span>
              </div>
            </div>

            {/* Red Light Timing */}
            <div className="space-y-2">
              <Label htmlFor="red" className="text-sm">
                Red
              </Label>
              <div className="relative">
                <Input
                  id="red"
                  type="number"
                  step="0.01"
                  value={currentTiming.red}
                  onChange={(e) =>
                    handleTimingChange(activeDirection, "red", e.target.value)
                  }
                  className="pr-20"
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                  seconds
                </span>
              </div>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              className="h-11 w-full bg-[#0D1628] hover:bg-[#0D1628]/90"
            >
              Save Traffic Light Configuration
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
