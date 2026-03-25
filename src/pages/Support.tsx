import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, MessageCircle, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const faqItems = [
  { q: "How do I book a service?", a: "Browse businesses, tap on one, and use the 'Book Appointment' button." },
  { q: "How do referral rewards work?", a: "Share your code from Refer & Earn. You get ₹50 when your friend signs up." },
  { q: "Can I cancel a booking?", a: "Go to Track Bookings and contact the business directly to cancel." },
  { q: "How do vouchers work?", a: "Buy vouchers at discounted prices and redeem them at the business." },
];

const statusConfig: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "text-blue-600 bg-blue-50" },
  in_progress: { label: "In Progress", color: "text-yellow-600 bg-yellow-50" },
  resolved: { label: "Resolved", color: "text-green-600 bg-green-50" },
  closed: { label: "Closed", color: "text-muted-foreground bg-muted" },
};

const Support = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const { data: tickets = [], refetch } = useQuery({
    queryKey: ["support-tickets", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please sign in first");
      navigate("/auth");
      return;
    }
    if (!subject.trim()) {
      toast.error("Please enter a subject");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("support_tickets").insert({
      user_id: user.id,
      subject: subject.trim(),
      description: description.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Failed to submit ticket");
    } else {
      toast.success("Support ticket submitted! We'll get back to you soon.");
      setSubject("");
      setDescription("");
      refetch();
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card px-4 py-4">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Help & Support</h1>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* FAQ */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">❓ Frequently Asked</h3>
          <div className="space-y-2">
            {faqItems.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                <button
                  className="w-full text-left px-4 py-3 text-sm font-medium text-foreground"
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                >
                  {faq.q}
                </button>
                {expandedFaq === i && (
                  <div className="px-4 pb-3 text-xs text-muted-foreground">{faq.a}</div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Submit Ticket */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">📩 Raise a Ticket</h3>
          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <Input
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="rounded-xl"
            />
            <Textarea
              placeholder="Describe your issue..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="rounded-xl resize-none"
            />
            <Button
              className="w-full rounded-xl"
              onClick={handleSubmit}
              disabled={submitting || !subject.trim()}
            >
              <Send className="h-4 w-4 mr-2" />
              {submitting ? "Submitting..." : "Submit Ticket"}
            </Button>
          </div>
        </div>

        {/* Past Tickets */}
        {tickets.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">🎫 Your Tickets</h3>
            <div className="space-y-2">
              {tickets.map((ticket: any, i: number) => {
                const status = statusConfig[ticket.status] || statusConfig.open;
                return (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-xl border border-border bg-card p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{ticket.subject}</p>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold", status.color)}>
                        {status.label}
                      </span>
                    </div>
                    {ticket.description && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{ticket.description}</p>
                    )}
                    {ticket.admin_notes && (
                      <div className="mt-2 rounded-lg bg-primary/5 p-2 text-xs text-primary">
                        <strong>Reply:</strong> {ticket.admin_notes}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Support;
