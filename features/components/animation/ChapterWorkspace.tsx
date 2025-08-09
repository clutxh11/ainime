"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight, Plus, CheckCircle2, AlertCircle } from "lucide-react";

interface ChapterWorkspaceProps {
  projectTitle?: string;
  volumeTitle?: string;
  chapterTitle?: string;
}

export function ChapterWorkspace({
  projectTitle = "Project Alpha",
  volumeTitle = "Volume 1",
  chapterTitle = "Chapter 3",
}: ChapterWorkspaceProps) {
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [activeRightTab, setActiveRightTab] = useState<string>("notes");

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Top Bar */}
      <div className="border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 text-gray-300">
            <span className="text-gray-400">{projectTitle}</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-400">{volumeTitle}</span>
            <ChevronRight className="h-4 w-4" />
            <span className="font-semibold text-white">{chapterTitle}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="bg-red-600 hover:bg-red-700">
              Assign
            </Button>
            <Button size="sm" variant="outline" className="border-gray-700 text-gray-200 hover:bg-gray-800">
              <Plus className="mr-1 h-4 w-4" /> New Shot
            </Button>
            <Button size="sm" variant="ghost" className="text-gray-300 hover:text-white">
              Approve
            </Button>
            <Button size="sm" variant="destructive" className="bg-red-700 hover:bg-red-800">
              Publish
            </Button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto grid max-w-7xl grid-cols-12 gap-4 px-4 py-4">
        {/* Left Sidebar */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="py-3">
              <CardTitle className="text-sm text-gray-300">Navigation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="border-gray-700 text-gray-200 hover:bg-gray-700">Dashboard</Button>
                <Button className="bg-red-600 hover:bg-red-700">Workspace</Button>
                <Button variant="outline" className="border-gray-700 text-gray-200 hover:bg-gray-700">Assets</Button>
                <Button variant="outline" className="border-gray-700 text-gray-200 hover:bg-gray-700">Calendar</Button>
              </div>
              <Separator className="bg-gray-700" />
              <Input placeholder="Find shot/sequence" className="bg-gray-700 border-gray-600 text-white" />
              <div className="flex flex-wrap gap-2 pt-2">
                {[
                  { label: "All", key: "all" },
                  { label: "Storyboard", key: "storyboard" },
                  { label: "Layout", key: "layout" },
                  { label: "Key", key: "key" },
                  { label: "Inbetween", key: "inbetween" },
                  { label: "Clean/Color", key: "clean" },
                  { label: "Comp", key: "comp" },
                  { label: "Audio", key: "audio" },
                ].map((chip) => (
                  <Badge
                    key={chip.key}
                    onClick={() => setStageFilter(chip.key)}
                    className={`cursor-pointer ${
                      stageFilter === chip.key ? "bg-red-600" : "bg-gray-700 hover:bg-gray-600"
                    }`}
                  >
                    {chip.label}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="py-3">
              <CardTitle className="text-sm text-gray-300">Sequences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <div className="flex items-center justify-between rounded-md bg-gray-700 px-3 py-2">
                  <span className="text-sm">SEQ 010</span>
                  <Badge variant="secondary" className="bg-gray-600 text-xs">3 shots</Badge>
                </div>
                <div className="mt-1 space-y-1 pl-3">
                  <ShotRow code="010A" stage="Key" status="in-progress" due="Aug 22" assignee="AK" />
                  <ShotRow code="010B" stage="Layout" status="todo" due="Aug 24" />
                </div>
              </div>
              <div className="pt-2">
                <div className="flex items-center justify-between rounded-md bg-gray-700 px-3 py-2">
                  <span className="text-sm">SEQ 020</span>
                  <Badge variant="secondary" className="bg-gray-600 text-xs">5 shots</Badge>
                </div>
                <div className="mt-1 space-y-1 pl-3">
                  <ShotRow code="020A" stage="Inbetween" status="review" assignee="SK" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main */}
        <div className="col-span-12 lg:col-span-6 space-y-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="py-3">
              <CardTitle className="text-white text-base">{chapterTitle} • Workspace</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="script" className="w-full">
                <TabsList className="bg-gray-900">
                  <TabsTrigger value="script">Script</TabsTrigger>
                  <TabsTrigger value="storyboard">Storyboard</TabsTrigger>
                  <TabsTrigger value="layout">Layout/Camera</TabsTrigger>
                  <TabsTrigger value="key">Key</TabsTrigger>
                  <TabsTrigger value="inbetween">Inbetween</TabsTrigger>
                  <TabsTrigger value="clean">Clean/Color</TabsTrigger>
                  <TabsTrigger value="comp">Compositing</TabsTrigger>
                  <TabsTrigger value="audio">Audio</TabsTrigger>
                  <TabsTrigger value="review">Review/QC</TabsTrigger>
                  <TabsTrigger value="publish">Publish</TabsTrigger>
                </TabsList>

                <TabsContent value="script" className="pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="bg-gray-900 border-gray-700">
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm text-gray-300">Script</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Textarea rows={12} className="bg-gray-800 border-gray-700" defaultValue={`# INT. TEMPLE — NIGHT\n\nThe wind howls. Our hero steps into the darkened hall...`} />
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-red-600 hover:bg-red-700">Save Draft</Button>
                          <Button size="sm" variant="outline" className="border-gray-700 text-gray-200 hover:bg-gray-800">Submit for Review</Button>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gray-900 border-gray-700">
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm text-gray-300">Revisions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-64 pr-2">
                          <div className="space-y-3 text-sm text-gray-300">
                            <div className="flex items-center justify-between rounded border border-gray-700 p-2">
                              <span>Rev 5 • Director • Aug 08</span>
                              <Badge className="bg-gray-700">current</Badge>
                            </div>
                            <div className="rounded border border-gray-700 p-2">Rev 4 • Writer • Aug 07</div>
                            <div className="rounded border border-gray-700 p-2">Rev 3 • Writer • Aug 05</div>
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="storyboard" className="pt-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((f) => (
                      <Card key={f} className="bg-gray-900 border-gray-700">
                        <CardContent className="p-3">
                          <div className="h-32 w-full rounded bg-gray-700" />
                          <div className="mt-2 text-sm text-gray-300">Frame {String(f).padStart(3, "0")}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="layout" className="pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="bg-gray-900 border-gray-700">
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm text-gray-300">Camera/Layout</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <Input placeholder="FPS" defaultValue="24" className="bg-gray-800 border-gray-700" />
                          <Input placeholder="Resolution" defaultValue="1920x1080" className="bg-gray-800 border-gray-700" />
                        </div>
                        <Textarea rows={10} className="bg-gray-800 border-gray-700" placeholder="{ /* camera JSON */ }" />
                        <Button size="sm" className="bg-red-600 hover:bg-red-700">Save Layout</Button>
                      </CardContent>
                    </Card>
                    <Card className="bg-gray-900 border-gray-700">
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm text-gray-300">Preview</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64 w-full rounded bg-gray-700" />
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="key" className="pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="bg-gray-900 border-gray-700">
                      <CardHeader className="py-3"><CardTitle className="text-sm text-gray-300">Layers</CardTitle></CardHeader>
                      <CardContent className="space-y-2 text-sm text-gray-300">
                        <div className="rounded border border-gray-700 p-2">CHAR_A</div>
                        <div className="rounded border border-gray-700 p-2">BG</div>
                        <div className="rounded border border-gray-700 p-2">FX</div>
                        <Separator className="bg-gray-700" />
                        <Button variant="outline" className="border-gray-700 text-gray-200 hover:bg-gray-800">Upload Keyframes</Button>
                      </CardContent>
                    </Card>
                    <Card className="bg-gray-900 border-gray-700">
                      <CardHeader className="py-3"><CardTitle className="text-sm text-gray-300">Timeline</CardTitle></CardHeader>
                      <CardContent>
                        <div className="h-40 w-full rounded bg-gray-700" />
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" className="bg-red-600 hover:bg-red-700">Submit for Review</Button>
                          <Button size="sm" variant="outline" className="border-gray-700 text-gray-200 hover:bg-gray-800">Assign</Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="inbetween" className="pt-4">
                  <Card className="bg-gray-900 border-gray-700">
                    <CardContent className="space-y-3 p-4">
                      <div className="grid grid-cols-3 gap-3">
                        <Input placeholder="Start" defaultValue="12" className="bg-gray-800 border-gray-700" />
                        <Input placeholder="End" defaultValue="48" className="bg-gray-800 border-gray-700" />
                        <Button className="bg-red-600 hover:bg-red-700">Assign Range</Button>
                      </div>
                      <Button variant="outline" className="border-gray-700 text-gray-200 hover:bg-gray-800">Upload Inbetweens</Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="clean" className="pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="bg-gray-900 border-gray-700">
                      <CardHeader className="py-3"><CardTitle className="text-sm text-gray-300">Palette</CardTitle></CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-6 gap-2">
                          {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="h-8 w-8 rounded" style={{ backgroundColor: `hsl(${(i * 30) % 360},60%,50%)` }} />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gray-900 border-gray-700">
                      <CardHeader className="py-3"><CardTitle className="text-sm text-gray-300">Before/After</CardTitle></CardHeader>
                      <CardContent>
                        <div className="h-64 w-full rounded bg-gray-700" />
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="comp" className="pt-4">
                  <Card className="bg-gray-900 border-gray-700">
                    <CardContent className="space-y-3 p-4">
                      <Button variant="outline" className="border-gray-700 text-gray-200 hover:bg-gray-800">Upload AE/Nuke Project</Button>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="h-40 w-full rounded bg-gray-700" />
                        <div className="h-40 w-full rounded bg-gray-700" />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="audio" className="pt-4">
                  <Card className="bg-gray-900 border-gray-700">
                    <CardContent className="space-y-3 p-4">
                      <div className="flex gap-2">
                        <Button variant="outline" className="border-gray-700 text-gray-200 hover:bg-gray-800">Upload VO</Button>
                        <Button variant="outline" className="border-gray-700 text-gray-200 hover:bg-gray-800">Upload SFX</Button>
                        <Button variant="outline" className="border-gray-700 text-gray-200 hover:bg-gray-800">Upload BGM</Button>
                      </div>
                      <div className="h-32 w-full rounded bg-gray-700" />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="review" className="pt-4">
                  <Card className="bg-gray-900 border-gray-700">
                    <CardContent className="space-y-3 p-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-300"><CheckCircle2 className="h-4 w-4 text-green-500" /> Continuity</div>
                        <div className="flex items-center gap-2 text-sm text-gray-300"><CheckCircle2 className="h-4 w-4 text-green-500" /> Color</div>
                        <div className="flex items-center gap-2 text-sm text-gray-300"><AlertCircle className="h-4 w-4 text-yellow-500" /> Timing</div>
                      </div>
                      <div className="flex gap-2">
                        <Button className="bg-green-600 hover:bg-green-700">Approve</Button>
                        <Button variant="destructive" className="bg-red-700 hover:bg-red-800">Request Changes</Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="publish" className="pt-4">
                  <Card className="bg-gray-900 border-gray-700">
                    <CardContent className="space-y-3 p-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <Input placeholder="Render Profile (e.g., 1080p H.264)" className="bg-gray-800 border-gray-700" />
                        <Input placeholder="Locales (EN, JP, ES)" className="bg-gray-800 border-gray-700" />
                      </div>
                      <Textarea rows={5} placeholder="Version Notes" className="bg-gray-800 border-gray-700" />
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-400">Last publish: v1.0.3 • 1080p • EN,JP</div>
                        <Button className="bg-red-600 hover:bg-red-700">Publish</Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right Utility */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="py-3">
              <CardTitle className="text-sm text-gray-300">Notes • Approvals • Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeRightTab} onValueChange={setActiveRightTab} className="w-full">
                <TabsList className="bg-gray-900">
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                  <TabsTrigger value="approvals">Approvals</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>
                <TabsContent value="notes" className="pt-3">
                  <ScrollArea className="h-64 pr-2">
                    <div className="space-y-3 text-sm text-gray-300">
                      <div className="rounded border border-gray-700 p-2">[AK] Tighten pose on 020A.</div>
                      <div className="rounded border border-gray-700 p-2">[SK] Need more frames between 12-20.</div>
                    </div>
                  </ScrollArea>
                  <div className="mt-3 flex gap-2">
                    <Input placeholder="Add a note..." className="bg-gray-800 border-gray-700" />
                    <Button size="sm" className="bg-red-600 hover:bg-red-700">Post</Button>
                  </div>
                </TabsContent>
                <TabsContent value="approvals" className="pt-3 text-sm text-gray-300">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded border border-gray-700 p-2">
                      <span>Layout • Rev 2</span>
                      <Badge className="bg-green-600">Approved</Badge>
                    </div>
                    <div className="flex items-center justify-between rounded border border-gray-700 p-2">
                      <span>Key • Rev 3</span>
                      <Badge className="bg-yellow-600">In Review</Badge>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="activity" className="pt-3 text-sm text-gray-300">
                  <ScrollArea className="h-64 pr-2">
                    <div className="space-y-2">
                      <div>AK uploaded keyframes v3 for 020A.</div>
                      <div>Director approved Layout Rev 2 for 010B.</div>
                      <div>SK commented on 020A.</div>
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
              <Separator className="my-3 bg-gray-700" />
              <div className="space-y-1 text-sm text-gray-300">
                <div className="flex items-center justify-between"><span>Shot</span><span className="text-gray-400">020A</span></div>
                <div className="flex items-center justify-between"><span>Stage</span><span className="text-gray-400">Key</span></div>
                <div className="flex items-center justify-between"><span>Assignee</span><span className="text-gray-400">AK</span></div>
                <div className="flex items-center justify-between"><span>Due</span><span className="text-gray-400">Aug 22</span></div>
                <div className="flex items-center justify-between"><span>Versions</span><span className="text-gray-400">Key v3, Comp v2</span></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ShotRow({ code, stage, status, due, assignee }: { code: string; stage: string; status: string; due?: string; assignee?: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-xs">
      <div className="flex items-center gap-2">
        <Badge className="bg-gray-700">SHOT {code}</Badge>
        <span className="text-gray-300">{stage}</span>
      </div>
      <div className="flex items-center gap-2">
        {assignee && <div className="h-5 w-5 rounded-full bg-red-600 text-center text-[10px] leading-5">{assignee}</div>}
        <Badge className={`${status === "approved" ? "bg-green-600" : status === "review" ? "bg-yellow-600" : status === "in-progress" ? "bg-blue-600" : "bg-gray-600"}`}>{status}</Badge>
        {due && <span className="text-gray-400">{due}</span>}
      </div>
    </div>
  );
}

export default ChapterWorkspace;


