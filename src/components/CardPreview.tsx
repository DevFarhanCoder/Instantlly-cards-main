import { QRCodeSVG } from "qrcode.react";
import { Phone, Mail, MapPin, Globe, Instagram, Facebook, Linkedin, Youtube, Twitter, Share2, Copy, Clock, MessageCircle, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface CardPreviewProps {
  form: {
    fullName: string;
    phone: string;
    email: string;
    location: string;
    companyName: string;
    jobTitle: string;
    website: string;
    description: string;
    category: string;
    logoPreview: string;
    instagram: string;
    facebook: string;
    linkedin: string;
    youtube: string;
    twitter: string;
    offer: string;
    services?: string[];
    businessHours?: string;
  };
}

const categoryThemes: Record<string, { gradient: string; accent: string; glow: string }> = {
  "Technology": { gradient: "from-blue-600 via-cyan-500 to-blue-400", accent: "text-blue-500", glow: "shadow-blue-500/20" },
  "Health": { gradient: "from-emerald-600 via-green-500 to-teal-400", accent: "text-emerald-500", glow: "shadow-emerald-500/20" },
  "Education": { gradient: "from-violet-600 via-purple-500 to-indigo-400", accent: "text-violet-500", glow: "shadow-violet-500/20" },
  "Food & Dining": { gradient: "from-orange-600 via-amber-500 to-yellow-400", accent: "text-orange-500", glow: "shadow-orange-500/20" },
  "Shopping": { gradient: "from-pink-600 via-rose-500 to-pink-400", accent: "text-pink-500", glow: "shadow-pink-500/20" },
  "Travel": { gradient: "from-sky-600 via-blue-500 to-indigo-400", accent: "text-sky-500", glow: "shadow-sky-500/20" },
  "Services": { gradient: "from-teal-600 via-cyan-500 to-teal-400", accent: "text-teal-500", glow: "shadow-teal-500/20" },
  "Construction": { gradient: "from-amber-600 via-yellow-500 to-orange-400", accent: "text-amber-500", glow: "shadow-amber-500/20" },
  "Real Estate": { gradient: "from-green-600 via-emerald-500 to-lime-400", accent: "text-green-500", glow: "shadow-green-500/20" },
  "Automotive": { gradient: "from-red-600 via-rose-500 to-orange-400", accent: "text-red-500", glow: "shadow-red-500/20" },
  "Lifestyle": { gradient: "from-fuchsia-600 via-pink-500 to-rose-400", accent: "text-fuchsia-500", glow: "shadow-fuchsia-500/20" },
  "Legal": { gradient: "from-slate-600 via-gray-500 to-zinc-400", accent: "text-slate-500", glow: "shadow-slate-500/20" },
};

const defaultTheme = { gradient: "from-primary via-primary/80 to-accent", accent: "text-primary", glow: "shadow-primary/20" };

const fadeItem = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25 },
};

const CardPreview = ({ form }: CardPreviewProps) => {
  const hasSocial = form.instagram || form.facebook || form.linkedin || form.youtube || form.twitter;
  const theme = categoryThemes[form.category] || defaultTheme;
  const hasContent = form.fullName || form.companyName || form.phone;

  const handleShare = () => {
    const text = `${form.fullName || "Business Card"}${form.companyName ? ` — ${form.companyName}` : ""}${form.phone ? `\nPhone: ${form.phone}` : ""}`;
    if (navigator.share) {
      navigator.share({ title: form.fullName, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Card info copied!");
    }
  };

  const handleCopy = () => {
    const text = `${form.fullName}${form.phone ? ` | ${form.phone}` : ""}${form.email ? ` | ${form.email}` : ""}`;
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className={`rounded-2xl border border-border bg-card shadow-xl ${theme.glow} overflow-hidden transition-shadow duration-500`}>
      {/* Content */}
      <div className="px-5 pt-4 pb-5 space-y-3.5">
        {/* Description */}
        <AnimatePresence mode="wait">
          {form.description && (
            <motion.p key="desc" {...fadeItem} className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
              {form.description}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Services Pills */}
        <AnimatePresence>
          {form.services && form.services.length > 0 && (
            <motion.div key="services" {...fadeItem} className="flex flex-wrap gap-1.5">
              {form.services.map((s, i) => (
                <span key={i} className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-foreground">
                  {s}
                </span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Offer Banner */}
        <AnimatePresence mode="wait">
          {form.offer && (
            <motion.div key="offer" {...fadeItem} className="rounded-xl bg-success/10 border border-success/20 px-3 py-2.5 text-xs font-semibold text-success flex items-center gap-2">
              <span className="text-base">🎁</span> {form.offer}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contact Info */}
        {(form.phone || form.email || form.location || form.website || form.businessHours) && (
          <div className="rounded-xl bg-muted/50 p-3 space-y-2">
            {form.phone && (
              <motion.a {...fadeItem} href={`tel:${form.phone}`} className="flex items-center gap-2.5 text-xs text-foreground hover:text-primary transition-colors">
                <div className={`flex h-6 w-6 items-center justify-center rounded-lg bg-background shadow-sm`}>
                  <Phone className="h-3 w-3 text-muted-foreground" />
                </div>
                {form.phone}
              </motion.a>
            )}
            {form.email && (
              <motion.a {...fadeItem} href={`mailto:${form.email}`} className="flex items-center gap-2.5 text-xs text-foreground hover:text-primary transition-colors">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-background shadow-sm">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                </div>
                <span className="truncate">{form.email}</span>
              </motion.a>
            )}
            {form.location && (
              <motion.div {...fadeItem} className="flex items-center gap-2.5 text-xs text-foreground">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-background shadow-sm">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                </div>
                <span className="truncate">{form.location}</span>
              </motion.div>
            )}
            {form.website && (
              <motion.a {...fadeItem} href={form.website.startsWith("http") ? form.website : `https://${form.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-xs text-primary hover:underline">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-background shadow-sm">
                  <Globe className="h-3 w-3 text-muted-foreground" />
                </div>
                <span className="truncate">{form.website}</span>
                <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-50" />
              </motion.a>
            )}
            {form.businessHours && (
              <motion.div {...fadeItem} className="flex items-center gap-2.5 text-xs text-foreground">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-background shadow-sm">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                </div>
                {form.businessHours}
              </motion.div>
            )}
          </div>
        )}

        {/* Social Links */}
        {hasSocial && (
          <div className="flex gap-2">
            {[
              { val: form.instagram, Icon: Instagram, color: "hover:text-pink-500" },
              { val: form.facebook, Icon: Facebook, color: "hover:text-blue-600" },
              { val: form.linkedin, Icon: Linkedin, color: "hover:text-blue-500" },
              { val: form.youtube, Icon: Youtube, color: "hover:text-red-500" },
              { val: form.twitter, Icon: Twitter, color: "hover:text-sky-500" },
            ].filter(s => s.val).map(({ Icon, color }, i) => (
              <div key={i} className={`flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground ${color} transition-colors cursor-pointer`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CardPreview;
