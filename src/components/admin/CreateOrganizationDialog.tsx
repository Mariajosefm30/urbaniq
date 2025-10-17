import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import { z } from "zod";

const organizationSchema = z.object({
  name: z.string().trim().min(1, "Organization name is required").max(100, "Name must be less than 100 characters"),
  primaryContactName: z.string().trim().min(1, "Primary contact name is required").max(100, "Name must be less than 100 characters"),
  primaryEmail: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  secondaryContactName: z.string().trim().max(100, "Name must be less than 100 characters").optional().or(z.literal('')),
  secondaryEmail: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters").optional().or(z.literal('')),
});

interface CreateOrganizationDialogProps {
  userId: string;
  onOrganizationCreated: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateOrganizationDialog({ userId, onOrganizationCreated, open, onOpenChange }: CreateOrganizationDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    primaryContactName: "",
    primaryEmail: "",
    secondaryContactName: "",
    secondaryEmail: "",
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
        primary_contact_name: result.data.primaryContactName,
        primary_contact_email: result.data.primaryEmail,
        secondary_contact_name: result.data.secondaryContactName || null,
        secondary_contact_email: result.data.secondaryEmail || null,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <DialogTitle>Create Your Organization</DialogTitle>
          </div>
          <DialogDescription>
            Set up your organization to get started with the admin portal
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
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
              <Label htmlFor="primary-contact-name">Name *</Label>
              <Input
                id="primary-contact-name"
                value={formData.primaryContactName}
                onChange={(e) => handleChange('primaryContactName', e.target.value)}
                placeholder="John Smith"
                maxLength={100}
              />
              {errors.primaryContactName && <p className="text-sm text-destructive">{errors.primaryContactName}</p>}
            </div>

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
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Secondary Contact (Optional)</h3>
            
            <div className="space-y-2">
              <Label htmlFor="secondary-contact-name">Name</Label>
              <Input
                id="secondary-contact-name"
                value={formData.secondaryContactName}
                onChange={(e) => handleChange('secondaryContactName', e.target.value)}
                placeholder="Jane Doe"
                maxLength={100}
              />
              {errors.secondaryContactName && <p className="text-sm text-destructive">{errors.secondaryContactName}</p>}
            </div>

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
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
            {submitting ? "Creating..." : "Create Organization"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
