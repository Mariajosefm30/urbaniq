import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBuilding } from "@/contexts/BuildingContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, User, X } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfDay, endOfDay, isToday, isThisWeek } from "date-fns";

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

export default function ManagerBookings() {
  const { profile } = useAuth();
  const { currentBuildingId } = useBuilding();
  const { toast } = useToast();
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [weekBookings, setWeekBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentBuildingId) {
      loadBookings();
    }
  }, [currentBuildingId]);

  const loadBookings = async () => {
    try {
      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      const weekStart = startOfWeek(now);
      const weekEnd = endOfWeek(now);

      // Load today's bookings
      const { data: todayData, error: todayError } = await supabase
        .from('amenity_bookings')
        .select(`
          *,
          amenities(name),
          profiles(email, name)
        `)
        .eq('building_id', currentBuildingId)
        .eq('status', 'confirmed')
        .gte('starts_at', todayStart.toISOString())
        .lte('starts_at', todayEnd.toISOString())
        .order('starts_at');

      if (todayError) throw todayError;
      setTodayBookings(todayData || []);

      // Load this week's bookings
      const { data: weekData, error: weekError } = await supabase
        .from('amenity_bookings')
        .select(`
          *,
          amenities(name),
          profiles(email, name)
        `)
        .eq('building_id', currentBuildingId)
        .eq('status', 'confirmed')
        .gte('starts_at', weekStart.toISOString())
        .lte('starts_at', weekEnd.toISOString())
        .order('starts_at');

      if (weekError) throw weekError;
      setWeekBookings(weekData || []);
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

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;

    try {
      const { error } = await supabase
        .from('amenity_bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Booking cancelled",
        description: "The booking has been cancelled",
      });

      loadBookings();
    } catch (error: any) {
      toast({
        title: "Error cancelling booking",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const renderBookingCard = (booking: Booking) => (
    <Card key={booking.id}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{booking.amenities.name}</CardTitle>
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleCancelBooking(booking.id)}
            title="Cancel booking"
          >
            <X className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
    </Card>
  );

  if (loading) {
    return <div className="text-center py-12">Loading bookings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Amenity Bookings</h2>
        <p className="text-muted-foreground">
          View and manage all amenity bookings for your building
        </p>
      </div>

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">
            Today ({todayBookings.length})
          </TabsTrigger>
          <TabsTrigger value="week">
            This Week ({weekBookings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4 mt-4">
          {todayBookings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No bookings today</p>
              </CardContent>
            </Card>
          ) : (
            todayBookings.map(renderBookingCard)
          )}
        </TabsContent>

        <TabsContent value="week" className="space-y-4 mt-4">
          {weekBookings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No bookings this week</p>
              </CardContent>
            </Card>
          ) : (
            weekBookings.map(renderBookingCard)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
