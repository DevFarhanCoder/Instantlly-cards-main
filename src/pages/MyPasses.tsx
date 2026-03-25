import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import { CalendarDays, MapPin, Clock, CheckCircle2, LogOut, Ticket } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

const MyPasses = () => {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();

  const { data: passes, isLoading } = useQuery({
    queryKey: ["my-passes", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const { data, error } = await supabase
        .from("event_registrations")
        .select("*, events(*)")
        .eq("email", user.email)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.email,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-lg px-4 py-20 text-center space-y-6">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10">
            <Ticket className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Your Event Passes</h1>
          <p className="text-sm text-muted-foreground">Sign in to view your registered events and QR passes</p>
          <Button onClick={() => navigate("/auth")} className="px-8">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-primary-foreground">My Passes</h1>
          <p className="text-xs text-primary-foreground/70">{user.email}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut} className="text-primary-foreground hover:bg-primary-foreground/10">
          <LogOut className="h-4 w-4 mr-1" /> Sign Out
        </Button>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-4 pb-24">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : !passes?.length ? (
          <div className="text-center py-10 space-y-3">
            <Ticket className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground">No event passes yet</p>
            <Button variant="outline" onClick={() => navigate("/events")}>
              Browse Events
            </Button>
          </div>
        ) : (
          passes.map((pass: any, i: number) => (
            <motion.div
              key={pass.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Event info */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="font-bold text-foreground">{pass.events?.title}</h3>
                      {pass.is_verified ? (
                        <Badge className="bg-success/10 text-success border-success/30">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {pass.events?.date && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {format(new Date(pass.events.date), "MMM d, yyyy")}
                        </span>
                      )}
                      {pass.events?.time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {pass.events.time}
                        </span>
                      )}
                      {pass.events?.venue && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {pass.events.venue}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="border-t border-dashed border-border bg-muted/30 p-4 flex flex-col items-center gap-2">
                    <QRCodeSVG value={pass.qr_code} size={140} level="H" />
                    <p className="text-[10px] text-muted-foreground font-mono break-all text-center max-w-[200px]">
                      {pass.qr_code}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyPasses;
