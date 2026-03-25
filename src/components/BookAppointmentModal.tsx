import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useBookings } from "@/hooks/useBookings";
import { useNavigate } from "react-router-dom";

const timeSlots = [
  "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM",
  "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM",
];

interface BookAppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessName: string;
  businessLogo: string;
  businessId?: string;
}

const BookAppointmentModal = ({ open, onOpenChange, businessName, businessLogo, businessId = "" }: BookAppointmentModalProps) => {
  const [mode, setMode] = useState<"instant" | "scheduled">("instant");
  const [date, setDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const { user } = useAuth();
  const { createBooking } = useBookings();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (mode === "scheduled" && (!date || !selectedTime)) {
      toast({ title: "Please select date and time", variant: "destructive" });
      return;
    }
    if (!name || !phone) {
      toast({ title: "Please fill name and phone", variant: "destructive" });
      return;
    }

    if (!user) {
      toast({ title: "Please sign in to book", variant: "destructive" });
      navigate("/auth");
      return;
    }

    try {
      await createBooking.mutateAsync({
        business_id: businessId,
        business_name: businessName,
        mode,
        booking_date: date ? format(date, "yyyy-MM-dd") : undefined,
        booking_time: selectedTime,
        customer_name: name,
        customer_phone: phone,
        notes: notes || undefined,
      });

      toast({
        title: mode === "instant" ? "Instant Booking Confirmed! ⚡" : "Appointment Booked! ✅",
        description: mode === "instant"
          ? `${businessName} — Estimated arrival: 30-45 mins`
          : `${businessName} on ${format(date!, "PPP")} at ${selectedTime}`,
      });
      onOpenChange(false);
      setDate(undefined);
      setSelectedTime(undefined);
      setName("");
      setPhone("");
      setNotes("");
    } catch (err: any) {
      toast({ title: "Booking failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0 rounded-2xl">
        <DialogHeader className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-lg">
              {businessLogo}
            </div>
            <div>
              <DialogTitle className="text-base">Book Appointment</DialogTitle>
              <p className="text-xs text-muted-foreground">{businessName}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-5 pb-5">
          {/* Mode Toggle */}
          <div className="flex gap-2 rounded-xl bg-muted p-1">
            <button
              onClick={() => setMode("instant")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all",
                mode === "instant" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              <Zap className="h-3.5 w-3.5" /> Book Now
            </button>
            <button
              onClick={() => setMode("scheduled")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all",
                mode === "scheduled" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              <CalendarIcon className="h-3.5 w-3.5" /> Schedule Later
            </button>
          </div>

          {mode === "instant" ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center space-y-2">
              <Zap className="h-8 w-8 text-primary mx-auto" />
              <h3 className="text-sm font-bold text-foreground">Instant Service</h3>
              <p className="text-xs text-muted-foreground">A professional will be assigned and arrive at your location shortly.</p>
              <div className="flex items-center justify-center gap-2 text-xs font-medium text-primary">
                <Clock className="h-3.5 w-3.5" />
                Estimated arrival: 30–45 minutes
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">Select Date *</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal rounded-xl", !date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={date} onSelect={setDate} disabled={(d) => d < new Date()} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                  <Clock className="mr-1 inline h-3.5 w-3.5" /> Select Time *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {timeSlots.map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelectedTime(t)}
                      className={`rounded-lg px-2 py-2 text-[11px] font-medium transition-all ${
                        selectedTime === t
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "border border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">Your Name *</label>
              <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">Phone *</label>
              <Input placeholder="+91 98765..." value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-xl" />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">Notes (optional)</label>
            <Textarea placeholder="Any special requests..." value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-xl resize-none" rows={2} />
          </div>

          <Button onClick={handleSubmit} className="w-full rounded-xl font-semibold gap-2" disabled={createBooking.isPending}>
            {createBooking.isPending ? "Booking..." : (
              <>
                {mode === "instant" && <Zap className="h-4 w-4" />}
                {mode === "instant" ? "Confirm Instant Booking" : "Confirm Appointment"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookAppointmentModal;
