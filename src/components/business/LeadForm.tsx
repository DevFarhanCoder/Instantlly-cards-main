import { useState } from "react";
import { Send, User, Phone, Mail, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useBusinessLeads } from "@/hooks/useBusinessLeads";
import { motion } from "framer-motion";

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
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border border-border bg-card p-6 text-center"
      >
        <span className="text-3xl">✅</span>
        <p className="text-sm font-semibold text-foreground mt-2">Inquiry Sent!</p>
        <p className="text-xs text-muted-foreground mt-1">
          {businessName} will get back to you soon.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Send an Inquiry</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Get in touch with {businessName} directly
      </p>
      <div className="space-y-2.5">
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Your Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="pl-9 rounded-lg text-sm"
          />
        </div>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="pl-9 rounded-lg text-sm"
          />
        </div>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-9 rounded-lg text-sm"
          />
        </div>
        <Textarea
          placeholder="Your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="rounded-lg text-sm min-h-[70px]"
        />
        <Button
          className="w-full gap-1.5 rounded-xl"
          onClick={handleSubmit}
          disabled={!name.trim() || submitLead.isPending}
        >
          <Send className="h-3.5 w-3.5" />
          {submitLead.isPending ? "Sending..." : "Send Inquiry"}
        </Button>
      </div>
    </div>
  );
};

export default LeadForm;
