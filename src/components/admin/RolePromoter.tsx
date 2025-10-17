import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Shield } from "lucide-react";

export default function RolePromoter() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "manager" | "resident">("resident");
  const [loading, setLoading] = useState(false);

  const handlePromote = async () => {
    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ role })
        .eq("email", email.toLowerCase())
        .select("email, role")
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast.error("User not found with that email");
        } else {
          throw error;
        }
        return;
      }

      toast.success(`Successfully updated ${data.email} to ${data.role}`);
      setEmail("");
      setRole("resident");
    } catch (error: any) {
      console.error("Error promoting user:", error);
      toast.error(error.message || "Failed to update role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Role Promoter
        </CardTitle>
        <CardDescription>
          Update user roles by email (Admin tool)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handlePromote()}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select value={role} onValueChange={(value: any) => setRole(value)}>
            <SelectTrigger id="role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="resident">Resident</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handlePromote} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            'Update Role'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
