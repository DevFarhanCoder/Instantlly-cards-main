import { useState } from "react";
import { Pressable, View, Text } from "react-native";
import { Mail, MessageSquare, Phone, Send, User } from "lucide-react-native";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { useBusinessLeads } from "../../hooks/useBusinessLeads";
import { colors } from "../../theme/colors";
import { toast } from "../../lib/toast";

interface LeadFormProps {
  businessCardId: string;
  businessName: string;
}

const LeadForm = ({ businessCardId, businessName }: LeadFormProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { submitLead } = useBusinessLeads();

  const handleSubmit = async () => {
    if (!name.trim()) return;
    if (!businessCardId || Number.isNaN(Number(businessCardId))) {
      toast.error("Business details are not available for this listing yet.");
      return;
    }
    await submitLead.mutateAsync({
      business_card_id: businessCardId,
      full_name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      message: message.trim() || undefined,
      source: "contact_form",
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <View className="rounded-xl border border-border bg-card p-6 items-center">
        <Text className="text-3xl">✅</Text>
        <Text className="text-sm font-semibold text-foreground mt-2">Inquiry Sent!</Text>
        <Text className="text-xs text-muted-foreground mt-1 text-center">
          {businessName} will get back to you soon.
        </Text>
      </View>
    );
  }

  return (
    <View className="rounded-xl border border-border bg-card p-4 gap-4">
      <View className="flex-row items-center gap-2">
        <MessageSquare size={16} color="#2563eb" />
        <Text className="text-sm font-semibold text-foreground">Send an Inquiry</Text>
      </View>
      <Text className="text-xs text-muted-foreground mt-1">
        Get in touch with {businessName} directly
      </Text>
      <View className="gap-4">
        <View className="relative">
          <View className="absolute left-3 top-3">
            <User size={14} color="#6a7181" />
          </View>
          <Input
            placeholder="Your Name *"
            value={name}
            onChangeText={setName}
            className="pl-9 rounded-lg text-sm h-12"
          />
        </View>
        <View className="relative">
          <View className="absolute left-3 top-3">
            <Phone size={14} color="#6a7181" />
          </View>
          <Input
            placeholder="Phone Number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            className="pl-9 rounded-lg text-sm h-12"
          />
        </View>
        <View className="relative">
          <View className="absolute left-3 top-3">
            <Mail size={14} color="#6a7181" />
          </View>
          <Input
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            className="pl-9 rounded-lg text-sm h-12"
          />
        </View>
        <Textarea
          placeholder="Your message..."
          value={message}
          onChangeText={setMessage}
          className="rounded-lg text-sm min-h-[110px]"
        />
        <Pressable
          onPress={handleSubmit}
          disabled={!name.trim() || submitLead.isPending}
          className="w-full flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3"
          style={!name.trim() || submitLead.isPending ? { opacity: 0.6 } : undefined}
        >
          <Send size={14} color={colors.primaryForeground} />
          <Text style={{ color: colors.primaryForeground, fontSize: 14, fontWeight: "600" }}>
            {submitLead.isPending ? "Sending..." : "Send Inquiry"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default LeadForm;
