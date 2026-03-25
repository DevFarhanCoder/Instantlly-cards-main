import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Calendar, MapPin, Clock, Users, ArrowLeft, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEvent, useRegisterForEvent, EventRegistration } from "@/hooks/useEvents";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const categoryEmoji: Record<string, string> = {
  Awards: "🏆", Conference: "🎤", Networking: "🤝", Festival: "🎪",
  Wellness: "🧘", Workshop: "🔧", Music: "🎵", Sports: "⚽",
};

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: event, isLoading } = useEvent(id || "");
  const registerMutation = useRegisterForEvent();

  const [showForm, setShowForm] = useState(false);
  const [registration, setRegistration] = useState<EventRegistration | null>(null);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "" });

  const handleRegister = async () => {
    if (!form.full_name || !form.email) {
      toast({ title: "Please fill in your name and email", variant: "destructive" });
      return;
    }
    try {
      const result = await registerMutation.mutateAsync({
        event_id: id!,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone || undefined,
      });
      setRegistration(result);
      toast({ title: "🎉 Registration successful!", description: "Your QR pass is ready" });
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <span className="text-5xl mb-3">😕</span>
        <p className="text-muted-foreground">Event not found</p>
        <Button className="mt-4" onClick={() => navigate("/events")}>Back to Events</Button>
      </div>
    );
  }

  // Show QR code after registration
  if (registration) {
    return (
      <div className="min-h-screen">
        <div className="bg-primary px-4 py-4">
          <button onClick={() => navigate("/events")} className="flex items-center gap-2 text-primary-foreground">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Back to Events</span>
          </button>
        </div>
        <div className="mx-auto max-w-lg px-4 py-8">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="overflow-hidden">
              <div className="bg-success/10 p-6 text-center">
                <span className="text-5xl">🎉</span>
                <h2 className="text-xl font-bold text-foreground mt-3">You're Registered!</h2>
                <p className="text-sm text-muted-foreground mt-1">{event.title}</p>
              </div>
              <CardContent className="p-6 space-y-6">
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-2xl shadow-lg">
                    <QRCodeSVG value={registration.qr_code} size={200} level="H" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Your QR Code</p>
                  <p className="text-sm font-mono font-medium text-foreground mt-1">{registration.qr_code}</p>
                </div>
                <div className="space-y-2 rounded-xl bg-muted p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-foreground">Name:</span>
                    <span className="text-muted-foreground">{registration.full_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-foreground">Email:</span>
                    <span className="text-muted-foreground">{registration.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{event.date} • {event.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{event.venue}</span>
                  </div>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  Show this QR code at the event entrance for verification
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-primary px-4 py-4">
        <button onClick={() => navigate("/events")} className="flex items-center gap-2 text-primary-foreground">
          <ArrowLeft className="h-5 w-5" />
          <span className="font-medium">Back</span>
        </button>
      </div>

      {/* Event Hero */}
      <div className="h-48 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
        <span className="text-7xl">{categoryEmoji[event.category] || "🎉"}</span>
      </div>

      <div className="mx-auto max-w-lg px-4 -mt-6 pb-8 space-y-4">
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-primary/10 text-primary border-none text-xs">{event.category}</Badge>
                  {event.is_free ? (
                    <Badge className="bg-success/10 text-success border-none text-xs">FREE</Badge>
                  ) : (
                    <Badge className="bg-accent/10 text-accent border-none text-xs font-bold">₹{event.price}</Badge>
                  )}
                </div>
                <h1 className="text-xl font-bold text-foreground">{event.title}</h1>
              </div>
            </div>

            {event.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{event.description}</p>
            )}

            <div className="space-y-2.5 rounded-xl bg-muted p-4">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-foreground">{event.date}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-foreground">{event.time}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-foreground">{event.venue}</span>
              </div>
              {event.max_attendees && (
                <div className="flex items-center gap-3 text-sm">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-foreground">{event.max_attendees} seats</span>
                </div>
              )}
              {event.organizer_name && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">Organized by</span>
                  <span className="font-medium text-foreground">{event.organizer_name}</span>
                </div>
              )}
            </div>

            {!showForm ? (
              <Button className="w-full font-semibold" size="lg" onClick={() => setShowForm(true)}>
                Register Now →
              </Button>
            ) : (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <h3 className="font-semibold text-foreground">Registration Details</h3>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter your full name"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (Optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <Button
                  className="w-full font-semibold"
                  size="lg"
                  onClick={handleRegister}
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? "Registering..." : "Confirm Registration 🎟️"}
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EventDetail;
