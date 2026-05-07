import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCreateVoucher } from "@/hooks/useVouchers";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const voucherCategories = ["food", "beauty", "travel", "shopping", "entertainment", "health", "activities", "education", "general"];

const VoucherCreate = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPromotionId = searchParams.get("promotionId") || "";
  const { user } = useAuth();
  const createVoucher = useCreateVoucher();

  const { data: promotions = [] } = useQuery({
    queryKey: ["my-promotions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_promotions" as any)
        .select("id, business_name, tier, status")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data || []) as unknown) as { id: string; business_name: string; tier: string; status: string }[];
    },
    enabled: !!user,
  });

  const defaultPromotionId = preselectedPromotionId || (promotions.length === 1 ? String(promotions[0].id) : "");

  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    category: "general",
    original_price: "",
    discounted_price: "",
    discount_label: "",
    terms: "",
    code: "",
    max_claims: "",
    expires_at: "",
    is_popular: false,
    company_name: "",
    phone_number: "",
    address: "",
    allows_installment: false,
    upfront_amount: "",
    business_promotion_id: defaultPromotionId,
  });

  const update = (field: string, value: any) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async () => {
    if (!user) { toast.error("Please sign in"); navigate("/auth"); return; }
    if (!form.business_promotion_id) {
      toast.error("Please select a business listing");
      return;
    }
    if (!form.title || !form.original_price || !form.discounted_price) {
      toast.error("Please fill title and pricing");
      return;
    }
    await createVoucher.mutateAsync({
      title: form.title,
      subtitle: form.subtitle || null,
      category: form.category,
      original_price: parseFloat(form.original_price),
      discounted_price: parseFloat(form.discounted_price),
      discount_label: form.discount_label || null,
      terms: form.terms || null,
      code: form.code || null,
      max_claims: form.max_claims ? parseInt(form.max_claims) : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      is_popular: form.is_popular,
      company_name: form.company_name || null,
      phone_number: form.phone_number || null,
      address: form.address || null,
      allows_installment: form.allows_installment,
      upfront_amount: form.allows_installment && form.upfront_amount ? parseFloat(form.upfront_amount) : null,
      business_promotion_id: form.business_promotion_id,
    } as any);
    navigate("/vouchers");
  };

  const discount = form.original_price && form.discounted_price
    ? Math.round((1 - parseFloat(form.discounted_price) / parseFloat(form.original_price)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card px-4 py-4">
        <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5 text-foreground" /></button>
        <h1 className="text-lg font-bold text-foreground">Create Voucher</h1>
      </div>

      <div className="px-4 py-5 space-y-4">
        <div className="space-y-2">
          <Label>Business Listing *</Label>
          {promotions.length === 0 ? (
            <p className="text-sm text-destructive">No active promotions found. Create a business listing first.</p>
          ) : (
            <Select value={form.business_promotion_id} onValueChange={(v) => update("business_promotion_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select a listing" /></SelectTrigger>
              <SelectContent>
                {promotions.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.business_name} ({p.tier})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-2">
          <Label>Voucher Title *</Label>
          <Input placeholder="e.g. Spa Day Package" value={form.title} onChange={(e) => update("title", e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Subtitle</Label>
          <Input placeholder="e.g. 90-min premium spa experience" value={form.subtitle} onChange={(e) => update("subtitle", e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={form.category} onValueChange={(v) => update("category", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {voucherCategories.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Original Price (₹) *</Label>
            <Input type="number" placeholder="5000" value={form.original_price} onChange={(e) => update("original_price", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Discounted Price (₹) *</Label>
            <Input type="number" placeholder="2500" value={form.discounted_price} onChange={(e) => update("discounted_price", e.target.value)} />
          </div>
        </div>

        {discount > 0 && (
          <div className="rounded-lg bg-success/10 px-3 py-2 text-sm font-semibold text-success text-center">
            {discount}% OFF — Save ₹{(parseFloat(form.original_price) - parseFloat(form.discounted_price)).toLocaleString()}
          </div>
        )}

        <div className="space-y-2">
          <Label>Discount Label</Label>
          <Input placeholder="e.g. 50% OFF (auto-calculated if empty)" value={form.discount_label} onChange={(e) => update("discount_label", e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Promo Code (Optional — unlocks discounted price)</Label>
          <Input placeholder="e.g. SUMMER30" value={form.code} onChange={(e) => update("code", e.target.value.toUpperCase())} />
        </div>

        <div className="space-y-2">
          <Label>Terms & Conditions</Label>
          <Textarea placeholder="e.g. Valid Mon-Fri only. Cannot be combined with other offers." value={form.terms} onChange={(e) => update("terms", e.target.value)} rows={3} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Max Claims</Label>
            <Input type="number" placeholder="Unlimited" value={form.max_claims} onChange={(e) => update("max_claims", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Expires On</Label>
            <Input type="date" value={form.expires_at} onChange={(e) => update("expires_at", e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Company / Merchant Name</Label>
          <Input placeholder="e.g. Luxe Spa & Wellness" value={form.company_name} onChange={(e) => update("company_name", e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Phone Number</Label>
          <Input type="tel" placeholder="e.g. 9876543210" value={form.phone_number} onChange={(e) => update("phone_number", e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Address (Where to Redeem)</Label>
          <Input placeholder="e.g. Shop 5, MG Road, Bengaluru" value={form.address} onChange={(e) => update("address", e.target.value)} />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div>
            <p className="text-sm font-medium text-foreground">Allow Installment Payment</p>
            <p className="text-xs text-muted-foreground">Buyer pays upfront now, rest within 30 days</p>
          </div>
          <Switch checked={form.allows_installment} onCheckedChange={(v) => update("allows_installment", v)} />
        </div>

        {form.allows_installment && (
          <div className="space-y-2">
            <Label>Upfront Amount (₹) *</Label>
            <Input type="number" placeholder="e.g. 10000" value={form.upfront_amount} onChange={(e) => update("upfront_amount", e.target.value)} />
            <p className="text-xs text-muted-foreground">Buyer pays this now. Remaining balance due within 30 days.</p>
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div>
            <p className="text-sm font-medium text-foreground">Mark as Popular</p>
            <p className="text-xs text-muted-foreground">Featured in the popular section</p>
          </div>
          <Switch checked={form.is_popular} onCheckedChange={(v) => update("is_popular", v)} />
        </div>
      </div>

      <div className="fixed bottom-20 left-0 right-0 border-t border-border bg-card px-4 py-3">
        <Button className="w-full gap-2 rounded-xl py-6" onClick={handleSubmit} disabled={createVoucher.isPending}>
          {createVoucher.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : "Create Voucher"}
        </Button>
      </div>
    </div>
  );
};

export default VoucherCreate;
