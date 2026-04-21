import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ArrowLeft } from "lucide-react-native";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { Textarea } from "../components/ui/textarea";
import { useAuth } from "../hooks/useAuth";
import { usePromotionContext } from "../contexts/PromotionContext";
import { useCreateVoucher } from "../hooks/useVouchers";
import { toast } from "../lib/toast";

const voucherCategories = [
  "food",
  "beauty",
  "travel",
  "shopping",
  "entertainment",
  "health",
  "activities",
  "education",
  "general",
];

const VoucherCreate = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const routePromotionId = route?.params?.promotionId ? Number(route.params.promotionId) : null;
  const { user } = useAuth();
  const { selectedPromotion, selectedPromotionId } = usePromotionContext();
  const createVoucher = useCreateVoucher();

  const resolvedPromotionId = routePromotionId || selectedPromotionId;

  const [errors, setErrors] = useState<Record<string, string>>({});

  const defaultCategory = "general";

  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    category: voucherCategories.includes(defaultCategory) ? defaultCategory : "general",
    original_price: "",
    discounted_price: "",
    discount_label: "",
    terms: "",
    code: "",
    max_claims: "",
    expires_at: "",
    is_popular: false,
  });

  const update = (field: string, value: any) => setForm((p) => ({ ...p, [field]: value }));

  const discount = useMemo(() => {
    if (form.original_price && form.discounted_price) {
      return Math.round(
        (1 - parseFloat(form.discounted_price) / parseFloat(form.original_price)) * 100
      );
    }
    return 0;
  }, [form.original_price, form.discounted_price]);

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!resolvedPromotionId) nextErrors.promotion = "Select a promotion first";
    if (!form.title || form.title.trim().length < 3) nextErrors.title = "Title must be at least 3 characters";

    const original = Number(form.original_price);
    const discounted = Number(form.discounted_price);
    if (!form.original_price || Number.isNaN(original) || original <= 0) nextErrors.original_price = "Enter a valid original price";
    if (!form.discounted_price || Number.isNaN(discounted) || discounted < 0) nextErrors.discounted_price = "Enter a valid discounted price";
    if (!Number.isNaN(original) && !Number.isNaN(discounted) && discounted > original) {
      nextErrors.discounted_price = "Discounted price cannot exceed original price";
    }

    if (form.expires_at) {
      const dt = new Date(form.expires_at);
      if (isNaN(dt.getTime())) {
        nextErrors.expires_at = "Expiry must be a valid date (YYYY-MM-DD)";
      } else if (dt <= new Date()) {
        nextErrors.expires_at = "Expiry must be in the future";
      }
    }

    if (form.max_claims) {
      const maxClaims = Number(form.max_claims);
      if (Number.isNaN(maxClaims) || maxClaims <= 0) nextErrors.max_claims = "Max claims must be greater than 0";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const canSubmit = useMemo(() => {
    const original = Number(form.original_price);
    const discounted = Number(form.discounted_price);
    return Boolean(
      resolvedPromotionId &&
      form.title.trim().length >= 3 &&
      !Number.isNaN(original) &&
      !Number.isNaN(discounted) &&
      original > 0 &&
      discounted >= 0 &&
      discounted <= original
    );
  }, [resolvedPromotionId, form.title, form.original_price, form.discounted_price]);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please sign in");
      navigation.navigate("Auth");
      return;
    }
    if (!validateForm()) {
      toast.error("Please fix highlighted fields");
      return;
    }
    await createVoucher.mutateAsync({
      business_promotion_id: resolvedPromotionId,
      title: form.title,
      subtitle: form.subtitle || null,
      category: form.category,
      original_price: parseFloat(form.original_price),
      discounted_price: parseFloat(form.discounted_price),
      discount_label: form.discount_label || null,
      terms: form.terms || null,
      code: form.code || null,
      max_claims: form.max_claims ? parseInt(form.max_claims, 10) : null,
      expires_at: form.expires_at && !isNaN(new Date(form.expires_at).getTime()) ? new Date(form.expires_at).toISOString() : null,
      is_popular: form.is_popular,
    } as any);
    navigation.navigate("Vouchers");
  };

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card px-4 py-4 flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#111827" />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">Create Voucher</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} className="px-4 py-5 gap-4">
        <View className="gap-2 rounded-xl border border-border bg-card p-3">
          <Label>Selected Promotion</Label>
          {selectedPromotion ? (
            <Text className="text-sm text-foreground">
              {selectedPromotion.business_name}
            </Text>
          ) : (
            <Text className="text-sm text-destructive">No listing selected</Text>
          )}
          <Button
            variant="outline"
            className="rounded-lg"
            onPress={() => navigation.navigate("BusinessSelectorScreen")}
          >
            Switch Listing
          </Button>
          {errors.promotion ? <Text className="text-xs text-destructive">{errors.promotion}</Text> : null}
        </View>

        <View className="gap-2">
          <Label>Voucher Title *</Label>
          <Input placeholder="e.g. Spa Day Package" value={form.title} onChangeText={(v) => update("title", v)} />
          {errors.title ? <Text className="text-xs text-destructive">{errors.title}</Text> : null}
        </View>

        <View className="gap-2">
          <Label>Subtitle</Label>
          <Input placeholder="e.g. 90-min premium spa experience" value={form.subtitle} onChangeText={(v) => update("subtitle", v)} />
        </View>

        <View className="gap-2">
          <Label>Category</Label>
          <Select value={form.category} onValueChange={(v) => update("category", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {voucherCategories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 gap-2">
            <Label>Original Price (₹) *</Label>
            <Input
              placeholder="5000"
              keyboardType="number-pad"
              value={form.original_price}
              onChangeText={(v) => update("original_price", v)}
            />
            {errors.original_price ? <Text className="text-xs text-destructive">{errors.original_price}</Text> : null}
          </View>
          <View className="flex-1 gap-2">
            <Label>Discounted Price (₹) *</Label>
            <Input
              placeholder="2500"
              keyboardType="number-pad"
              value={form.discounted_price}
              onChangeText={(v) => update("discounted_price", v)}
            />
            {errors.discounted_price ? <Text className="text-xs text-destructive">{errors.discounted_price}</Text> : null}
          </View>
        </View>

        {discount > 0 && (
          <View className="rounded-lg bg-success/10 px-3 py-2">
            <Text className="text-sm font-semibold text-success text-center">
              {discount}% OFF — Save ₹
              {(parseFloat(form.original_price) - parseFloat(form.discounted_price)).toLocaleString()}
            </Text>
          </View>
        )}

        <View className="gap-2">
          <Label>Discount Label</Label>
          <Input
            placeholder="e.g. 50% OFF (auto-calculated if empty)"
            value={form.discount_label}
            onChangeText={(v) => update("discount_label", v)}
          />
        </View>

        <View className="gap-2">
          <Label>Voucher Code (Optional)</Label>
          <Input
            placeholder="e.g. SUMMER30"
            value={form.code}
            onChangeText={(v) => update("code", v)}
          />
        </View>

        <View className="gap-2">
          <Label>Terms & Conditions</Label>
          <Textarea
            placeholder="e.g. Valid Mon-Fri only. Cannot be combined with other offers."
            value={form.terms}
            onChangeText={(v) => update("terms", v)}
            rows={3}
          />
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 gap-2">
            <Label>Max Claims</Label>
            <Input
              placeholder="Unlimited"
              keyboardType="number-pad"
              value={form.max_claims}
              onChangeText={(v) => update("max_claims", v)}
            />
            {errors.max_claims ? <Text className="text-xs text-destructive">{errors.max_claims}</Text> : null}
          </View>
          <View className="flex-1 gap-2">
            <Label>Expires On</Label>
            <Input
              placeholder="YYYY-MM-DD"
              value={form.expires_at}
              onChangeText={(v) => update("expires_at", v)}
            />
            {errors.expires_at ? <Text className="text-xs text-destructive">{errors.expires_at}</Text> : null}
          </View>
        </View>

        <View className="flex-row items-center justify-between rounded-xl border border-border bg-card p-4">
          <View>
            <Text className="text-sm font-medium text-foreground">Mark as Popular</Text>
            <Text className="text-xs text-muted-foreground">Featured in the popular section</Text>
          </View>
          <Switch checked={form.is_popular} onCheckedChange={(v) => update("is_popular", v)} />
        </View>
      </ScrollView>

      <View className="border-t border-border bg-card px-4 py-3">
        <Button className="w-full rounded-xl py-4" onPress={handleSubmit} disabled={createVoucher.isPending || !canSubmit}>
          {createVoucher.isPending ? "Creating..." : "Create Voucher"}
        </Button>
      </View>
    </View>
  );
};

export default VoucherCreate;

