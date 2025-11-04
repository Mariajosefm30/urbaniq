import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Building2, Users, Wrench, MapPin, QrCode, Bell, ClipboardList, UserCheck, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Landing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { session, loading } = useSession();
  const [inviteCode, setInviteCode] = useState("");
  const [demoDialogOpen, setDemoDialogOpen] = useState(false);
  const [demoFormData, setDemoFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Check if INVITE_ONLY mode is enabled (you can set this via environment or config)
  const inviteOnly = false; // Set to true to enable invite-only mode

  // Role-based redirects on page load
  useEffect(() => {
    if (loading || !user) return;

    // Email override
    if (user.email === "mfernandezmelgar@gmail.com") {
      navigate("/admin");
      return;
    }

    // Role-based redirects
    if (session?.role === "admin") {
      navigate("/admin");
    } else if (session?.role === "manager") {
      navigate("/manager");
    } else if (session?.role === "resident") {
      navigate("/feed");
    }
  }, [user, session, loading, navigate]);

  const handleGetStarted = () => {
    if (inviteOnly && inviteCode) {
      navigate(`/auth?code=${inviteCode}`);
    } else {
      navigate("/auth");
    }
  };

  const handleBookDemo = () => {
    setDemoDialogOpen(true);
  };

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Here you would typically send this to your backend
    // For now, we'll just show a success message
    setTimeout(() => {
      toast({
        title: "Demo Request Received!",
        description: "We'll contact you shortly to schedule your demo.",
      });
      setDemoDialogOpen(false);
      setDemoFormData({ name: "", email: "", company: "", message: "" });
      setSubmitting(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Demo Contact Dialog */}
      <Dialog open={demoDialogOpen} onOpenChange={setDemoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Book a Demo</DialogTitle>
            <DialogDescription>
              Fill out the form below and we'll contact you to schedule a personalized demo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDemoSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="demo-name">Name *</Label>
              <Input
                id="demo-name"
                value={demoFormData.name}
                onChange={(e) => setDemoFormData({ ...demoFormData, name: e.target.value })}
                placeholder="Your full name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="demo-email">Email *</Label>
              <Input
                id="demo-email"
                type="email"
                value={demoFormData.email}
                onChange={(e) => setDemoFormData({ ...demoFormData, email: e.target.value })}
                placeholder="your.email@company.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="demo-company">Company/Building Name</Label>
              <Input
                id="demo-company"
                value={demoFormData.company}
                onChange={(e) => setDemoFormData({ ...demoFormData, company: e.target.value })}
                placeholder="Your property or company"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="demo-message">Message</Label>
              <Textarea
                id="demo-message"
                value={demoFormData.message}
                onChange={(e) => setDemoFormData({ ...demoFormData, message: e.target.value })}
                placeholder="Tell us about your needs..."
                rows={3}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Sending..." : "Request Demo"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">PropPass</span>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/auth?mode=signin")} variant="outline">
              Sign In
            </Button>
            <Button onClick={() => navigate("/auth?mode=signup")}>
              Sign Up
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center space-y-8">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Modern Property Management Made Simple
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Track maintenance, manage guest access, and collaborate seamlessly. PropPass brings everything your building needs into one powerful platform.
          </p>
          
          {inviteOnly && (
            <div className="max-w-md mx-auto space-y-3">
              <p className="text-sm text-muted-foreground">Have an invite code?</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter invite code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8" onClick={handleGetStarted}>
              Get Started
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8" onClick={handleBookDemo}>
              Book a Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Who It's For Section */}
      <section className="container py-16 bg-muted/30">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-12">Who It's For</h2>
          <Tabs defaultValue="managers" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
              <TabsTrigger value="managers">For Buildings (Managers)</TabsTrigger>
              <TabsTrigger value="residents">For Residents</TabsTrigger>
            </TabsList>
            <TabsContent value="managers" className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Building Managers & Property Teams
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Streamline operations with centralized ticket management, automated technician suggestions, and real-time status updates. Keep residents happy and maintenance running smoothly.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>Track all maintenance requests in one dashboard</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>AI-powered technician matching based on location and ratings</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>Generate secure guest passes instantly</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="residents" className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Residents & Tenants
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Report issues quickly, track progress in real-time, and manage guest access with ease. Stay informed every step of the way with automatic notifications.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>Submit maintenance tickets in seconds</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>Get real-time updates via email and in-app notifications</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>Create QR-based guest passes valid for 24 hours</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Pillars Section */}
      <section className="container py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">Core Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <Wrench className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Maintenance Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Create, assign, and monitor maintenance tickets from start to finish. Never lose track of building issues again.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <MapPin className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Smart Technician Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Get AI-powered recommendations for nearby technicians based on Google Maps ratings and proximity to your building.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <QrCode className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Guest QR Passes</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Generate secure, time-limited QR codes for guests. All passes automatically expire after 24 hours for enhanced security.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Bell className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Real-Time Updates</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Stay informed with instant email notifications and in-app toast alerts whenever ticket status changes.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container py-16 bg-muted/30">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                <ClipboardList className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">1. Report</h3>
              <p className="text-muted-foreground">
                Residents submit maintenance tickets with details, photos, and priority level.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                <UserCheck className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">2. Assign</h3>
              <p className="text-muted-foreground">
                Managers review tickets and assign to in-house staff or recommended technicians.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">3. Resolve</h3>
              <p className="text-muted-foreground">
                Track progress, update status, and close tickets once work is complete.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mini Gallery Section */}
      <section className="container py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">See It In Action</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="aspect-video rounded-lg border bg-muted flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Tickets List View</p>
              </div>
              <p className="text-center text-sm font-medium">All Tickets Dashboard</p>
            </div>
            <div className="space-y-3">
              <div className="aspect-video rounded-lg border bg-muted flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Ticket Detail View</p>
              </div>
              <p className="text-center text-sm font-medium">Detailed Ticket Management</p>
            </div>
            <div className="space-y-3">
              <div className="aspect-video rounded-lg border bg-muted flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Guest Pass Verify</p>
              </div>
              <p className="text-center text-sm font-medium">QR Code Verification</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container py-16 bg-muted/30">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>How does PropPass help manage maintenance?</AccordionTrigger>
              <AccordionContent>
                PropPass centralizes all maintenance requests in one dashboard. Residents can submit tickets with photos and descriptions, managers can prioritize and assign work, and everyone gets real-time updates on progress. Our AI also suggests qualified technicians based on location and ratings.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger>What are guest QR passes?</AccordionTrigger>
              <AccordionContent>
                Guest passes are secure, scannable QR codes that residents can generate for visitors. Each pass includes visitor details and automatically expires after 24 hours, providing convenient access control without compromising security.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger>How does technician matching work?</AccordionTrigger>
              <AccordionContent>
                When you create a maintenance ticket, our system uses the ticket category and your building's address to search Google Maps for nearby qualified technicians. We display ratings, contact info, and locations so managers can make informed decisions quickly.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger>Can residents track their maintenance requests?</AccordionTrigger>
              <AccordionContent>
                Yes! Residents can view all their submitted tickets, see current status (open, in progress, resolved), add comments, and receive email notifications whenever there's an update. Complete transparency throughout the process.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger>Is PropPass suitable for small buildings?</AccordionTrigger>
              <AccordionContent>
                Absolutely. PropPass scales to buildings of any size. Whether you manage a small apartment complex or a large residential tower, the platform adapts to your needs. Even small properties benefit from organized ticket tracking and secure guest access.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/50">
        <div className="container py-12">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <span className="font-bold">PropPass</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Modern property management for the digital age.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="mailto:contact@proppass.com" className="text-muted-foreground hover:text-foreground transition-colors">
                    contact@proppass.com
                  </a>
                </li>
                <li>
                  <a href="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
                    Admin Portal
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} PropPass. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
