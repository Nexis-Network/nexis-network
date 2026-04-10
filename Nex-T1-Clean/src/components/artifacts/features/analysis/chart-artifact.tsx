"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ComposedChart,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { Button } from "@/components/ui/button";
import { Download, Table as TableIcon, ChartBar, LineChart as LineChartIcon } from "lucide-react";
import { InteractiveChartData } from "../../chart-types";


const DEFAULT_COLORS = [
  "#0ea5e9", // sky-500
  "#3b82f6", // blue-500
  "#8b5cf6", // violet-500
  "#d946ef", // fuchsia-500
  "#f43f5e", // rose-500
  "#f97316", // orange-500
  "#eab308", // yellow-500
  "#22c55e", // green-500
  "#14b8a6", // teal-500
];

interface InteractiveChartArtifactProps {
  data: InteractiveChartData;
}

export function InteractiveChartArtifact({ data: chartData }: InteractiveChartArtifactProps) {
  const { config, data } = chartData;
  const [activeTab, setActiveTab] = useState("chart");

  const colors = useMemo(() => {
    if (config.colors) return config.colors;
    const colorMap: Record<string, string> = {};
    config.yAxisKeys.forEach((key: string, index: number) => {
      colorMap[key] = DEFAULT_COLORS[index % DEFAULT_COLORS.length];
    });
    return colorMap;
  }, [config]);

  const downloadCSV = () => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers.map((header) => JSON.stringify(row[header])).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${config.title.replace(/\s+/g, "_").toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderChart = () => {
    switch (config.type) {
      case "line":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="#334155" />
              <XAxis dataKey={config.xAxisKey} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} label={config.yAxisLabel ? { value: config.yAxisLabel, angle: -90, position: 'insideLeft', style: { fill: '#94a3b8' } } : undefined} />
              <Tooltip 
                contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#f8fafc", borderRadius: "8px" }}
                itemStyle={{ color: "#e2e8f0" }}
              />
              <Legend />
              {config.yAxisKeys.map((key: string) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[key] || DEFAULT_COLORS[0]}
                  strokeWidth={2}
                  dot={{ r: 3, fill: colors[key] || DEFAULT_COLORS[0] }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
      case "bar":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="#334155" />
              <XAxis dataKey={config.xAxisKey} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} label={config.yAxisLabel ? { value: config.yAxisLabel, angle: -90, position: 'insideLeft', style: { fill: '#94a3b8' } } : undefined} />
              <Tooltip 
                 contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#f8fafc", borderRadius: "8px" }}
                 itemStyle={{ color: "#e2e8f0" }}
              />
              <Legend />
              {config.yAxisKeys.map((key: string) => (
                <Bar key={key} dataKey={key} fill={colors[key] || DEFAULT_COLORS[0]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      case "area":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="#334155" />
              <XAxis dataKey={config.xAxisKey} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} label={config.yAxisLabel ? { value: config.yAxisLabel, angle: -90, position: 'insideLeft', style: { fill: '#94a3b8' } } : undefined} />
              <Tooltip 
                 contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#f8fafc", borderRadius: "8px" }}
                 itemStyle={{ color: "#e2e8f0" }}
              />
              <Legend />
              {config.yAxisKeys.map((key: string) => (
                <Area 
                  key={key} 
                  type="monotone" 
                  dataKey={key} 
                  stackId="1" 
                  stroke={colors[key] || DEFAULT_COLORS[0]} 
                  fill={colors[key] || DEFAULT_COLORS[0]} 
                  fillOpacity={0.4}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );
      case "scatter":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="#334155" />
              <XAxis type="number" dataKey={config.xAxisKey} name={config.xAxisLabel || config.xAxisKey} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis type="number" dataKey={config.yAxisKeys[0]} name={config.yAxisLabel || config.yAxisKeys[0]} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip 
                 cursor={{ strokeDasharray: '3 3' }} 
                 contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#f8fafc", borderRadius: "8px" }}
              />
              <Legend />
              {config.yAxisKeys.map((key: string, idx: number) => (
                 <Scatter key={key} name={key} data={data} fill={colors[key] || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]} />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        );
      case "pie":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={120}
                fill="#8884d8"
                dataKey={config.dataKey || config.yAxisKeys[0]} // Use specific dataKey for pie or first yAxisKey
                nameKey={config.nameKey || config.xAxisKey}    // Use specific nameKey or xAxisKey
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index: number) => (
                  <Cell key={`cell-${index}`} fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                 contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#f8fafc", borderRadius: "8px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
         // Fallback to composed if unknown or explicitly composed
         return (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="#334155" />
                <XAxis dataKey={config.xAxisKey} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                   contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#f8fafc", borderRadius: "8px" }}
                   itemStyle={{ color: "#e2e8f0" }}
                />
                <Legend />
                {config.yAxisKeys.map((key: string, idx: number) => {
                    // Just default to Bar for mixed for now unless more config
                    return <Bar key={key} dataKey={key} fill={colors[key] || DEFAULT_COLORS[idx]} radius={[4, 4, 0, 0]} />;
                })}
              </ComposedChart>
            </ResponsiveContainer>
          );
    }
  };

  // Handle hydration mismatch for Tabs/Charts
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
     setMounted(true);
  }, []);

  if (!mounted) {
      return <div className="space-y-4 h-full flex flex-col p-4 animate-pulse bg-muted/5 rounded-md" />;
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
       {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-2">
             <LineChartIcon className="h-4 w-4" />
             <div className="space-y-0.5">
                <h3 className="text-sm font-medium text-foreground">{config.title}</h3>
                {config.description && <p className="text-[10px] text-muted-foreground">{config.description}</p>}
             </div>
          </div>
          <div className="flex items-center gap-2">
             <Button variant="outline" size="sm" onClick={downloadCSV} className="h-7 text-xs gap-1.5 border-dashed bg-background/50 hover:bg-background/80">
                <Download className="h-3 w-3" />
                <span>CSV</span>
             </Button>
          </div>
        </div>

       {/* Content */}
       <div className="flex-1 w-full min-h-0 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
             <div className="flex items-center justify-end mb-2 shrink-0">
                 <TabsList className="h-7 w-fit bg-muted/50">
                    <TabsTrigger value="chart" className="h-5 text-[10px] gap-1.5 data-[state=active]:bg-background">
                        <ChartBar className="h-3 w-3" />
                        Chart
                    </TabsTrigger>
                    <TabsTrigger value="table" className="h-5 text-[10px] gap-1.5 data-[state=active]:bg-background">
                        <TableIcon className="h-3 w-3" />
                        Data
                    </TabsTrigger>
                 </TabsList>
             </div>
             
             <TabsContent value="chart" className="mt-0 flex-1 w-full min-h-[300px]">
                {renderChart()}
             </TabsContent>
             
             <TabsContent value="table" className="mt-0 flex-1 overflow-hidden">
                <div className="rounded-md border border-border/40 h-full overflow-auto bg-card/20">
                   <Table>
                      <TableHeader className="bg-muted/30 sticky top-0 z-10">
                         <TableRow className="hover:bg-transparent border-b border-border/40">
                            {/* Dynamically generate headers */}
                            {data.length > 0 && Object.keys(data[0]).map((key) => (
                               <TableHead key={key} className="whitespace-nowrap text-xs h-9 text-muted-foreground">{key}</TableHead>
                            ))}
                         </TableRow>
                      </TableHeader>
                      <TableBody>
                         {data.map((row, i: number) => (
                            <TableRow key={i} className="hover:bg-white/5 border-b border-border/20 last:border-0">
                               {Object.values(row).map((val, j) => (
                                  <TableCell key={j} className="whitespace-nowrap text-xs py-2 text-foreground/80 font-mono">{String(val)}</TableCell>
                               ))}
                            </TableRow>
                         ))}
                      </TableBody>
                   </Table>
                </div>
             </TabsContent>
          </Tabs>
      </div>
    </div>
  );
}
