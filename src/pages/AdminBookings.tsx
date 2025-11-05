import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSession } from "@/contexts/SessionContext";
import { useBuilding } from "@/contexts/BuildingContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, User, X, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface Booking {
  id: string;
  amenity_id: string;
  user_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  amenities: {
    name: string;
  };
  profiles: {
    email: string;
    name: string | null;
  };
}

export default function AdminBookings() {
  const { profile } = useAuth();
  const { session, loading: sessionLoading } = useSession();
  const { currentBuildingId } = useBuilding();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Access guard: admin only
  useEffect(() => {
    if (sessionLoading) return;
    
    if (!session) {
      navigate('/auth');
      return;
    }
    
    if (session.role !== 'admin') {
      navigate(session.role === 'manager' ? '/manager' : '/feed');
      return;
    }
  }, [session, sessionLoading, navigate]);

  useEffect(() => {
    if (currentBuildingId) {
      loadBookings();
    }
  }, [currentBuildingId]);

  const loadBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('amenity_bookings')
        .select('*, amenities(name)')
        .eq('building_id', currentBuildingId)
        .order('starts_at', { ascending: false });

      if (error) throw error;
      
      // Fetch user profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(b => b.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email, name')
          .in('id', userIds);
        
        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        const enrichedBookings = data.map(booking => ({
          ...booking,
          profiles: profilesMap.get(booking.user_id) || { email: 'Unknown', name: null }
        }));
        setBookings(enrichedBookings);
      }
    } catch (error: any) {
      toast({
        title: "Error loading bookings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('amenity_bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `Booking ${newStatus === 'cancelled' ? 'cancelled' : 'confirmed'}`,
      });

      // Trigger notification processing for waitlist if cancelled
      if (newStatus === 'cancelled') {
        try {
          await supabase.functions.invoke('process-waitlist-notifications');
        } catch (notifError) {
          console.error('Error triggering notifications:', notifError);
        }
      }

      loadBookings();
    } catch (error: any) {
      toast({
        title: "Error updating booking",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!currentBuildingId) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>No Building Selected</CardTitle>
              <CardDescription>
                Please select a building to view bookings
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">All Bookings</h1>
          <p className="text-muted-foreground mt-1">
            Manage all amenity bookings for this building
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading bookings...</div>
        ) : (
          <div className="space-y-4">
            {bookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No bookings yet</p>
                </CardContent>
              </Card>
            ) : (
              bookings.map((booking) => (
                <Card key={booking.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle>{booking.amenities.name}</CardTitle>
                        <CardDescription className="mt-2 space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>{booking.profiles.name || booking.profiles.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{format(new Date(booking.starts_at), 'PPP')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>
                              {format(new Date(booking.starts_at), 'HH:mm')} - {format(new Date(booking.ends_at), 'HH:mm')}
                            </span>
                          </div>
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-3 py-1 rounded-full ${
                          booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                          booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {booking.status}
                        </span>
                        {booking.status === 'confirmed' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleUpdateStatus(booking.id, 'cancelled')}
                            title="Cancel booking"
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
