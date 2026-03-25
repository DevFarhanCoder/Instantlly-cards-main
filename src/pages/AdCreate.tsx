import { useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Image, Target, Wallet, Loader2, Plus, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";
import { useCreateAdCampaign } from "@/hooks/useAds";
import { useBusinessCards } from "@/hooks/useBusinessCards";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const steps = ["Ad Type", "Creative", "Targeting", "Budget & Preview"];

const adTypes = [
  { id: "banner", name: "Banner Ad", emoji: "🖼️", desc: "Display across Home, Events & Vouchers pages" },
  { id: "featured", name: "Featured Listing", emoji: "⭐", desc: "Appear at the top of category & search results" },
  { id: "sponsored", name: "Sponsored Card", emoji: "💳", desc: "Promoted business card in the directory" },
];

const AdCreate = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedCardId = searchParams.get("cardId") || "";
  const { user } = useAuth();
  const { cards } = useBusinessCards();
  const createCampaign = useCreateAdCampaign();
  const [step, setStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    type: "",
    title: "",
    description: "",
    cta: "Learn More",
    targetCity: "",
    targetAge: "18-65",
    targetInterests: "",
    budget: [1000],
    duration: "7",
    business_card_id: preselectedCardId,
    creativeUrls: [] as string[],
  });

  const updateField = (field: string, value: any) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    if (form.creativeUrls.length + files.length > 3) {
      toast.error("Maximum 3 creatives allowed");
      return;
    }

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("ad-creatives").upload(path, file);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("ad-creatives").getPublicUrl(path);
        updateField("creativeUrls", [...form.creativeUrls, urlData.publicUrl]);
      }
      toast.success("Image uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeCreative = (idx: number) => {
    updateField("creativeUrls", form.creativeUrls.filter((_, i) => i !== idx));
  };

  const handleLaunch = async () => {
    if (!user) {
      toast.error("Please sign in first");
      navigate("/auth");
      return;
    }
    await createCampaign.mutateAsync({
      title: form.title || "Untitled Campaign",
      description: form.description || undefined,
      ad_type: form.type,
      cta: form.cta,
      target_city: form.targetCity || undefined,
      target_age: form.targetAge,
      target_interests: form.targetInterests || undefined,
      daily_budget: form.budget[0],
      duration_days: parseInt(form.duration),
      business_card_id: form.business_card_id || undefined,
      creative_url: form.creativeUrls[0] || undefined,
      creative_urls: form.creativeUrls,
    });
    navigate("/ads");
  };

  const selectedType = adTypes.find((t) => t.id === form.type);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card px-4 py-4">
        <button onClick={() => (step > 0 ? setStep(step - 1) : navigate(-1))}>
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Create Ad Campaign</h1>
      </div>

      <div className="px-4 pt-4">
        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
        <p className="mt-2 text-xs font-medium text-muted-foreground">Step {step + 1}: {steps[step]}</p>
      </div>

      <div className="px-4 py-5 pb-32">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
              <p className="text-sm text-muted-foreground mb-2">Choose your ad format</p>
              {adTypes.map((t) => (
                <button key={t.id} onClick={() => updateField("type", t.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                    form.type === t.id ? "border-primary bg-primary/5 ring-2 ring-primary" : "border-border bg-card"}`}>
                  <span className="text-3xl">{t.emoji}</span>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{t.name}</h3>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </div>
                </button>
              ))}

              {cards.length > 0 && (
                <div className="space-y-2 pt-2">
                  <Label>Link to Business Card</Label>
                  <Select value={form.business_card_id} onValueChange={(v) => updateField("business_card_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select a card (optional)" /></SelectTrigger>
                    <SelectContent>
                      {cards.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.full_name} {c.company_name ? `— ${c.company_name}` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              {/* Image Upload */}
              <div>
                <Label className="mb-2 block">Ad Creatives (up to 3 for A/B testing)</Label>
                <div className="grid grid-cols-3 gap-2">
                  {form.creativeUrls.map((url, i) => (
                    <div key={i} className="relative aspect-video rounded-xl overflow-hidden border border-border">
                      <img src={url} alt={`Creative ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeCreative(i)}
                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                        {String.fromCharCode(65 + i)}
                      </span>
                    </div>
                  ))}
                  {form.creativeUrls.length < 3 && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-video rounded-xl border-2 border-dashed border-border bg-muted flex flex-col items-center justify-center hover:border-primary transition-colors"
                      disabled={uploading}
                    >
                      {uploading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                          <span className="text-[10px] text-muted-foreground">Upload</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              <div className="space-y-2">
                <Label>Ad Title</Label>
                <Input placeholder="e.g. Summer Sale - 50% Off" value={form.title} onChange={(e) => updateField("title", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="Ad description" value={form.description} onChange={(e) => updateField("description", e.target.value)} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Call to Action</Label>
                <Select value={form.cta} onValueChange={(v) => updateField("cta", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Learn More", "Book Now", "Shop Now", "Get Quote", "Sign Up", "Call Now", "Get Directions", "Chat Now"].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-primary" />
                <h3 className="text-base font-semibold text-foreground">Target Audience</h3>
              </div>
              <div className="space-y-2">
                <Label>City / Region</Label>
                <Input placeholder="e.g. Mumbai, Pune (leave blank for all)" value={form.targetCity} onChange={(e) => updateField("targetCity", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Age Group</Label>
                <Select value={form.targetAge} onValueChange={(v) => updateField("targetAge", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["18-25", "25-35", "35-45", "45-55", "18-65"].map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Interests</Label>
                <Input placeholder="e.g. Technology, Health, Food" value={form.targetInterests} onChange={(e) => updateField("targetInterests", e.target.value)} />
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="h-5 w-5 text-primary" />
                <h3 className="text-base font-semibold text-foreground">Budget & Duration</h3>
              </div>
              <div className="space-y-2">
                <Label>Daily Budget: ₹{form.budget[0].toLocaleString()}</Label>
                <Slider value={form.budget} onValueChange={(v) => updateField("budget", v)} min={100} max={10000} step={100} />
                <div className="flex justify-between text-[10px] text-muted-foreground"><span>₹100</span><span>₹10,000</span></div>
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select value={form.duration} onValueChange={(v) => updateField("duration", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[["7", "7 days"], ["14", "14 days"], ["30", "30 days"], ["60", "60 days"]].map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Phone-frame Preview */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Live Preview</h4>
                <div className="mx-auto w-[260px] rounded-[2rem] border-4 border-foreground/20 bg-background p-2 shadow-xl">
                  <div className="rounded-[1.5rem] overflow-hidden bg-muted">
                    {/* Status bar mock */}
                    <div className="h-6 bg-card flex items-center justify-center">
                      <div className="h-1.5 w-12 rounded-full bg-foreground/20" />
                    </div>
                    {/* Preview content */}
                    <div className="p-3 space-y-2">
                      <div className="h-2 w-16 rounded bg-muted-foreground/20" />
                      <div className="h-3 w-24 rounded bg-muted-foreground/20" />

                      {/* The ad preview */}
                      <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card">
                        {form.creativeUrls[0] ? (
                          <img src={form.creativeUrls[0]} alt="Preview" className="h-10 w-10 rounded object-cover shrink-0" />
                        ) : (
                          <div className="h-10 w-10 rounded bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                            <span className="text-lg">{selectedType?.emoji || "📣"}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-foreground truncate">{form.title || "Your Ad Title"}</p>
                          <p className="text-[8px] text-muted-foreground truncate">{form.description || "Description"}</p>
                        </div>
                        <div className="shrink-0 bg-primary text-primary-foreground text-[8px] px-2 py-1 rounded font-medium">
                          {form.cta}
                        </div>
                      </div>

                      <div className="h-2 w-20 rounded bg-muted-foreground/20" />
                      <div className="h-8 rounded bg-muted-foreground/10" />
                      <div className="h-8 rounded bg-muted-foreground/10" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Campaign Summary</h4>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Type: <span className="text-foreground font-medium">{selectedType?.name || "—"}</span></p>
                  <p>Title: <span className="text-foreground font-medium">{form.title || "—"}</span></p>
                  <p>Creatives: <span className="text-foreground font-medium">{form.creativeUrls.length} image{form.creativeUrls.length !== 1 ? "s" : ""}</span></p>
                  <p>Target: <span className="text-foreground font-medium">{form.targetCity || "All India"}, {form.targetAge}</span></p>
                  <p>Budget: <span className="text-foreground font-medium">₹{form.budget[0].toLocaleString()}/day × {form.duration} days</span></p>
                  <p className="text-primary font-semibold">Total: ₹{(form.budget[0] * parseInt(form.duration)).toLocaleString()}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-20 left-0 right-0 border-t border-border bg-card px-4 py-3">
        {step < 3 ? (
          <Button className="w-full gap-2 rounded-xl py-6" onClick={() => setStep(step + 1)} disabled={step === 0 && !form.type}>
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button className="w-full gap-2 rounded-xl py-6" onClick={handleLaunch} disabled={createCampaign.isPending}>
            {createCampaign.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Launching...</> : <><Check className="h-4 w-4" /> Launch Campaign</>}
          </Button>
        )}
      </div>
    </div>
  );
};

export default AdCreate;
