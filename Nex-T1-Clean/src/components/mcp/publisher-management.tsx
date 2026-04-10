"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Building2 } from "lucide-react";
import { toast } from "sonner";


import { logger } from '@/lib/logger';
interface Publisher {
  id: string;
  name: string;
  website_url: string | null;
  verified: boolean;
}

interface PublisherManagementProps {
  className?: string;
}

export function PublisherManagement({ className }: PublisherManagementProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [publisher, setPublisher] = useState<Publisher | null>(null);
  const [formData, setFormData] = useState({ name: "", website_url: "" });

  const supabase = createClient();

  const fetchPublisher = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch mapping to find publisher_id
      const { data: mapping, error: mappingError } = await supabase
        .from('user_publisher_mapping')
        .select('publisher_id, role')
        .eq('user_id', user.id)
        .single();

      if (mappingError && mappingError.code !== 'PGRST116') {
        logger.error("Error fetching mapping:", mappingError);
        return;
      }

      if (mapping?.publisher_id) {
        const { data: pub, error: pubError } = await supabase
          .from('mcp_publishers')
          .select('*')
          .eq('id', mapping.publisher_id)
          .single();

        if (pubError) throw pubError;
        setPublisher(pub);
        setFormData({ name: pub.name, website_url: pub.website_url || "" });
      }
    } catch (error) {
      logger.error("Failed to load publisher:", error);
      toast.error("Failed to load publisher profile");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchPublisher();
  }, [fetchPublisher]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (publisher) {
        // Update existing
        const { error } = await supabase
          .from('mcp_publishers')
          .update({
            name: formData.name,
            website_url: formData.website_url || null
          })
          .eq('id', publisher.id);

        if (error) throw error;
        toast.success("Publisher profile updated");
        setPublisher({ ...publisher, name: formData.name, website_url: formData.website_url || null });
      } else {
        // Create new
        // 1. Insert Publisher
        const { data: newPub, error: createError } = await supabase
          .from('mcp_publishers')
          .insert({
            name: formData.name,
            website_url: formData.website_url || null,
            verified: false
          })
          .select()
          .single();

        if (createError) throw createError;

        // 2. Insert Mapping (Admin role)
        const { error: mapError } = await supabase
          .from('user_publisher_mapping')
          .insert({
            user_id: user.id,
            publisher_id: newPub.id,
            role: 'admin'
          });

        if (mapError) throw mapError;

        toast.success("Publisher profile created");
        setPublisher(newPub);
      }
    } catch (error: UntypedJson) {
      logger.error("Error saving publisher:", error instanceof Error ? error.message : String(error));
      toast.error(error instanceof Error ? error.message : "Failed to save publisher");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <CardTitle className="text-xl flex items-center gap-2">
                <Building2 className="h-5 w-5 text-sky-500" />
                Publisher Identity
                </CardTitle>
                <CardDescription>
                Manage your organization&apos;s presence in the MCP Registry.
                </CardDescription>
            </div>
            {publisher && (
                <Badge variant={publisher.verified ? "default" : "secondary"} className={publisher.verified ? "bg-sky-500/10 text-sky-500 hover:bg-sky-500/20" : ""}>
                    {publisher.verified ? (
                        <div className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Verified
                        </div>
                    ) : (
                        <div className="flex items-center gap-1">
                            Unverified
                        </div>
                    )}
                </Badge>
            )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Publisher Name</Label>
            <Input
              id="name"
              placeholder="e.g. Acme Corp"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              minLength={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="website">Website URL (Optional)</Label>
            <Input
              id="website"
              type="url"
              placeholder="https://acme.com"
              value={formData.website_url}
              onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={submitting} className="bg-sky-500 hover:bg-sky-600 text-white">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                publisher ? "Update Profile" : "Create Publisher"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
