import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, Calendar, MapPin, Clock, Users, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCreateEvent } from "@/hooks/useEvents";
import { useBusinessCards } from "@/hooks/useBusinessCards";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const eventCategories = ["Awards", "Conference", "Networking", "Workshop", "Seminar", "Exhibition", "Concert", "Sports", "Festival", "Other"];

const EventCreate = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedCardId = searchParams.get("cardId") || "";
  const { user } = useAuth();
  const { cards } = useBusinessCards();
  const createEvent = useCreateEvent();

  const defaultCardId = preselectedCardId || (cards.length === 1 ? cards[0].id : "");
  const defaultOrganizer = defaultCardId ? cards.find(c => c.id === defaultCardId)?.full_name || "" : "";

  const [form, setForm] = useState({
    title: "",
    description: "",
    venue: "",
    date: "",
    time: "",
    category: "",
    is_free: true,
    price: 0,
    max_attendees: "",
    business_card_id: defaultCardId,
    organizer_name: defaultOrganizer,
  });

  const update = (field: string, value: any) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async () => {
    if (!user) { toast.error("Please sign in"); navigate("/auth"); return; }
    if (!form.title || !form.venue || !form.date || !form.time || !form.category) {
      toast.error("Please fill all required fields");
      return;
    }
    await createEvent.mutateAsync({
      title: form.title,
      description: form.description || undefined,
      venue: form.venue,
      date: form.date,
      time: form.time,
      category: form.category,
      is_free: form.is_free,
      price: form.is_free ? 0 : form.price,
      max_attendees: form.max_attendees ? parseInt(form.max_attendees) : undefined,
      business_card_id: form.business_card_id || undefined,
      organizer_name: form.organizer_name || undefined,
    });
    navigate("/events");
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card px-4 py-4">
        <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5 text-foreground" /></button>
        <h1 className="text-lg font-bold text-foreground">Create Event</h1>
      </div>

      <div className="px-4 py-5 space-y-4">
        {cards.length > 0 && (
          <div className="space-y-2">
            <Label>Link to Business Card</Label>
            <Select value={form.business_card_id} onValueChange={(v) => update("business_card_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select a card (optional)" /></SelectTrigger>
              <SelectContent>
                {cards.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name} {c.company_name ? `— ${c.company_name}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Event Title *</Label>
          <Input placeholder="e.g. Digital Marketing Summit 2026" value={form.title} onChange={(e) => update("title", e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea placeholder="What's this event about?" value={form.description} onChange={(e) => update("description", e.target.value)} rows={3} />
        </div>

        <div className="space-y-2">
          <Label>Category *</Label>
          <Select value={form.category} onValueChange={(v) => update("category", v)}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {eventCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Date *</Label>
            <Input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Time *</Label>
            <Input type="time" value={form.time} onChange={(e) => update("time", e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Venue *</Label>
          <Input placeholder="e.g. Jio Convention Centre, Mumbai" value={form.venue} onChange={(e) => update("venue", e.target.value)} />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div>
            <p className="text-sm font-medium text-foreground">Free Event</p>
            <p className="text-xs text-muted-foreground">Toggle off to set a ticket price</p>
          </div>
          <Switch checked={form.is_free} onCheckedChange={(v) => update("is_free", v)} />
        </div>

        {!form.is_free && (
          <div className="space-y-2">
            <Label className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> Ticket Price (₹)</Label>
            <Input type="number" placeholder="500" value={form.price || ""} onChange={(e) => update("price", parseInt(e.target.value) || 0)} />
          </div>
        )}

        <div className="space-y-2">
          <Label>Organizer Name</Label>
          <Input placeholder="e.g. John Doe or Company Name" value={form.organizer_name} onChange={(e) => update("organizer_name", e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Max Attendees</Label>
          <Input type="number" placeholder="Leave empty for unlimited" value={form.max_attendees} onChange={(e) => update("max_attendees", e.target.value)} />
        </div>
      </div>

      <div className="fixed bottom-20 left-0 right-0 border-t border-border bg-card px-4 py-3">
        <Button className="w-full gap-2 rounded-xl py-6" onClick={handleSubmit} disabled={createEvent.isPending}>
          {createEvent.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : "Create Event"}
        </Button>
      </div>
    </div>
  );
};

export default EventCreate;
