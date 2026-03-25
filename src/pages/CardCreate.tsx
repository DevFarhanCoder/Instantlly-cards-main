import { useState, useRef, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { X, Camera, Plus, ChevronDown, ChevronUp, User, Building2, FileText, Share2, Search, Tag, Eye, EyeOff, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { categories } from "@/data/categories";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useBusinessCards } from "@/hooks/useBusinessCards";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import CardPreview from "@/components/CardPreview";
import { supabase } from "@/integrations/supabase/client";

const STEPS = [
  { key: "personal", label: "Personal", icon: <User className="h-4 w-4" />, num: 1 },
  { key: "business", label: "Business", icon: <Building2 className="h-4 w-4" />, num: 2 },
  { key: "about", label: "About", icon: <FileText className="h-4 w-4" />, num: 3 },
  { key: "offer", label: "Offer", icon: <Tag className="h-4 w-4" />, num: 4 },
  { key: "social", label: "Social", icon: <Share2 className="h-4 w-4" />, num: 5 },
  { key: "additional", label: "SEO", icon: <Search className="h-4 w-4" />, num: 6 },
];

interface AccordionSectionProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  required?: boolean;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  stepNum: number;
  isComplete: boolean;
}

const AccordionSection = ({ icon, title, subtitle, required, isOpen, onToggle, children, stepNum, isComplete }: AccordionSectionProps) => (
  <div className="rounded-2xl border border-border bg-card overflow-hidden">
    <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-colors ${isComplete ? "bg-green-500/15 text-green-600" : "bg-primary/10 text-primary"}`}>
        {isComplete ? <Check className="h-5 w-5" /> : stepNum}
      </div>
      <div className="flex-1 text-left">
        <h3 className="text-sm font-bold text-foreground">{title}{required && <span className="text-destructive ml-0.5">*</span>}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {isOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
    </button>
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
          <div className="space-y-4 px-4 pb-5">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const inputClass = "rounded-xl bg-muted/50 border-0";
const errorInputClass = "rounded-xl bg-muted/50 border border-destructive";

const CardCreate = () => {
  const navigate = useNavigate();
  const { cardId } = useParams<{ cardId?: string }>();
  const { user } = useAuth();
  const { cards, createCard, updateCard } = useBusinessCards();
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ personal: true });
  const [showPreview, setShowPreview] = useState(false);
  const [serviceInput, setServiceInput] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const isEdit = !!cardId;

  const [form, setForm] = useState({
    fullName: "",
    birthdate: "",
    anniversary: "",
    gender: "",
    phone: "",
    whatsapp: "",
    telegram: "",
    email: "",
    location: "",
    mapsLink: "",
    companyName: "",
    jobTitle: "",
    companyPhone: "",
    companyEmail: "",
    website: "",
    companyAddress: "",
    companyMapsLink: "",
    logoPreview: "",
    description: "",
    businessHours: "",
    category: "",
    establishedYear: "",
    instagram: "",
    facebook: "",
    linkedin: "",
    youtube: "",
    twitter: "",
    keywords: "",
    offer: "",
    services: [] as string[],
    homeService: false,
    serviceMode: "visit" as string,
    latitude: null as number | null,
    longitude: null as number | null,
  });

  // Load existing card data in edit mode
  useEffect(() => {
    if (!isEdit || cards.length === 0) return;
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    setForm({
      fullName: card.full_name || "",
      birthdate: card.birthdate || "",
      anniversary: card.anniversary || "",
      gender: card.gender || "",
      phone: card.phone || "",
      whatsapp: (card as any).whatsapp || "",
      telegram: (card as any).telegram || "",
      email: card.email || "",
      location: card.location || "",
      mapsLink: card.maps_link || "",
      companyName: card.company_name || "",
      jobTitle: card.job_title || "",
      companyPhone: card.company_phone || "",
      companyEmail: card.company_email || "",
      website: card.website || "",
      companyAddress: card.company_address || "",
      companyMapsLink: card.company_maps_link || "",
      logoPreview: card.logo_url || "",
      description: card.description || "",
      businessHours: card.business_hours || "",
      category: card.category || "",
      establishedYear: card.established_year || "",
      instagram: card.instagram || "",
      facebook: card.facebook || "",
      linkedin: card.linkedin || "",
      youtube: card.youtube || "",
      twitter: card.twitter || "",
      keywords: card.keywords || "",
      offer: card.offer || "",
      services: card.services || [],
      homeService: (card as any).home_service || false,
      serviceMode: (card as any).service_mode || "visit",
      latitude: (card as any).latitude || null,
      longitude: (card as any).longitude || null,
    });
  }, [isEdit, cardId, cards]);

  const updateField = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));
  const markTouched = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }));
  const toggleSection = (key: string) => setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // Progress calculation
  const progressFields = [
    form.fullName, form.phone, form.email, form.location,
    form.companyName, form.jobTitle, form.website, form.description,
    form.category, form.offer, form.logoPreview,
    form.instagram || form.facebook || form.linkedin ? "social" : "",
  ];
  const filledCount = progressFields.filter(Boolean).length;
  const progress = Math.round((filledCount / progressFields.length) * 100);

  // Section completeness
  const sectionComplete: Record<string, boolean> = useMemo(() => ({
    personal: !!(form.fullName && form.phone),
    business: !!(form.companyName || form.jobTitle),
    about: !!(form.description || form.category),
    offer: !!form.offer,
    social: !!(form.instagram || form.facebook || form.linkedin || form.youtube || form.twitter),
    additional: !!form.keywords,
  }), [form]);

  const isValid = !!(form.fullName.trim() && form.phone.trim());

  const addService = () => {
    if (serviceInput.trim() && form.services.length < 8) {
      setForm((prev) => ({ ...prev, services: [...prev.services, serviceInput.trim()] }));
      setServiceInput("");
    }
  };

  const removeService = (i: number) => setForm((prev) => ({ ...prev, services: prev.services.filter((_, idx) => idx !== i) }));

  const handleLogoUpload = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => updateField("logoPreview", reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile || !user) return null;
    setUploading(true);
    try {
      const ext = logoFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("business-logos").upload(path, logoFile);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("business-logos").getPublicUrl(path);
      return urlData.publicUrl;
    } catch (err: any) {
      toast.error("Logo upload failed");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please sign in to create a card");
      navigate("/auth");
      return;
    }
    setTouched({ fullName: true, phone: true });
    if (!isValid) {
      toast.error("Please fill in Full Name and Mobile Number");
      return;
    }

    let logoUrl: string | null = form.logoPreview && !form.logoPreview.startsWith("data:") ? form.logoPreview : null;
    if (logoFile) {
      logoUrl = await uploadLogo();
    }

    const cardData = {
      full_name: form.fullName,
      birthdate: form.birthdate || null,
      anniversary: form.anniversary || null,
      gender: form.gender || null,
      phone: form.phone,
      whatsapp: form.whatsapp || null,
      telegram: form.telegram || null,
      email: form.email || null,
      location: form.location || null,
      maps_link: form.mapsLink || null,
      company_name: form.companyName || null,
      job_title: form.jobTitle || null,
      company_phone: form.companyPhone || null,
      company_email: form.companyEmail || null,
      website: form.website || null,
      company_address: form.companyAddress || null,
      company_maps_link: form.companyMapsLink || null,
      logo_url: logoUrl,
      description: form.description || null,
      business_hours: form.businessHours || null,
      category: form.category || null,
      established_year: form.establishedYear || null,
      instagram: form.instagram || null,
      facebook: form.facebook || null,
      linkedin: form.linkedin || null,
      youtube: form.youtube || null,
      twitter: form.twitter || null,
      keywords: form.keywords || null,
      offer: form.offer || null,
      services: form.services,
      home_service: form.serviceMode === "home" || form.serviceMode === "both",
      service_mode: form.serviceMode,
      latitude: form.latitude,
      longitude: form.longitude,
    };

    if (isEdit) {
      await updateCard.mutateAsync({ id: cardId!, ...cardData });
    } else {
      await createCard.mutateAsync(cardData);
    }

    navigate("/my-cards");
  };

  const formContent = (
    <div className="space-y-3">
      {/* Personal Information */}
      <AccordionSection icon={<User className="h-5 w-5" />} title="Personal Information" subtitle="Your basic contact details" required isOpen={!!openSections.personal} onToggle={() => toggleSection("personal")} stepNum={1} isComplete={sectionComplete.personal}>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Full Name <span className="text-destructive">*</span></Label>
          <Input
            placeholder="Enter your full name"
            value={form.fullName}
            onChange={(e) => updateField("fullName", e.target.value)}
            onBlur={() => markTouched("fullName")}
            className={touched.fullName && !form.fullName ? errorInputClass : inputClass}
          />
          {touched.fullName && !form.fullName && <p className="text-xs text-destructive">Full name is required</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Birthdate</Label>
          <Input type="date" value={form.birthdate} onChange={(e) => updateField("birthdate", e.target.value)} className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Anniversary</Label>
          <Input type="date" value={form.anniversary} onChange={(e) => updateField("anniversary", e.target.value)} className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Gender</Label>
          <div className="flex gap-2">
            {["Male", "Female"].map((g) => (
              <button key={g} type="button" onClick={() => updateField("gender", g)} className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${form.gender === g ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"}`}>
                {g === "Male" ? "♂️" : "♀️"} {g}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Mobile Number <span className="text-destructive">*</span></Label>
          <div className="flex gap-2">
            <div className="flex h-10 items-center gap-1 rounded-xl bg-muted/50 px-3 text-sm text-muted-foreground">🇮🇳 +91</div>
            <Input
              placeholder="Enter mobile number"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              onBlur={() => markTouched("phone")}
              className={`flex-1 ${touched.phone && !form.phone ? errorInputClass : inputClass}`}
            />
          </div>
          {touched.phone && !form.phone && <p className="text-xs text-destructive">Mobile number is required</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">WhatsApp Number</Label>
          <div className="flex gap-2">
            <div className="flex h-10 items-center gap-1 rounded-xl bg-muted/50 px-3 text-sm text-muted-foreground">💬 +91</div>
            <Input placeholder="WhatsApp number" value={form.whatsapp} onChange={(e) => updateField("whatsapp", e.target.value)} className={`flex-1 ${inputClass}`} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Telegram Number / Username</Label>
          <div className="flex gap-2">
            <div className="flex h-10 items-center gap-1 rounded-xl bg-muted/50 px-3 text-sm text-muted-foreground">✈️</div>
            <Input placeholder="@username or phone number" value={form.telegram} onChange={(e) => updateField("telegram", e.target.value)} className={`flex-1 ${inputClass}`} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Email Address</Label>
          <Input type="email" placeholder="your.email@example.com" value={form.email} onChange={(e) => updateField("email", e.target.value)} className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Location / Address</Label>
          <div className="flex gap-2">
            <Input placeholder="City, State, Country" value={form.location} onChange={(e) => updateField("location", e.target.value)} className={`${inputClass} flex-1`} />
            <Button type="button" variant="outline" size="sm" className="shrink-0 text-xs gap-1" onClick={() => {
              if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
              toast.loading("Detecting location...", { id: "geo" });
              navigator.geolocation.getCurrentPosition(
                async (pos) => {
                  try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
                    const data = await res.json();
                    const addr = data.address;
                    const loc = [addr.suburb || addr.neighbourhood, addr.city || addr.town || addr.village, addr.state, addr.country].filter(Boolean).join(", ");
                    updateField("location", loc);
                    updateField("mapsLink", `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`);
                    setForm(prev => ({ ...prev, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
                    toast.success("Location detected!", { id: "geo" });
                  } catch { toast.error("Could not resolve address", { id: "geo" }); }
                },
                () => toast.error("Location access denied", { id: "geo" }),
                { enableHighAccuracy: true, timeout: 10000 }
              );
            }}>
              📍 Auto
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Google Maps Link</Label>
          <Input placeholder="https://maps.google.com/..." value={form.mapsLink} onChange={(e) => updateField("mapsLink", e.target.value)} className={inputClass} />
        </div>
      </AccordionSection>

      {/* Business Information */}
      <AccordionSection icon={<Building2 className="h-5 w-5" />} title="Business Information" subtitle="Company and professional details" isOpen={!!openSections.business} onToggle={() => toggleSection("business")} stepNum={2} isComplete={sectionComplete.business}>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Company Name</Label>
          <Input placeholder="Your company or organization" value={form.companyName} onChange={(e) => updateField("companyName", e.target.value)} className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Job Title / Designation</Label>
          <Input placeholder="e.g. Marketing Manager, CEO" value={form.jobTitle} onChange={(e) => updateField("jobTitle", e.target.value)} className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Company Phone</Label>
          <div className="flex gap-2">
            <div className="flex h-10 items-center gap-1 rounded-xl bg-muted/50 px-3 text-sm text-muted-foreground">🇮🇳 +91</div>
            <Input placeholder="Company number" value={form.companyPhone} onChange={(e) => updateField("companyPhone", e.target.value)} className={`flex-1 ${inputClass}`} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Company Email</Label>
          <Input type="email" placeholder="contact@company.com" value={form.companyEmail} onChange={(e) => updateField("companyEmail", e.target.value)} className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Company Website</Label>
          <Input placeholder="https://company.com" value={form.website} onChange={(e) => updateField("website", e.target.value)} className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Company Address</Label>
          <Input placeholder="Office address" value={form.companyAddress} onChange={(e) => updateField("companyAddress", e.target.value)} className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Company Maps Link</Label>
          <Input placeholder="https://maps.google.com/..." value={form.companyMapsLink} onChange={(e) => updateField("companyMapsLink", e.target.value)} className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Business Photo / Logo</Label>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <Button type="button" variant="outline" className="w-full gap-2 rounded-xl border-primary/30 text-primary" onClick={handleLogoUpload}>
            <Camera className="h-4 w-4" /> {form.logoPreview ? "Change Photo" : "Add Photo"}
          </Button>
          {form.logoPreview && (
            <div className="mt-2 flex justify-center">
              <img src={form.logoPreview} alt="Logo preview" className="h-32 w-32 rounded-2xl object-cover bg-muted" />
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Service Mode <span className="text-destructive">*</span></Label>
          <p className="text-xs text-muted-foreground">Where do you serve your customers?</p>
          <div className="flex gap-2 mt-1">
            {[
              { value: "home", label: "🏠 Home Service", desc: "We visit the customer" },
              { value: "visit", label: "🏪 At Business", desc: "Customer visits us" },
              { value: "both", label: "🔄 Both", desc: "Home & business" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, serviceMode: opt.value, homeService: opt.value === "home" || opt.value === "both" }))}
                className={`flex-1 rounded-xl py-3 px-2 text-center transition-colors border-2 ${
                  form.serviceMode === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-border bg-muted/30"
                }`}
              >
                <span className="text-sm font-semibold text-foreground block">{opt.label}</span>
                <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </AccordionSection>

      {/* About Business */}
      <AccordionSection icon={<FileText className="h-5 w-5" />} title="About Business" subtitle="Describe your services and hours" isOpen={!!openSections.about} onToggle={() => toggleSection("about")} stepNum={3} isComplete={sectionComplete.about}>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">About Business</Label>
          <Textarea placeholder="Brief description of your business or services" value={form.description} onChange={(e) => updateField("description", e.target.value)} rows={3} className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Business Hours</Label>
          <Select value={form.businessHours} onValueChange={(v) => updateField("businessHours", v)}>
            <SelectTrigger className={inputClass}><SelectValue placeholder="Set business hours" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="9am-6pm">9:00 AM – 6:00 PM</SelectItem>
              <SelectItem value="9am-9pm">9:00 AM – 9:00 PM</SelectItem>
              <SelectItem value="10am-8pm">10:00 AM – 8:00 PM</SelectItem>
              <SelectItem value="24x7">24 x 7</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Category</Label>
          <Select value={form.category} onValueChange={(v) => updateField("category", v)}>
            <SelectTrigger className={inputClass}><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.name}>{cat.emoji} {cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Services (max 8)</Label>
          <div className="flex gap-2">
            <Input placeholder="Add a service" value={serviceInput} onChange={(e) => setServiceInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addService())} className={`flex-1 ${inputClass}`} />
            <Button type="button" onClick={addService} size="sm" className="shrink-0 rounded-xl">Add</Button>
          </div>
          {form.services.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.services.map((s, i) => (
                <span key={i} className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  {s}
                  <button onClick={() => removeService(i)}><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Established Year</Label>
          <Input placeholder="e.g. 2020" value={form.establishedYear} onChange={(e) => updateField("establishedYear", e.target.value)} className={inputClass} />
        </div>
      </AccordionSection>

      {/* Special Offer */}
      <AccordionSection icon={<Tag className="h-5 w-5" />} title="Special Offer" subtitle="Attract customers with an offer" isOpen={!!openSections.offer} onToggle={() => toggleSection("offer")} stepNum={4} isComplete={sectionComplete.offer}>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Offer</Label>
          <Input placeholder="e.g. 20% off on first service" value={form.offer} onChange={(e) => updateField("offer", e.target.value)} className={inputClass} />
        </div>
      </AccordionSection>

      {/* Social Media */}
      <AccordionSection icon={<Share2 className="h-5 w-5" />} title="Social Media" subtitle="Connect on social platforms" isOpen={!!openSections.social} onToggle={() => toggleSection("social")} stepNum={5} isComplete={sectionComplete.social}>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Instagram</Label>
          <Input placeholder="@yourbusiness" value={form.instagram} onChange={(e) => updateField("instagram", e.target.value)} className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Facebook</Label>
          <Input placeholder="facebook.com/yourbusiness" value={form.facebook} onChange={(e) => updateField("facebook", e.target.value)} className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">LinkedIn</Label>
          <Input placeholder="linkedin.com/in/yourprofile" value={form.linkedin} onChange={(e) => updateField("linkedin", e.target.value)} className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">YouTube</Label>
          <Input placeholder="youtube.com/@yourchannel" value={form.youtube} onChange={(e) => updateField("youtube", e.target.value)} className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Twitter / X</Label>
          <Input placeholder="@yourhandle" value={form.twitter} onChange={(e) => updateField("twitter", e.target.value)} className={inputClass} />
        </div>
      </AccordionSection>

      {/* Additional Information */}
      <AccordionSection icon={<Search className="h-5 w-5" />} title="Additional Information" subtitle="Keywords and search optimization" isOpen={!!openSections.additional} onToggle={() => toggleSection("additional")} stepNum={6} isComplete={sectionComplete.additional}>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Keywords</Label>
          <Textarea placeholder="Add keywords separated by commas to help people find your card" value={form.keywords} onChange={(e) => updateField("keywords", e.target.value)} rows={2} className={inputClass} />
        </div>
      </AccordionSection>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold text-foreground">{isEdit ? "Edit Card" : "Create New Card"}</h1>
            <p className="text-xs text-muted-foreground">{filledCount} of {progressFields.length} fields filled</p>
          </div>
          <div className="flex items-center gap-2">
            {isMobile && (
              <button onClick={() => setShowPreview(!showPreview)} className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            )}
            <button onClick={() => navigate(-1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <X className="h-4 w-4 text-foreground" />
            </button>
          </div>
        </div>
        <Progress value={progress} className="h-1.5" />

        {/* Stepper navigation */}
        <div className="flex gap-1 mt-3 overflow-x-auto pb-1 scrollbar-hide">
          {STEPS.map((step) => (
            <button
              key={step.key}
              onClick={() => {
                setOpenSections((prev) => {
                  const next: Record<string, boolean> = {};
                  STEPS.forEach((s) => (next[s.key] = s.key === step.key));
                  return next;
                });
              }}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                openSections[step.key]
                  ? "bg-primary text-primary-foreground"
                  : sectionComplete[step.key]
                  ? "bg-green-500/15 text-green-600"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {sectionComplete[step.key] && !openSections[step.key] ? <Check className="h-3 w-3" /> : step.icon}
              {step.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Preview Toggle */}
      {isMobile && (
        <AnimatePresence>
          {showPreview && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-border bg-muted/30 px-4 py-4">
              <p className="mb-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Live Preview</p>
              <CardPreview form={form} />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Main Content: Side-by-Side on Desktop */}
      <div className="md:flex md:gap-6 md:px-6 md:pt-4">
        {/* Form */}
        <div className={`px-4 pt-4 md:px-0 md:flex-1 md:min-w-0`}>
          {formContent}
        </div>

      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-20 left-0 right-0 border-t border-border bg-card px-4 py-3 md:px-6">
        <Button
          className="w-full rounded-xl py-6 text-base font-bold"
          onClick={handleSubmit}
          disabled={createCard.isPending || updateCard.isPending || uploading || !isValid}
        >
          {uploading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
          ) : createCard.isPending || updateCard.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> {isEdit ? "Saving..." : "Creating..."}</>
          ) : (
            isEdit ? "Save Changes" : "Create Card"
          )}
        </Button>
      </div>
    </div>
  );
};

export default CardCreate;
