
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";


import { logger } from '@/lib/logger';
interface McpApiKeyModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    serverName: string;
    envSchema?: Record<string, { description?: string; required?: boolean }>;
    onSave: (env: Record<string, string>) => Promise<void>;
}

export function McpApiKeyModal({ open, onOpenChange, serverName, envSchema, onSave }: McpApiKeyModalProps) {
    const [values, setValues] = React.useState<Record<string, string>>({});
    const [loading, setLoading] = React.useState(false);

    // If no schema, but we invoked this, assumes at least one key needed or generic "API Key"
    // Usually the registry schema has 'env'.
    const envKeys = envSchema ? Object.keys(envSchema) : [];
    
    const handleSave = async () => {
        setLoading(true);
        try {
            await onSave(values);
            onOpenChange(false);
        } catch (e) {
            logger.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-[#0F0F0F] border-[#333] text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-sky-500" />
                        Configure {serverName}
                    </DialogTitle>
                    <DialogDescription className="text-gray-400 text-xs">
                        This server requires configuration to run securely in your sandbox. 
                        All keys are encrypted and stored non-custodially (RLS-protected).
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {envKeys.length > 0 ? (
                        envKeys.map((key) => (
                            <div key={key} className="grid gap-2">
                                <Label htmlFor={key} className="text-sm font-medium text-gray-200">
                                    {key} {envSchema?.[key]?.required ? "*" : ""}
                                </Label>
                                <Input
                                    id={key}
                                    type="password"
                                    placeholder={envSchema?.[key]?.description || "Enter key..."}
                                    value={values[key] || ""}
                                    onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                                    className="bg-[#151515] border-[#333] text-white focus:ring-sky-500/50"
                                />
                                {envSchema?.[key]?.description && (
                                    <p className="text-[10px] text-gray-500">{envSchema[key].description}</p>
                                )}
                            </div>
                        ))
                    ) : (
                         <div className="text-sm text-gray-400">
                            No specific environment variables defined in registry. 
                            Click &apos;Enable&apos; to proceed without configuration?
                         </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="border-[#333] text-gray-300 hover:bg-[#222]">
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={loading} className="bg-[#c4c4c4]/10 hover:bg-white/20 text-white">
                        {loading ? "Saving..." : "Enable & Save"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
