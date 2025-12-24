import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function MetricCard({ title, value, subValue, icon, trend, className }: MetricCardProps) {
  return (
    <Card className={cn("hover:border-accent-sky/50 transition-colors duration-300", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-text-secondary">
          {title}
        </CardTitle>
        {icon && <div className="text-text-muted">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-mono text-white">{value}</div>
        {subValue && (
          <p className={cn(
            "text-xs mt-1",
            trend === "up" ? "text-accent-green" : 
            trend === "down" ? "text-red-500" : "text-text-muted"
          )}>
            {subValue}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
