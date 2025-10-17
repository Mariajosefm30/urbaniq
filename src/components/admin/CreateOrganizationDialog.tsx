import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import { z } from "zod";

const organizationSchema = z.object({
  name: z.string().trim().min(1, "Organization name is required").max(100, "Name must be less than 100 characters"),
  primaryEmail: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  primaryPhone: z.string().trim().min(1, "Primary phone is required").max(20, "Phone must be less than 20 characters"),
  secondaryEmail: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters").optional().or(z.literal('')),
  secondaryPhone: z.string().trim().max(20, "Phone must be less than 20 characters").optional().or(z.literal('')),
});

interface CreateOrganizationDialogProps {
  userId: string;
  onOrganizationCreated: () => void;
}

export default function CreateOrganizationDialog({ userId, onOrganizationCreated }: CreateOrganizationDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    primaryEmail: "",
    primaryPhone: "",
    secondaryEmail: "",
    secondaryPhone: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async () => {
    setErrors({});

    // Validate form data
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

    setSubmitting(true);

    const { data, error } = await supabase
      .from('organizations')
      .insert({
        name: result.data.name,
        primary_contact_email: result.data.primaryEmail,
        primary_contact_phone: result.data.primaryPhone,
        secondary_contact_email: result.data.secondaryEmail || null,
        secondary_contact_phone: result.data.secondaryPhone || null,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create organization");
      setSubmitting(false);
      return;
    }

    // Update user's profile with org_id
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ org_id: data.id })
      .eq('id', userId);

    if (profileError) {
      toast.error("Failed to update profile");
      setSubmitting(false);
      return;
    }

    toast.success("Organization created successfully!");
    onOrganizationCreated();
    setSubmitting(false);
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <Building2 className="h-8 w-8 mb-2 text-primary" />
        <CardTitle>Create Your Organization</CardTitle>
        <CardDescription>
          Set up your organization to get started with the admin portal
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="org-name">Organization Name *</Label>
          <Input
            id="org-name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Acme Property Management"
            maxLength={100}
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Primary Contact</h3>
          
          <div className="space-y-2">
            <Label htmlFor="primary-email">Email *</Label>
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
            <Label htmlFor="primary-phone">Phone *</Label>
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

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Secondary Contact (Optional)</h3>
          
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

        <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
          {submitting ? "Creating..." : "Create Organization"}
        </Button>
      </CardContent>
    </Card>
  );
}
