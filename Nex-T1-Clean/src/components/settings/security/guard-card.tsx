
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { encodeSetGuard } from "@/modules/wallets/nex/modules/guard";


import { logger } from '@/lib/logger';
// This would be the actual deployed guard address in production
const GUARD_MODULE_ADDRESS = "0x0000000000000000000000000000000000000000"; 

export function GuardCard() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleGuard = async (newChecked: boolean) => {
    setLoading(true);
    try {
      const targetGuard = newChecked ? GUARD_MODULE_ADDRESS : "0x0000000000000000000000000000000000000000";
      const data = encodeSetGuard(targetGuard);
      
      logger.debug("Proposed Set Guard:", { data });
      
      setEnabled(newChecked); // Optimistic update for demo
    } catch (e) {
      logger.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/60 bg-card">
      <CardHeader>
        <CardTitle className="text-base">Transaction Guard</CardTitle>
        <CardDescription>
           Enforce policies on every transaction before execution.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-0.5">
            <Label htmlFor="guard-mode">Safe Guard Layer</Label>
            <div className="text-xs text-muted-foreground">
              {enabled ? "Active: Strict Policy Enforcement" : "Disabled: Standard Execution"}
            </div>
          </div>
          <Switch 
            id="guard-mode" 
            checked={enabled} 
            onCheckedChange={toggleGuard}
            disabled={loading}
          />
        </div>
      </CardContent>
    </Card>
  );
}
