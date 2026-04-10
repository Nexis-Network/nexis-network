"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";


import { logger } from '@/lib/logger';
interface SubmitToolModalProps {
  onSuccess?: () => void;
}

export function SubmitToolModal({ onSuccess }: SubmitToolModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingPublisher, setCheckingPublisher] = useState(true);
  const [publisherId, setPublisherId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    sre_url: "",
    transport: "sse",
    is_public: true
  });

  const supabase = createClient();

  useEffect(() => {
    if (open) {
      checkPublisherStatus();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const checkPublisherStatus = async () => {
    setCheckingPublisher(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: _error } = await supabase
        .from('user_publisher_mapping')
        .select('publisher_id')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setPublisherId(data.publisher_id);
      }
    } catch (_error) {
      logger.error("Error checking publisher:", _error);
    } finally {
      setCheckingPublisher(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publisherId) {
      toast.error("You must create a Publisher Profile first");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('mcp_registry')
        .insert({
          name: formData.name,
          sre_url: formData.sre_url,
          transport: formData.transport,
          is_public: formData.is_public,
          publisher_id: publisherId,
          status: 'active'
        });

      if (error) throw error;

      toast.success("Tool submitted successfully!");
      toast.info("Discovering capabilities... This may take a moment.");
      setOpen(false);
      setFormData({ name: "", sre_url: "", transport: "sse", is_public: true });
      onSuccess?.();
    } catch (error: UntypedJson) {
      logger.error("Submission error:", error instanceof Error ? error.message : String(error));
      toast.error(error instanceof Error ? error.message : "Failed to submit tool");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-sky-500 hover:bg-sky-600 text-white gap-2">
          <Plus className="h-4 w-4" />
          Submit Tool
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Register New Tool</DialogTitle>
          <DialogDescription>
            Add an MCP server to the registry. We&apos;ll automatically verify it.
          </DialogDescription>
        </DialogHeader>

        {checkingPublisher ? (
           <div className="py-8 flex justify-center">
             <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
           </div>
        ) : !publisherId ? (
          <div className="py-6 text-center space-y-4">
            <p className="text-sm text-yellow-500 bg-yellow-500/10 p-3 rounded-md border border-yellow-500/20">
              You need a Publisher Profile to submit tools.
            </p>
            <Button onClick={() => setOpen(false)} variant="outline">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid gap-2">
              <Label htmlFor="tool-name">Tool Name</Label>
              <Input
                id="tool-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Weather Service"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="transport">Transport Type</Label>
              <Select 
                value={formData.transport} 
                onValueChange={(val) => setFormData({ ...formData, transport: val })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select transport" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sse">SSE (Server-Sent Events)</SelectItem>
                  <SelectItem value="stdio">Stdio (Local Process)</SelectItem>
                  <SelectItem value="http">HTTP (Generic)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sre-url">Endpoint URL</Label>
              <Input
                id="sre-url"
                value={formData.sre_url}
                onChange={(e) => setFormData({ ...formData, sre_url: e.target.value })}
                placeholder="https://api.example.com/sse"
                required
              />
              <p className="text-[10px] text-muted-foreground">
                The URL where the MCP server is reachable.
              </p>
            </div>

            <div className="flex items-center justify-between space-x-2 pt-2">
              <Label htmlFor="public-mode" className="flex flex-col space-y-1">
                <span>Public Registry</span>
                <span className="text-[10px] font-normal text-muted-foreground">List this tool in the global catalog</span>
              </Label>
              <Switch
                id="public-mode"
                checked={formData.is_public}
                onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="submit" disabled={loading} className="w-full bg-sky-500 hover:bg-sky-600">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Register Tool"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
