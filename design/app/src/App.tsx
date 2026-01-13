import { useState } from "react"
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Info,
  AlertTriangle,
  Settings,
  Activity,
  ChevronDown,
  Mail,
  User,
  CreditCard,
  LogOut,
  Plus,
  Trash2,
  Edit,
  MoreHorizontal,
  Copy,
  Download,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Slider } from "@/components/ui/slider"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Skeleton } from "@/components/ui/skeleton"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

function App() {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl space-y-12">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-foreground">Kitchen Sink</h1>
            <p className="text-muted-foreground text-sm">
              Tactical Operations Dashboard — All Components
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="nominal">
              <span className="animate-tactical-pulse mr-1">●</span>
              LIVE
            </Badge>
            <span className="text-muted-foreground font-mono text-xs tabular-nums">
              2026-01-12 18:23:49 UTC
            </span>
          </div>
        </div>

        {/* =========================== */}
        {/* BADGES */}
        {/* =========================== */}
        <section className="space-y-4">
          <h2 className="text-section-header">Badges</h2>
          <Card>
            <CardHeader>
              <CardTitle>Badge Variants</CardTitle>
              <CardDescription>Status indicators for at-a-glance system state</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status Variants</Label>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="critical">CRITICAL</Badge>
                  <Badge variant="warning">WARNING</Badge>
                  <Badge variant="nominal">NOMINAL</Badge>
                  <Badge variant="info">INFO</Badge>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Standard Variants</Label>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default">DEFAULT</Badge>
                  <Badge variant="secondary">SECONDARY</Badge>
                  <Badge variant="destructive">DESTRUCTIVE</Badge>
                  <Badge variant="outline">OUTLINE</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* =========================== */}
        {/* BUTTONS */}
        {/* =========================== */}
        <section className="space-y-4">
          <h2 className="text-section-header">Buttons</h2>
          <Card>
            <CardHeader>
              <CardTitle>Button Variants</CardTitle>
              <CardDescription>Interactive elements for user actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Standard Variants</Label>
                <div className="flex flex-wrap gap-2">
                  <Button variant="default">Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                  <Button variant="destructive">Destructive</Button>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Status Variants</Label>
                <div className="flex flex-wrap gap-2">
                  <Button variant="critical">
                    <AlertCircle className="size-4" />
                    Critical
                  </Button>
                  <Button variant="warning">
                    <AlertTriangle className="size-4" />
                    Warning
                  </Button>
                  <Button variant="nominal">
                    <CheckCircle2 className="size-4" />
                    Nominal
                  </Button>
                  <Button variant="info">
                    <Info className="size-4" />
                    Info
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Sizes</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm">Small</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large</Button>
                  <Button size="icon"><Plus className="size-4" /></Button>
                  <Button size="icon-sm"><Plus className="size-4" /></Button>
                  <Button size="icon-lg"><Plus className="size-4" /></Button>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>States</Label>
                <div className="flex flex-wrap gap-2">
                  <Button>Enabled</Button>
                  <Button disabled>Disabled</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* =========================== */}
        {/* ALERTS */}
        {/* =========================== */}
        <section className="space-y-4">
          <h2 className="text-section-header">Alerts</h2>
          <Card>
            <CardHeader>
              <CardTitle>Alert Variants</CardTitle>
              <CardDescription>System notifications with left border accent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="critical">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>System Critical</AlertTitle>
                <AlertDescription>
                  Immediate action required. Generator load exceeds 95% threshold.
                </AlertDescription>
              </Alert>
              <Alert variant="warning">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  Pump bearing temperature approaching limit.
                </AlertDescription>
              </Alert>
              <Alert variant="nominal">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Nominal</AlertTitle>
                <AlertDescription>
                  All systems operating within normal parameters.
                </AlertDescription>
              </Alert>
              <Alert variant="info">
                <Info className="h-4 w-4" />
                <AlertTitle>Information</AlertTitle>
                <AlertDescription>
                  Routine calibration cycle scheduled for 0300 UTC.
                </AlertDescription>
              </Alert>
              <Alert variant="default">
                <Info className="h-4 w-4" />
                <AlertTitle>Default</AlertTitle>
                <AlertDescription>
                  Standard alert without status coloring.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </section>

        {/* =========================== */}
        {/* PROGRESS */}
        {/* =========================== */}
        <section className="space-y-4">
          <h2 className="text-section-header">Progress</h2>
          <Card>
            <CardHeader>
              <CardTitle>Progress Variants</CardTitle>
              <CardDescription>Visual indicators for system health and completion</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Default</span>
                    <span className="font-mono tabular-nums">65%</span>
                  </div>
                  <Progress value={65} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Nominal</span>
                    <span className="font-mono text-status-nominal tabular-nums">97%</span>
                  </div>
                  <Progress value={97} variant="nominal" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Warning</span>
                    <span className="font-mono text-status-warning tabular-nums">82%</span>
                  </div>
                  <Progress value={82} variant="warning" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Critical</span>
                    <span className="font-mono text-status-critical tabular-nums">23%</span>
                  </div>
                  <Progress value={23} variant="critical" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Info</span>
                    <span className="font-mono text-status-info tabular-nums">45%</span>
                  </div>
                  <Progress value={45} variant="info" />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* =========================== */}
        {/* FORM CONTROLS */}
        {/* =========================== */}
        <section className="space-y-4">
          <h2 className="text-section-header">Form Controls</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Input */}
            <Card>
              <CardHeader>
                <CardTitle>Input</CardTitle>
                <CardDescription>Text input with monospace styling</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="default-input">Default</Label>
                  <Input id="default-input" placeholder="Enter value..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coord-input">Coordinates</Label>
                  <Input id="coord-input" placeholder="35.6887N, 51.3875E" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="disabled-input">Disabled</Label>
                  <Input id="disabled-input" placeholder="Disabled input" disabled />
                </div>
              </CardContent>
            </Card>

            {/* Select */}
            <Card>
              <CardHeader>
                <CardTitle>Select</CardTitle>
                <CardDescription>Dropdown selection control</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Region</Label>
                  <Select>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Regions</SelectLabel>
                        <SelectItem value="emea">EMEA</SelectItem>
                        <SelectItem value="apac">APAC</SelectItem>
                        <SelectItem value="amer">AMER</SelectItem>
                        <SelectItem value="mena">MENA</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select defaultValue="high">
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Checkbox */}
            <Card>
              <CardHeader>
                <CardTitle>Checkbox</CardTitle>
                <CardDescription>Boolean selection control</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="check1" />
                  <Label htmlFor="check1" className="text-sm font-normal normal-case tracking-normal">
                    Enable anomaly detection
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="check2" defaultChecked />
                  <Label htmlFor="check2" className="text-sm font-normal normal-case tracking-normal">
                    Auto-refresh enabled
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="check3" disabled />
                  <Label htmlFor="check3" className="text-sm font-normal normal-case tracking-normal">
                    Disabled option
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="check4" defaultChecked disabled />
                  <Label htmlFor="check4" className="text-sm font-normal normal-case tracking-normal">
                    Checked and disabled
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Radio Group */}
            <Card>
              <CardHeader>
                <CardTitle>Radio Group</CardTitle>
                <CardDescription>Single selection from options</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup defaultValue="sigint">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sigint" id="r1" />
                    <Label htmlFor="r1" className="text-sm font-normal normal-case tracking-normal">SIGINT</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="humint" id="r2" />
                    <Label htmlFor="r2" className="text-sm font-normal normal-case tracking-normal">HUMINT</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="osint" id="r3" />
                    <Label htmlFor="r3" className="text-sm font-normal normal-case tracking-normal">OSINT</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="imint" id="r4" />
                    <Label htmlFor="r4" className="text-sm font-normal normal-case tracking-normal">IMINT</Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Switch */}
            <Card>
              <CardHeader>
                <CardTitle>Switch</CardTitle>
                <CardDescription>Toggle control for binary states</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="switch1">Auto-Refresh</Label>
                  <Switch id="switch1" />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="switch2">Predictive Mode</Label>
                  <Switch id="switch2" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="switch3">Anomaly Detection</Label>
                  <Switch id="switch3" />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="switch4">Disabled</Label>
                  <Switch id="switch4" disabled />
                </div>
              </CardContent>
            </Card>

            {/* Slider */}
            <Card>
              <CardHeader>
                <CardTitle>Slider</CardTitle>
                <CardDescription>Range selection control</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Confidence</Label>
                    <span className="font-mono text-sm tabular-nums">75%</span>
                  </div>
                  <Slider defaultValue={[75]} max={100} step={1} />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Velocity</Label>
                    <span className="font-mono text-sm tabular-nums">45</span>
                  </div>
                  <Slider defaultValue={[45]} max={100} step={1} />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Range</Label>
                    <span className="font-mono text-sm tabular-nums">25 - 75</span>
                  </div>
                  <Slider defaultValue={[25, 75]} max={100} step={1} />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* =========================== */}
        {/* TABS */}
        {/* =========================== */}
        <section className="space-y-4">
          <h2 className="text-section-header">Tabs</h2>
          <Card>
            <CardHeader>
              <CardTitle>Tab Navigation</CardTitle>
              <CardDescription>Content organization with tab interface</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="events">
                <TabsList>
                  <TabsTrigger value="events">Events</TabsTrigger>
                  <TabsTrigger value="entities">Entities</TabsTrigger>
                  <TabsTrigger value="alerts">Alerts</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                <TabsContent value="events">
                  <div className="rounded-[3px] border border-border p-4 text-sm text-muted-foreground">
                    <p>Event stream data would appear here. Shows real-time events from monitored systems.</p>
                  </div>
                </TabsContent>
                <TabsContent value="entities">
                  <div className="rounded-[3px] border border-border p-4 text-sm text-muted-foreground">
                    <p>Entity tracking information. Lists all tracked entities with their current status.</p>
                  </div>
                </TabsContent>
                <TabsContent value="alerts">
                  <div className="rounded-[3px] border border-border p-4 text-sm text-muted-foreground">
                    <p>Active alerts and notifications. Shows unacknowledged alerts requiring attention.</p>
                  </div>
                </TabsContent>
                <TabsContent value="settings">
                  <div className="rounded-[3px] border border-border p-4 text-sm text-muted-foreground">
                    <p>Configuration options for the dashboard and monitoring parameters.</p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </section>

        {/* =========================== */}
        {/* TOGGLE & TOGGLE GROUP */}
        {/* =========================== */}
        <section className="space-y-4">
          <h2 className="text-section-header">Toggle & Toggle Group</h2>
          <Card>
            <CardHeader>
              <CardTitle>Toggle Controls</CardTitle>
              <CardDescription>Single and grouped toggle buttons</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Single Toggles</Label>
                <div className="flex flex-wrap gap-2">
                  <Toggle aria-label="Toggle bold">
                    <Settings className="size-4" />
                  </Toggle>
                  <Toggle aria-label="Toggle italic" defaultPressed>
                    <Bell className="size-4" />
                  </Toggle>
                  <Toggle variant="outline" aria-label="Toggle outline">
                    <Activity className="size-4" />
                  </Toggle>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <Label>Region Filter (Single Select)</Label>
                <ToggleGroup type="single" defaultValue="emea" variant="outline">
                  <ToggleGroupItem value="emea">EMEA</ToggleGroupItem>
                  <ToggleGroupItem value="apac">APAC</ToggleGroupItem>
                  <ToggleGroupItem value="amer">AMER</ToggleGroupItem>
                  <ToggleGroupItem value="mena">MENA</ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="space-y-3">
                <Label>Priority (Single Select)</Label>
                <ToggleGroup type="single" defaultValue="high" variant="outline">
                  <ToggleGroupItem value="critical">Critical</ToggleGroupItem>
                  <ToggleGroupItem value="high">High</ToggleGroupItem>
                  <ToggleGroupItem value="medium">Medium</ToggleGroupItem>
                  <ToggleGroupItem value="low">Low</ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="space-y-3">
                <Label>Source Filter (Multiple Select)</Label>
                <ToggleGroup type="multiple" defaultValue={["sigint", "osint"]} variant="outline">
                  <ToggleGroupItem value="sigint">SIGINT</ToggleGroupItem>
                  <ToggleGroupItem value="humint">HUMINT</ToggleGroupItem>
                  <ToggleGroupItem value="osint">OSINT</ToggleGroupItem>
                  <ToggleGroupItem value="imint">IMINT</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* =========================== */}
        {/* TABLE */}
        {/* =========================== */}
        <section className="space-y-4">
          <h2 className="text-section-header">Table</h2>
          <Card>
            <CardHeader>
              <CardTitle>Equipment Diagnostics</CardTitle>
              <CardDescription>Data table with monospace values and status indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableCaption>Real-time equipment monitoring data</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equip ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Parameter</TableHead>
                    <TableHead className="text-right">Current</TableHead>
                    <TableHead className="text-right">Nominal</TableHead>
                    <TableHead className="text-right">Deviation</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>DRL-001</TableCell>
                    <TableCell>Top Drive</TableCell>
                    <TableCell>Torque</TableCell>
                    <TableCell className="text-right text-status-warning">46501.23 Nm</TableCell>
                    <TableCell className="text-right">45000.00 Nm</TableCell>
                    <TableCell className="text-right">+1.23%</TableCell>
                    <TableCell><Badge variant="warning">WARN</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>DRL-001</TableCell>
                    <TableCell>Top Drive</TableCell>
                    <TableCell>RPM</TableCell>
                    <TableCell className="text-right">44210.76</TableCell>
                    <TableCell className="text-right">45000.00</TableCell>
                    <TableCell className="text-right">-0.98%</TableCell>
                    <TableCell><Badge variant="nominal">NOM</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>ELC-012</TableCell>
                    <TableCell>AC Bus Fr</TableCell>
                    <TableCell>Frequency</TableCell>
                    <TableCell className="text-right text-status-critical">69.67 Hz</TableCell>
                    <TableCell className="text-right">60.00 Hz</TableCell>
                    <TableCell className="text-right">+16.12%</TableCell>
                    <TableCell><Badge variant="critical">CRIT</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>DRL-001</TableCell>
                    <TableCell>Top Drive</TableCell>
                    <TableCell>Stroke Rate</TableCell>
                    <TableCell className="text-right">49876.32</TableCell>
                    <TableCell className="text-right">50000.00</TableCell>
                    <TableCell className="text-right">-0.25%</TableCell>
                    <TableCell><Badge variant="nominal">NOM</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>PMP-003</TableCell>
                    <TableCell>Mud Pump</TableCell>
                    <TableCell>Pressure</TableCell>
                    <TableCell className="text-right">2871.60 PSI</TableCell>
                    <TableCell className="text-right">3000.00 PSI</TableCell>
                    <TableCell className="text-right">-4.28%</TableCell>
                    <TableCell><Badge variant="info">INFO</Badge></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        {/* =========================== */}
        {/* DIALOG */}
        {/* =========================== */}
        <section className="space-y-4">
          <h2 className="text-section-header">Dialog</h2>
          <Card>
            <CardHeader>
              <CardTitle>Modal Dialog</CardTitle>
              <CardDescription>Overlay dialog for focused interactions</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Open Dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Action</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to proceed with this operation? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <div className="space-y-2">
                      <Label htmlFor="confirm-input">Type "CONFIRM" to proceed</Label>
                      <Input id="confirm-input" placeholder="CONFIRM" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button variant="critical" onClick={() => setDialogOpen(false)}>Confirm</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </section>

        {/* =========================== */}
        {/* DROPDOWN MENU */}
        {/* =========================== */}
        <section className="space-y-4">
          <h2 className="text-section-header">Dropdown Menu</h2>
          <Card>
            <CardHeader>
              <CardTitle>Dropdown Menus</CardTitle>
              <CardDescription>Contextual action menus</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Actions
                    <ChevronDown className="ml-2 size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem>
                      <User className="mr-2 size-4" />
                      Profile
                      <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <CreditCard className="mr-2 size-4" />
                      Billing
                      <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="mr-2 size-4" />
                      Settings
                      <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive">
                    <LogOut className="mr-2 size-4" />
                    Log out
                    <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Edit className="mr-2 size-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Copy className="mr-2 size-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="mr-2 size-4" />
                    Export
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive">
                    <Trash2 className="mr-2 size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        </section>

        {/* =========================== */}
        {/* TOOLTIP */}
        {/* =========================== */}
        <section className="space-y-4">
          <h2 className="text-section-header">Tooltip</h2>
          <Card>
            <CardHeader>
              <CardTitle>Tooltips</CardTitle>
              <CardDescription>Contextual information on hover</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline">Hover me (top)</Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Tooltip content on top</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline">Hover me (bottom)</Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Tooltip content on bottom</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline">Hover me (left)</Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Tooltip content on left</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline">Hover me (right)</Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Tooltip content on right</p>
                </TooltipContent>
              </Tooltip>
            </CardContent>
          </Card>
        </section>

        {/* =========================== */}
        {/* CARDS */}
        {/* =========================== */}
        <section className="space-y-4">
          <h2 className="text-section-header">Cards</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Basic Card</CardTitle>
                <CardDescription>A simple card with header and content</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Card content goes here. Cards are the primary container for dashboard panels.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Card with Footer</CardTitle>
                <CardDescription>Includes action buttons in footer</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Some content that describes what this card is about.
                </p>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button variant="outline" size="sm">Cancel</Button>
                <Button size="sm">Save</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Metric Card</CardTitle>
                <CardDescription>Displays key metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-hero-metric text-status-nominal">97%</div>
                <p className="text-sm text-muted-foreground mt-2">System health score</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* =========================== */}
        {/* SKELETON */}
        {/* =========================== */}
        <section className="space-y-4">
          <h2 className="text-section-header">Skeleton</h2>
          <Card>
            <CardHeader>
              <CardTitle>Loading States</CardTitle>
              <CardDescription>Skeleton placeholders with tactical pulse animation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Card Skeleton</Label>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Table Row Skeleton</Label>
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Content Block Skeleton</Label>
                <Skeleton className="h-32 w-full" />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* =========================== */}
        {/* SEPARATOR */}
        {/* =========================== */}
        <section className="space-y-4">
          <h2 className="text-section-header">Separator</h2>
          <Card>
            <CardHeader>
              <CardTitle>Separators</CardTitle>
              <CardDescription>Visual dividers for content sections</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Horizontal</Label>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Content above separator</p>
                  <Separator />
                  <p className="text-sm text-muted-foreground">Content below separator</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Vertical</Label>
                <div className="flex h-8 items-center gap-4">
                  <span className="text-sm">Item 1</span>
                  <Separator orientation="vertical" />
                  <span className="text-sm">Item 2</span>
                  <Separator orientation="vertical" />
                  <span className="text-sm">Item 3</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border pt-6">
          <div className="flex items-center gap-4 text-muted-foreground text-xs">
            <span className="flex items-center gap-1">
              <Activity className="size-3" />
              <span className="font-mono">1,847</span> events/hour
            </span>
            <span className="flex items-center gap-1">
              <Bell className="size-3" />
              <span className="font-mono">23</span> alerts
            </span>
            <span className="flex items-center gap-1">
              <Settings className="size-3" />
              <span className="font-mono">247</span> active targets
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-[0.1em]">
            Tactical Operations Dashboard v1.0
          </span>
        </div>
      </div>
    </div>
  )
}

export default App
