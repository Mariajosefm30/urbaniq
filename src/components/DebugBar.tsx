import { useState } from "react";
import { useSession } from "@/contexts/SessionContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function DebugBar() {
  const { session, loading, refreshSession } = useSession();
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [promoteEmail, setPromoteEmail] = useState("");
  const [promoteRole, setPromoteRole] = useState<"admin" | "manager" | "resident">("resident");
  const [assignEmail, setAssignEmail] = useState("");
  const [assignBuildingId, setAssignBuildingId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Only show in development/staging
  if (import.meta.env.PROD) return null;

  const handleWhoAmI = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('whoami');
      if (error) throw error;
      console.log('[whoami]', data);
      toast.success(`WhoAmI: ${data.email} (${data.role})`);
    } catch (error: any) {
      console.error('[whoami] error:', error);
      toast.error(error.message || "Failed to fetch user info");
    }
  };

  const handlePromote = async () => {
    if (!promoteEmail.trim()) {
      toast.error("Please enter an email");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ role: promoteRole })
        .eq("email", promoteEmail.toLowerCase())
        .select("email, role")
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast.error("User not found");
        } else {
          throw error;
        }
        return;
      }

      toast.success(`Updated ${data.email} to ${data.role}`);
      setPromoteEmail("");
      setPromoteRole("resident");
      setPromoteOpen(false);
      await refreshSession();
    } catch (error: any) {
      console.error("Error promoting user:", error);
      toast.error(error.message || "Failed to update role");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = async () => {
    if (!assignEmail.trim() || !assignBuildingId.trim()) {
      toast.error("Please enter email and building ID");
      return;
    }

    setSubmitting(true);
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", assignEmail.toLowerCase())
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          toast.error("User not found");
        } else {
          throw profileError;
        }
        return;
      }

      const { error } = await supabase
        .from("manager_buildings")
        .insert({ user_id: profile.id, building_id: assignBuildingId })
        .select()
        .single();

      if (error && error.code !== '23505') { // Ignore duplicate key error
        throw error;
      }

      toast.success(`Assigned building to ${assignEmail}`);
      setAssignEmail("");
      setAssignBuildingId("");
      setAssignOpen(false);
      await refreshSession();
    } catch (error: any) {
      console.error("Error assigning building:", error);
      toast.error(error.message || "Failed to assign building");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearLastBuilding = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ last_building_id: null })
        .eq("id", session?.user_id);

      if (error) throw error;

      toast.success("Cleared last building");
      await refreshSession();
    } catch (error: any) {
      console.error("Error clearing last building:", error);
      toast.error(error.message || "Failed to clear last building");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-yellow-500 text-black px-4 py-2 text-xs font-mono flex items-center gap-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading session...
      </div>
    );
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-yellow-500 text-black px-4 py-2 text-xs font-mono flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <span>user: {session?.email || 'null'}</span>
          <span>role: {session?.role || 'null'}</span>
          <span>org_id: {session?.org_id || 'null'}</span>
          <span>last_building_id: {session?.last_building_id || 'null'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleWhoAmI} className="h-6 text-xs">
            WhoAmI
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPromoteOpen(true)} className="h-6 text-xs">
            Promote
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)} className="h-6 text-xs">
            Assign Building
          </Button>
          <Button size="sm" variant="outline" onClick={handleClearLastBuilding} disabled={submitting} className="h-6 text-xs">
            Clear Building
          </Button>
        </div>
      </div>

      {/* Role Promotion Dialog */}
      <Dialog open={promoteOpen} onOpenChange={setPromoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote User Role</DialogTitle>
            <DialogDescription>Update a user's role by email</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="promote-email">Email</Label>
              <Input
                id="promote-email"
                type="email"
                value={promoteEmail}
                onChange={(e) => setPromoteEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promote-role">Role</Label>
              <Select value={promoteRole} onValueChange={(value: any) => setPromoteRole(value)}>
                <SelectTrigger id="promote-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resident">Resident</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handlePromote} disabled={submitting} className="w-full">
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</> : 'Update Role'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Building Assignment Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Building to Manager</DialogTitle>
            <DialogDescription>Add a building assignment for a manager</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assign-email">Manager Email</Label>
              <Input
                id="assign-email"
                type="email"
                value={assignEmail}
                onChange={(e) => setAssignEmail(e.target.value)}
                placeholder="manager@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assign-building">Building ID</Label>
              <Input
                id="assign-building"
                value={assignBuildingId}
                onChange={(e) => setAssignBuildingId(e.target.value)}
                placeholder="building-uuid"
              />
            </div>
            <Button onClick={handleAssign} disabled={submitting} className="w-full">
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Assigning...</> : 'Assign Building'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
