import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBuilding } from "@/contexts/BuildingContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Clock, MapPin, Users, Calendar as CalendarIcon, X } from "lucide-react";
import { format, addMinutes, parse, setHours, setMinutes, isAfter, isBefore, isEqual } from "date-fns";

interface Amenity {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  rules: string | null;
  capacity: number | null;
  open_time: string | null;
  close_time: string | null;
  slot_minutes: number;
  building_id: string;
}

interface Booking {
  id: string;
  amenity_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
  starts_at: Date;
  ends_at: Date;
}

interface WaitlistEntry {
  id: string;
  amenity_id: string;
  requested_date: string;
  requested_time_start: string;
  requested_time_end: string;
  status: string;
  created_at: string;
}

export default function AmenitiesBooking() {
  const { profile } = useAuth();
  const { currentBuildingId } = useBuilding();
  const { toast } = useToast();
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [myWaitlist, setMyWaitlist] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSlotForWaitlist, setSelectedSlotForWaitlist] = useState<TimeSlot | null>(null);

  useEffect(() => {
    if (currentBuildingId) {
      loadAmenities();
      loadMyBookings();
      loadMyWaitlist();
    }
  }, [currentBuildingId]);

  useEffect(() => {
    if (selectedAmenity && selectedDate) {
      generateTimeSlots();
    }
  }, [selectedAmenity, selectedDate, existingBookings]);

  const loadAmenities = async () => {
    try {
      const { data, error } = await supabase
        .from('amenities')
        .select('*')
        .eq('building_id', currentBuildingId)
        .order('name');

      if (error) throw error;
      setAmenities(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading amenities",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMyBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('amenity_bookings')
        .select('*')
        .eq('user_id', profile?.id)
        .eq('status', 'confirmed')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at');

      if (error) throw error;
      setMyBookings(data || []);
    } catch (error: any) {
      console.error('Error loading bookings:', error);
    }
  };

  const loadMyWaitlist = async () => {
    try {
      const { data, error } = await supabase
        .from('amenity_waitlist')
        .select('*')
        .eq('user_id', profile?.id)
        .eq('status', 'waiting')
        .gte('requested_date', new Date().toISOString().split('T')[0])
        .order('created_at');

      if (error) throw error;
      setMyWaitlist(data || []);
    } catch (error: any) {
      console.error('Error loading waitlist:', error);
    }
  };

  const loadExistingBookings = async (amenityId: string, date: Date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    try {
      const { data, error } = await supabase
        .from('amenity_bookings')
        .select('*')
        .eq('amenity_id', amenityId)
        .eq('status', 'confirmed')
        .gte('starts_at', startOfDay.toISOString())
        .lte('starts_at', endOfDay.toISOString());

      if (error) throw error;
      setExistingBookings(data || []);
    } catch (error: any) {
      console.error('Error loading existing bookings:', error);
    }
  };

  const generateTimeSlots = () => {
    if (!selectedAmenity || !selectedDate) return;

    const slots: TimeSlot[] = [];
    const openTime = selectedAmenity.open_time || "09:00";
    const closeTime = selectedAmenity.close_time || "18:00";
    const slotDuration = selectedAmenity.slot_minutes;

    const [openHour, openMinute] = openTime.split(':').map(Number);
    const [closeHour, closeMinute] = closeTime.split(':').map(Number);

    let currentTime = setMinutes(setHours(new Date(selectedDate), openHour), openMinute);
    const endTime = setMinutes(setHours(new Date(selectedDate), closeHour), closeMinute);

    while (isBefore(currentTime, endTime)) {
      const slotEnd = addMinutes(currentTime, slotDuration);
      
      if (isAfter(slotEnd, endTime)) break;

      // Check if this slot overlaps with any existing bookings
      const isBooked = existingBookings.some(booking => {
        const bookingStart = new Date(booking.starts_at);
        const bookingEnd = new Date(booking.ends_at);
        
        return (
          (currentTime >= bookingStart && currentTime < bookingEnd) ||
          (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
          (currentTime <= bookingStart && slotEnd >= bookingEnd)
        );
      });

      slots.push({
        time: format(currentTime, 'HH:mm'),
        available: !isBooked,
        starts_at: new Date(currentTime),
        ends_at: new Date(slotEnd),
      });

      currentTime = slotEnd;
    }

    setTimeSlots(slots);
  };

  const handleSelectAmenity = (amenity: Amenity) => {
    setSelectedAmenity(amenity);
    setSelectedDate(new Date());
    loadExistingBookings(amenity.id, new Date());
  };

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date && selectedAmenity) {
      loadExistingBookings(selectedAmenity.id, date);
    }
  };

  const handleBookSlot = async (slot: TimeSlot) => {
    if (!selectedAmenity || !profile?.id || !currentBuildingId) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('amenity_bookings')
        .insert({
          amenity_id: selectedAmenity.id,
          user_id: profile.id,
          building_id: currentBuildingId,
          starts_at: slot.starts_at.toISOString(),
          ends_at: slot.ends_at.toISOString(),
          status: 'confirmed',
        });

      if (error) throw error;

      toast({
        title: "Booking confirmed",
        description: `${selectedAmenity.name} booked for ${slot.time}`,
      });

      setSelectedAmenity(null);
      loadMyBookings();
      if (selectedDate) {
        loadExistingBookings(selectedAmenity.id, selectedDate);
      }
    } catch (error: any) {
      toast({
        title: "Booking failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinWaitlist = async (slot: TimeSlot) => {
    if (!selectedAmenity || !profile?.id || !currentBuildingId || !selectedDate) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('amenity_waitlist')
        .insert({
          amenity_id: selectedAmenity.id,
          user_id: profile.id,
          building_id: currentBuildingId,
          requested_date: selectedDate.toISOString().split('T')[0],
          requested_time_start: slot.time,
          requested_time_end: format(slot.ends_at, 'HH:mm'),
          status: 'waiting',
        });

      if (error) throw error;

      toast({
        title: "Added to waitlist",
        description: "You'll be notified when this slot becomes available",
      });

      setSelectedSlotForWaitlist(null);
      loadMyWaitlist();
    } catch (error: any) {
      toast({
        title: "Failed to join waitlist",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveFromWaitlist = async (waitlistId: string) => {
    try {
      const { error } = await supabase
        .from('amenity_waitlist')
        .delete()
        .eq('id', waitlistId);

      if (error) throw error;

      toast({
        title: "Removed from waitlist",
        description: "You've been removed from the waitlist",
      });

      loadMyWaitlist();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('amenity_bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Booking cancelled",
        description: "Your booking has been cancelled",
      });

      // Trigger notification processing for waitlist
      try {
        await supabase.functions.invoke('process-waitlist-notifications');
      } catch (notifError) {
        console.error('Error triggering notifications:', notifError);
      }

      loadMyBookings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading amenities...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Amenities Grid */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Available Amenities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {amenities.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No amenities available yet</p>
              </CardContent>
            </Card>
          ) : (
            amenities.map((amenity) => (
              <Card key={amenity.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                {amenity.image_url && (
                  <div className="h-48 overflow-hidden rounded-t-lg">
                    <img
                      src={amenity.image_url}
                      alt={amenity.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{amenity.name}</CardTitle>
                  <CardDescription>{amenity.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 mr-2" />
                    {amenity.open_time} - {amenity.close_time}
                  </div>
                  {amenity.capacity && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="h-4 w-4 mr-2" />
                      Capacity: {amenity.capacity}
                    </div>
                  )}
                  <Button
                    className="w-full mt-4"
                    onClick={() => handleSelectAmenity(amenity)}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Book Now
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* My Upcoming Bookings */}
      {myBookings.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">My Upcoming Bookings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myBookings.map((booking) => {
              const amenity = amenities.find(a => a.id === booking.amenity_id);
              return (
                <Card key={booking.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {amenity?.name || 'Unknown Amenity'}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCancelBooking(booking.id)}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {format(new Date(booking.starts_at), 'PPP')}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="h-4 w-4 mr-2" />
                        {format(new Date(booking.starts_at), 'HH:mm')} - {format(new Date(booking.ends_at), 'HH:mm')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Booking Dialog */}
      <Dialog open={!!selectedAmenity} onOpenChange={(open) => !open && setSelectedAmenity(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Book {selectedAmenity?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Select Date</h3>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateChange}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                className="rounded-md border"
              />
              {selectedAmenity?.rules && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <h4 className="font-semibold text-sm mb-1">Rules</h4>
                  <p className="text-sm text-muted-foreground">{selectedAmenity.rules}</p>
                </div>
              )}
            </div>
            <div>
              <h3 className="font-semibold mb-2">Available Time Slots</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {timeSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Select a date to see available slots</p>
                ) : (
                  timeSlots.map((slot, index) => (
                    <div key={index} className="flex gap-2">
                      <Button
                        variant={slot.available ? "outline" : "ghost"}
                        className="flex-1 justify-between"
                        disabled={!slot.available || submitting}
                        onClick={() => slot.available && handleBookSlot(slot)}
                      >
                        <span>{slot.time} - {format(slot.ends_at, 'HH:mm')}</span>
                        <span className={slot.available ? "text-green-600" : "text-red-600"}>
                          {slot.available ? "Available" : "Booked"}
                        </span>
                      </Button>
                      {!slot.available && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={submitting}
                          onClick={() => handleJoinWaitlist(slot)}
                          title="Join waitlist for this slot"
                        >
                          Join Waitlist
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* My Waitlist */}
      {myWaitlist.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">My Waitlist</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myWaitlist.map((entry) => {
              const amenity = amenities.find(a => a.id === entry.amenity_id);
              return (
                <Card key={entry.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {amenity?.name || 'Unknown Amenity'}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFromWaitlist(entry.id)}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {format(new Date(entry.requested_date), 'PPP')}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="h-4 w-4 mr-2" />
                        {entry.requested_time_start} - {entry.requested_time_end}
                      </div>
                      <div className="mt-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs inline-block">
                        Waiting
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
