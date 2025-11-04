import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBuilding } from "@/contexts/BuildingContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar, Clock, MapPin, Users } from "lucide-react";
import { format } from "date-fns";

interface Amenity {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  capacity: number | null;
  available: boolean | null;
  image_url: string | null;
}

interface Booking {
  id: string;
  amenity_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  amenities: Amenity;
}

export default function Amenities() {
  const { profile } = useAuth();
  const { currentBuildingId } = useBuilding();
  const { toast } = useToast();
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isManager = profile?.role === 'manager';

  useEffect(() => {
    if (currentBuildingId) {
      loadAmenities();
      loadBookings();
    }
  }, [currentBuildingId]);

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

  const loadBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('amenity_bookings')
        .select('*, amenities(*)')
        .eq('user_id', profile?.id)
        .order('booking_date', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error: any) {
      console.error('Error loading bookings:', error);
    }
  };

  const handleBookAmenity = async () => {
    if (!selectedAmenity || !bookingDate || !startTime || !endTime) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('amenity_bookings')
        .insert({
          amenity_id: selectedAmenity.id,
          user_id: profile?.id,
          booking_date: bookingDate,
          start_time: startTime,
          end_time: endTime,
          notes: notes,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Booking created",
        description: "Your amenity booking has been submitted",
      });

      setSelectedAmenity(null);
      setBookingDate("");
      setStartTime("");
      setEndTime("");
      setNotes("");
      loadBookings();
    } catch (error: any) {
      toast({
        title: "Error creating booking",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
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
                Please select a building to view amenities
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Building Amenities</h1>
            <p className="text-muted-foreground mt-1">
              Book and manage building amenities
            </p>
          </div>
          {isManager && (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Amenity
            </Button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">Loading amenities...</div>
        ) : (
          <>
            {/* Amenities Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {amenities.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No amenities available yet</p>
                  </CardContent>
                </Card>
              ) : (
                amenities.map((amenity) => (
                  <Card key={amenity.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {amenity.name}
                        {amenity.available ? (
                          <span className="text-xs font-normal text-green-600 bg-green-100 px-2 py-1 rounded">
                            Available
                          </span>
                        ) : (
                          <span className="text-xs font-normal text-red-600 bg-red-100 px-2 py-1 rounded">
                            Unavailable
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription>{amenity.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {amenity.location && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 mr-2" />
                          {amenity.location}
                        </div>
                      )}
                      {amenity.capacity && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Users className="h-4 w-4 mr-2" />
                          Capacity: {amenity.capacity}
                        </div>
                      )}
                      {!isManager && amenity.available && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              className="w-full mt-4"
                              onClick={() => setSelectedAmenity(amenity)}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              Book Now
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Book {amenity.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="date">Date</Label>
                                <Input
                                  id="date"
                                  type="date"
                                  value={bookingDate}
                                  onChange={(e) => setBookingDate(e.target.value)}
                                  min={format(new Date(), 'yyyy-MM-dd')}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="start">Start Time</Label>
                                  <Input
                                    id="start"
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="end">End Time</Label>
                                  <Input
                                    id="end"
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                  />
                                </div>
                              </div>
                              <div>
                                <Label htmlFor="notes">Notes (Optional)</Label>
                                <Textarea
                                  id="notes"
                                  value={notes}
                                  onChange={(e) => setNotes(e.target.value)}
                                  placeholder="Any special requirements?"
                                />
                              </div>
                              <Button
                                onClick={handleBookAmenity}
                                disabled={submitting}
                                className="w-full"
                              >
                                {submitting ? "Booking..." : "Confirm Booking"}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* My Bookings */}
            {!isManager && bookings.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">My Bookings</h2>
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <Card key={booking.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          {booking.amenities.name}
                          <span className={`text-xs font-normal px-2 py-1 rounded ${
                            booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {booking.status}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center text-muted-foreground">
                            <Calendar className="h-4 w-4 mr-2" />
                            {format(new Date(booking.booking_date), 'PPP')}
                          </div>
                          <div className="flex items-center text-muted-foreground">
                            <Clock className="h-4 w-4 mr-2" />
                            {booking.start_time} - {booking.end_time}
                          </div>
                          {booking.notes && (
                            <p className="text-muted-foreground mt-2">{booking.notes}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
