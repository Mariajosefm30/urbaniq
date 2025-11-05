import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WaitlistNotification {
  id: string;
  waitlist_id: string;
  user_id: string;
  amenity_id: string;
  booking_id: string;
  processed: boolean;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing waitlist notifications...");

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get unprocessed notifications
    const { data: notifications, error: notifError } = await supabase
      .from('waitlist_notifications')
      .select(`
        *,
        amenity_waitlist!inner(
          requested_date,
          requested_time_start,
          requested_time_end
        ),
        profiles!inner(
          email,
          name
        ),
        amenities!inner(
          name
        ),
        amenity_bookings!inner(
          starts_at,
          ends_at
        )
      `)
      .eq('processed', false)
      .limit(10);

    if (notifError) {
      console.error("Error fetching notifications:", notifError);
      throw notifError;
    }

    if (!notifications || notifications.length === 0) {
      console.log("No unprocessed notifications found");
      return new Response(
        JSON.stringify({ message: "No notifications to process" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${notifications.length} notifications to process`);

    const results = [];
    for (const notif of notifications) {
      try {
        const userEmail = notif.profiles.email;
        const userName = notif.profiles.name || userEmail;
        const amenityName = notif.amenities.name;
        const bookingStart = new Date(notif.amenity_bookings.starts_at);
        const bookingEnd = new Date(notif.amenity_bookings.ends_at);
        const appUrl = Deno.env.get("APP_URL") || "https://your-app.lovable.app";

        // Format date and time
        const dateStr = bookingStart.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        const timeStr = `${bookingStart.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        })} - ${bookingEnd.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        })}`;

        // Send email using Resend
        const emailResult = await resend.emails.send({
          from: Deno.env.get("FROM_EMAIL") || "Amenities <onboarding@resend.dev>",
          to: [userEmail],
          subject: `Amenity Available: ${amenityName}`,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                  .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                  .highlight { background-color: #EEF2FF; padding: 15px; border-left: 4px solid #4F46E5; margin: 20px 0; }
                  .button { display: inline-block; background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
                  .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>Great News, ${userName}!</h1>
                  </div>
                  <div class="content">
                    <p>A time slot you were waiting for is now available!</p>
                    
                    <div class="highlight">
                      <h3 style="margin-top: 0;">📅 Available Booking</h3>
                      <p><strong>Amenity:</strong> ${amenityName}</p>
                      <p><strong>Date:</strong> ${dateStr}</p>
                      <p><strong>Time:</strong> ${timeStr}</p>
                    </div>

                    <p>This slot just became available. Book it now before someone else does!</p>
                    
                    <a href="${appUrl}/feed" class="button">Book Now</a>
                    
                    <p style="margin-top: 30px; font-size: 14px; color: #666;">
                      <em>Note: This is a first-come, first-served notification. The slot may be booked by the time you view this email.</em>
                    </p>
                  </div>
                  <div class="footer">
                    <p>You received this email because you joined the waitlist for this amenity.</p>
                  </div>
                </div>
              </body>
            </html>
          `,
        });

        console.log(`Email sent to ${userEmail}:`, emailResult);

        // Mark notification as processed
        const { error: updateError } = await supabase
          .from('waitlist_notifications')
          .update({ processed: true })
          .eq('id', notif.id);

        if (updateError) {
          console.error("Error updating notification:", updateError);
        }

        results.push({
          notification_id: notif.id,
          email: userEmail,
          success: true,
          email_id: emailResult.data?.id
        });

      } catch (error: any) {
        console.error(`Error processing notification ${notif.id}:`, error);
        results.push({
          notification_id: notif.id,
          success: false,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: "Notifications processed",
        processed: results.length,
        results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {
    console.error("Error in process-waitlist-notifications:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});