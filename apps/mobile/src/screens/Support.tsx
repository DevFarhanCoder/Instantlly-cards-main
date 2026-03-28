import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ArrowLeft, Send } from "lucide-react-native";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { useAuth } from "../hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { toast } from "../lib/toast";

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
  const navigation = useNavigation<any>();
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
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please sign in first");
      navigation.navigate("Auth");
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
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card px-4 py-4 flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#111827" />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">Help & Support</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 260 }} className="px-4 py-4 space-y-6">
        <View>
          <Text className="text-sm font-semibold text-foreground mb-3">❓ Frequently Asked</Text>
          <View className="space-y-2">
            {faqItems.map((faq, i) => (
              <View key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                <Pressable
                  onPress={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  className="px-4 py-3"
                >
                  <Text className="text-sm font-medium text-foreground">{faq.q}</Text>
                </Pressable>
                {expandedFaq === i && (
                  <View className="px-4 pb-3">
                    <Text className="text-xs text-muted-foreground">{faq.a}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        <View>
          <Text className="text-sm font-semibold text-foreground mb-3">📩 Raise a Ticket</Text>
          <View className="space-y-3 rounded-xl border border-border bg-card p-4">
            <Input
              placeholder="Subject"
              value={subject}
              onChangeText={setSubject}
              className="rounded-xl"
            />
            <Textarea
              placeholder="Describe your issue..."
              value={description}
              onChangeText={setDescription}
              className="rounded-xl"
            />
            <Button
              className="w-full rounded-xl"
              onPress={handleSubmit}
              disabled={submitting || !subject.trim()}
            >
              <Send size={16} color="#ffffff" />
              {submitting ? "Submitting..." : "Submit Ticket"}
            </Button>
          </View>
        </View>

        {tickets.length > 0 && (
          <View>
            <Text className="text-sm font-semibold text-foreground mb-3">🎫 Your Tickets</Text>
            <View className="space-y-2">
              {tickets.map((ticket: any) => {
                const status = statusConfig[ticket.status] || statusConfig.open;
                return (
                  <View key={ticket.id} className="rounded-xl border border-border bg-card p-3">
                    <View className="flex-row items-start justify-between gap-2">
                      <Text className="text-sm font-medium text-foreground">{ticket.subject}</Text>
                      <Text className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${status.color}`}>
                        {status.label}
                      </Text>
                    </View>
                    {ticket.description ? (
                      <Text className="mt-1 text-xs text-muted-foreground" numberOfLines={2}>
                        {ticket.description}
                      </Text>
                    ) : null}
                    {ticket.admin_notes ? (
                      <View className="mt-2 rounded-lg bg-primary/5 p-2">
                        <Text className="text-xs text-primary">
                          <Text className="font-semibold">Reply:</Text> {ticket.admin_notes}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default Support;

