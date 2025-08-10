"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { cn } from "@/lib/utils";

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    config?: Record<string, any>;
  }
>(({ className, children, config, ...props }, ref) => {
  return (
    <div ref={ref} className={cn("w-full h-full", className)} {...props}>
      {children}
    </div>
  );
});
ChartContainer.displayName = "ChartContainer";

import type { TooltipProps } from "recharts";

const ChartTooltip = React.forwardRef<
  HTMLDivElement,
  Omit<TooltipProps<any, any>, "ref"> & React.HTMLAttributes<HTMLDivElement>
>(({ className, cursor = true, content, ...props }, ref) => {
  return <Tooltip cursor={cursor} content={content} {...props} />;
});
ChartTooltip.displayName = "ChartTooltip";

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    active?: boolean;
    payload?: any[];
    label?: string;
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: "line" | "dot" | "dashed";
    nameKey?: string;
    labelKey?: string;
  }
>(
  (
    {
      className,
      active,
      payload = [],
      label,
      hideLabel = false,
      hideIndicator = false,
      indicator = "dot",
      nameKey,
      labelKey,
      ...props
    },
    ref
  ) => {
    if (!active || !payload?.length) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border bg-background p-2 shadow-md",
          className
        )}
        {...props}
      >
        {!hideLabel && label && <div className="mb-2 font-medium">{label}</div>}
        <div className="grid gap-2">
          {payload.map((item: any, index: number) => (
            <div
              key={index}
              className="flex w-full items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground"
            >
              {!hideIndicator && (
                <div
                  className="shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]"
                  style={
                    {
                      "--color-bg": item.color,
                      "--color-border": item.color,
                    } as React.CSSProperties
                  }
                />
              )}
              <div className="flex flex-1 justify-between leading-none">
                <div className="grid gap-1.5">
                  <span className="text-muted-foreground">
                    {item.name || item.dataKey}
                  </span>
                </div>
                <span className="font-mono font-medium tabular-nums text-foreground">
                  {item.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
);
ChartTooltipContent.displayName = "ChartTooltipContent";

export { ChartContainer, ChartTooltip, ChartTooltipContent };
