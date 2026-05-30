import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const organizationSchema = z.object({
  name: z.string().trim().min(1, "Organization name is required").max(100, "Name must be less than 100 characters"),
  primaryEmail: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  primaryPhone: z.string().trim().min(1, "Primary phone is required").max(20, "Phone must be less than 20 characters"),
  secondaryEmail: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters").optional().or(z.literal('')),
  secondaryPhone: z.string().trim().max(20, "Phone must be less than 20 characters").optional().or(z.literal('')),
});

interface OrganizationSectionProps {
  organization: any;
  onUpdate: () => void;
}

export default function OrganizationSection({ organization, onUpdate }: OrganizationSectionProps) {
  const [formData, setFormData] = useState({
    name: "",
    primaryEmail: "",
    primaryPhone: "",
    secondaryEmail: "",
    secondaryPhone: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name || "",
        primaryEmail: organization.primary_contact_email || "",
        primaryPhone: organization.primary_contact_phone || "",
        secondaryEmail: organization.secondary_contact_email || "",
        secondaryPhone: organization.secondary_contact_phone || "",
      });
    }
  }, [organization]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleSave = async () => {
    if (!organization?.id) return;

    setErrors({});

    const result = organizationSchema.safeParse(formData);
    
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('organizations')
      .update({
        name: result.data.name,
        primary_contact_email: result.data.primaryEmail,
        secondary_contact_email: result.data.secondaryEmail || null,
      } as any)
      .eq('id', organization.id);

    if (error) {
      toast.error("Failed to update organization");
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
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Acme Property Management"
            maxLength={100}
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-sm font-semibold">Primary Contact</h3>
          
          <div className="space-y-2">
            <Label htmlFor="primary-email">Email</Label>
            <Input
              id="primary-email"
              type="email"
              value={formData.primaryEmail}
              onChange={(e) => handleChange('primaryEmail', e.target.value)}
              placeholder="contact@acme.com"
              maxLength={255}
            />
            {errors.primaryEmail && <p className="text-sm text-destructive">{errors.primaryEmail}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="primary-phone">Phone</Label>
            <Input
              id="primary-phone"
              type="tel"
              value={formData.primaryPhone}
              onChange={(e) => handleChange('primaryPhone', e.target.value)}
              placeholder="+1 (555) 123-4567"
              maxLength={20}
            />
            {errors.primaryPhone && <p className="text-sm text-destructive">{errors.primaryPhone}</p>}
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-sm font-semibold">Secondary Contact (Optional)</h3>
          
          <div className="space-y-2">
            <Label htmlFor="secondary-email">Email</Label>
            <Input
              id="secondary-email"
              type="email"
              value={formData.secondaryEmail}
              onChange={(e) => handleChange('secondaryEmail', e.target.value)}
              placeholder="support@acme.com"
              maxLength={255}
            />
            {errors.secondaryEmail && <p className="text-sm text-destructive">{errors.secondaryEmail}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="secondary-phone">Phone</Label>
            <Input
              id="secondary-phone"
              type="tel"
              value={formData.secondaryPhone}
              onChange={(e) => handleChange('secondaryPhone', e.target.value)}
              placeholder="+1 (555) 987-6543"
              maxLength={20}
            />
            {errors.secondaryPhone && <p className="text-sm text-destructive">{errors.secondaryPhone}</p>}
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}
