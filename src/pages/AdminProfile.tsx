import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";

export default function AdminProfile() {
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
  });

  useEffect(() => {
    if (!authLoading && profile?.role !== 'admin') {
      navigate('/');
    }
  }, [authLoading, profile, navigate]);

  useEffect(() => {
    if (profile?.org_id) {
      loadOrganization();
    } else {
      setLoading(false);
    }
  }, [profile?.org_id]);

  const loadOrganization = async () => {
    if (!profile?.org_id) return;

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', profile.org_id)
      .single();

    if (data) {
      setOrganization(data);
      setFormData({
        name: data.name || "",
        contactName: data.primary_contact_name || "",
        contactEmail: data.primary_contact_email || "",
        contactPhone: data.secondary_contact_name || "",
      });
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Organization name is required");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase
      .from('organizations')
      .update({
        name: formData.name,
        primary_contact_name: formData.contactName || null,
        primary_contact_email: formData.contactEmail || null,
        secondary_contact_name: formData.contactPhone || null,
      })
      .eq('id', profile!.org_id);

    if (error) {
      toast.error("Failed to update organization");
      console.error(error);
    } else {
      toast.success("Organization updated successfully");
      loadOrganization();
    }

    setSubmitting(false);
  };

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!profile?.org_id) {
    return (
      <AdminLayout>
        <Card>
          <CardHeader>
            <CardTitle>No Organization</CardTitle>
            <CardDescription>Please complete the setup first</CardDescription>
          </CardHeader>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Company Profile</h1>
        <p className="text-muted-foreground">
          Manage your property management company information
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>
            Update your company information and contact details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="org-name">Company Name *</Label>
              <Input
                id="org-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Acme Property Management"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-name">Contact Name</Label>
              <Input
                id="contact-name"
                value={formData.contactName}
                onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-email">Contact Email</Label>
              <Input
                id="contact-email"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                placeholder="contact@acme.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-phone">Contact Phone</Label>
              <Input
                id="contact-phone"
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
