"use client";

import React, { memo } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { TOKEN_PANEL_FRAME_CLASS, TOKEN_PANEL_INNER_CLASS } from "./constants";
import { NativeChart } from "./native-chart";

type TechnicalAnalysisWidgetProps = {
    symbol: string;
};

function TechnicalAnalysisWidget({ symbol }: TechnicalAnalysisWidgetProps) {
    return (
        <Card className={cn(TOKEN_PANEL_FRAME_CLASS, "h-[450px] w-full overflow-hidden")}>
            <div className={cn(TOKEN_PANEL_INNER_CLASS, "relative size-full rounded-[11px] bg-background p-4")}>
                <div className="flex h-full w-full flex-col">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Price Chart</h3>
                        <span className="text-xs text-muted-foreground">
                            {symbol.split(":")[1] || symbol}
                        </span>
                    </div>
                    <div className="flex-1 min-h-0">
                        <NativeChart symbol={symbol} />
                    </div>
                </div>
            </div>
        </Card>
    );
}

export default memo(TechnicalAnalysisWidget);
