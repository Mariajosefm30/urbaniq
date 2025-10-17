import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OrganizationSectionProps {
  organization: any;
  onUpdate: () => void;
}

export default function OrganizationSection({ organization, onUpdate }: OrganizationSectionProps) {
  const [name, setName] = useState(organization?.name || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!organization?.id) return;

    setSaving(true);
    const { error } = await supabase
      .from('organizations')
      .update({ name })
      .eq('id', organization.id);

    if (error) {
      toast.error("Failed to update organization");
      console.error(error);
    } else {
      toast.success("Organization updated");
      onUpdate();
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization</CardTitle>
        <CardDescription>Manage your organization details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="org-name">Organization Name</Label>
          <Input
            id="org-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Property Management"
          />
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}
