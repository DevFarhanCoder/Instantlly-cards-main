import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, MessageCircle, Globe, MapPin, Star, Share2, Mail, Clock, Calendar, Instagram, Facebook, Linkedin, Youtube, Twitter, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { useDirectoryCard } from "@/hooks/useDirectoryCards";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import ShareCardModal from "@/components/ShareCardModal";
import LeadForm from "@/components/business/LeadForm";

const PublicCard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: card, isLoading, error } = useDirectoryCard(id || "");
  const [showShareCard, setShowShareCard] = useState(false);

  const shareUrl = `${window.location.origin}/card/${id}`;

  // Dynamic OG meta tags for social sharing
  useEffect(() => {
    if (!card) return;
    document.title = `${card.full_name} - ${card.company_name || card.category || "Business Card"}`;
    
    const setMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`) || document.querySelector(`meta[name="${property}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(property.startsWith("og:") ? "property" : "name", property);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const desc = [card.job_title, card.company_name, card.category, card.location].filter(Boolean).join(" | ");
    setMeta("og:title", card.full_name);
    setMeta("og:description", card.description || desc);
    setMeta("og:url", shareUrl);
    setMeta("og:type", "profile");
    if (card.logo_url) setMeta("og:image", card.logo_url);
    setMeta("twitter:card", "summary");
    setMeta("twitter:title", card.full_name);
    setMeta("twitter:description", card.description || desc);
  }, [card, shareUrl]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <span className="text-5xl mb-3">🔍</span>
        <p className="text-muted-foreground">Card not found</p>
        <Button variant="link" onClick={() => navigate("/")}>Go to Home</Button>
      </div>
    );
  }

  const handleShare = () => setShowShareCard(true);

  const socialLinks = [
    { url: card.instagram, icon: Instagram, label: "Instagram" },
    { url: card.facebook, icon: Facebook, label: "Facebook" },
    { url: card.linkedin, icon: Linkedin, label: "LinkedIn" },
    { url: card.youtube, icon: Youtube, label: "YouTube" },
    { url: card.twitter, icon: Twitter, label: "Twitter" },
  ].filter((s) => s.url);

  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card px-4 py-4">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Business Card</h1>
        <button onClick={handleShare}>
          <Share2 className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Profile Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-3xl overflow-hidden shrink-0">
            {card.logo_url ? (
              <img src={card.logo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span>🏢</span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xl font-bold text-foreground">{card.full_name}</h2>
              {(card as any).is_verified && <ShieldCheck className="h-5 w-5 text-primary" />}
            </div>
            {card.job_title && <p className="text-sm text-primary font-medium">{card.job_title}</p>}
            {card.company_name && <p className="text-sm text-muted-foreground">{card.company_name}</p>}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {card.category && <Badge variant="secondary" className="text-xs">{card.category}</Badge>}
              {(card as any).is_verified && (
                <Badge className="text-xs bg-primary/10 text-primary border-primary/20">✓ Verified</Badge>
              )}
            </div>
          </div>
        </motion.div>

        {/* Description */}
        {card.description && (
          <p className="text-sm text-muted-foreground">{card.description}</p>
        )}

        {/* Offer */}
        {card.offer && (
          <div className="rounded-xl bg-success/10 px-4 py-3 text-sm font-medium text-success">
            🎁 {card.offer}
          </div>
        )}

        {/* Contact Info */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Contact Information</h3>
          <div className="space-y-2 text-sm text-foreground">
            <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {card.phone}</div>
            {card.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {card.email}</div>}
            {card.location && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> {card.location}</div>}
            {card.website && <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-muted-foreground" /> <a href={card.website.startsWith("http") ? card.website : `https://${card.website}`} target="_blank" rel="noopener noreferrer" className="text-primary underline">{card.website}</a></div>}
            {card.business_hours && <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /> {card.business_hours}</div>}
            {card.established_year && <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /> Est. {card.established_year}</div>}
          </div>
        </div>

        {/* Company Contact (if different) */}
        {(card.company_phone || card.company_email || card.company_address) && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Company Details</h3>
            <div className="space-y-2 text-sm text-foreground">
              {card.company_phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {card.company_phone}</div>}
              {card.company_email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {card.company_email}</div>}
              {card.company_address && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> {card.company_address}</div>}
            </div>
          </div>
        )}

        {/* Services */}
        {card.services && card.services.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Services</h3>
            <div className="flex flex-wrap gap-2">
              {card.services.map((s) => (
                <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Social Links */}
        {socialLinks.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Social Media</h3>
            <div className="flex gap-3">
              {socialLinks.map(({ url, icon: Icon, label }) => (
                <a key={label} href={url!.startsWith("http") ? url! : `https://${url}`} target="_blank" rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-muted hover:bg-primary/10 transition-colors">
                  <Icon className="h-4 w-4 text-foreground" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Map placeholder */}
        {card.location && (
          <div className="rounded-xl border border-border bg-muted h-40 flex items-center justify-center cursor-pointer"
            onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(card.location!)}`)}>
            <div className="text-center">
              <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">{card.location}</p>
              <p className="text-[10px] text-primary mt-1">Tap to open in Maps</p>
            </div>
          </div>
        )}

        {/* Lead Form */}
        <LeadForm businessCardId={card.id} businessName={card.full_name} />

        {/* QR Code */}
        <div className="flex flex-col items-center rounded-xl border border-border bg-card p-4">
          <QRCodeSVG value={shareUrl} size={120} />
          <p className="mt-2 text-xs text-muted-foreground">Scan to save this card</p>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-20 left-0 right-0 border-t border-border bg-card px-4 py-3 flex gap-2">
        <Button className="flex-1 gap-1.5 rounded-xl py-5" onClick={() => window.open(`tel:${card.phone}`)}>
          <Phone className="h-4 w-4" /> Call
        </Button>
        <Button variant="outline" className="flex-1 gap-1.5 rounded-xl py-5" onClick={handleShare}>
          <Share2 className="h-4 w-4" /> Share
        </Button>
        {card.email && (
          <Button variant="outline" className="flex-1 gap-1.5 rounded-xl py-5" onClick={() => window.open(`mailto:${card.email}`)}>
            <Mail className="h-4 w-4" /> Email
          </Button>
        )}
      </div>
      <ShareCardModal
        open={showShareCard}
        onOpenChange={setShowShareCard}
        data={{
          fullName: card.full_name,
          companyName: card.company_name,
          jobTitle: card.job_title,
          phone: card.phone,
          email: card.email,
          location: card.location,
          website: card.website,
          category: card.category,
          offer: card.offer,
          services: card.services,
          logoUrl: card.logo_url,
          shareUrl,
        }}
      />
    </div>
  );
};

export default PublicCard;
