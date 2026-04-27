import { useMemo, useState } from "react";
import { Image, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Target,
  Upload,
  Wallet,
  X,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Slider } from "../components/ui/slider";
import { useCreateAdCampaign } from "../hooks/useAds";
import { useAuth } from "../hooks/useAuth";
import { useUploadAdCreativeMutation } from "../store/api/adsApi";
import { usePromotionContext } from "../contexts/PromotionContext";
import { hasFeature } from "../utils/tierFeatures";
import { UpgradePrompt } from "../components/business/UpgradePrompt";
import { toast } from "../lib/toast";
import { colors } from "../theme/colors";
import { useIconColor } from "../theme/colors";

const steps = ["Ad Type", "Creative", "Targeting", "Budget & Preview"];

const adTypes = [
  { id: "banner", name: "Banner Ad", emoji: "🖼️", desc: "Display across Home, Events & Vouchers pages" },
  { id: "featured", name: "Featured Listing", emoji: "⭐", desc: "Appear at the top of category & search results" },
  { id: "sponsored", name: "Sponsored Card", emoji: "💳", desc: "Promoted business card in the directory" },
];

const AdCreate = () => {
  const iconColor = useIconColor();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const preselectedCardId = route.params?.cardId || "";
  const { user } = useAuth();
  const { tier, selectedPromotionId, selectedPromotion } = usePromotionContext();
  const createCampaign = useCreateAdCampaign();
  const [uploadAdCreative] = useUploadAdCreativeMutation();
  const [step, setStep] = useState(0);
  const [uploading, setUploading] = useState(false);
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
    business_card_id: preselectedCardId || selectedPromotion?.business_card_id || "",
    promotion_id: selectedPromotionId || "",
    creativeUrls: [] as string[],
  });

  const updateField = (field: string, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const pickCreatives = async () => {
    if (!user) return;
    if (form.creativeUrls.length >= 3) {
      toast.error("Maximum 3 creatives allowed");
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error("Permission required to access photos");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 3 - form.creativeUrls.length,
    });
    if (result.canceled || result.assets.length === 0) return;

    setUploading(true);
    try {
      const newUrls = [...form.creativeUrls];
      for (const asset of result.assets) {
        const uri = asset.uri;
        const fileName = asset.fileName || uri.split("/").pop() || "image.jpg";

        const formData = new FormData();
        formData.append("file", {
          uri: Platform.OS === "android" ? uri : uri.replace("file://", ""),
          name: fileName,
          type: asset.mimeType || "image/jpeg",
        } as any);

        const { url } = await uploadAdCreative(formData).unwrap();
        newUrls.push(url);
      }
      updateField("creativeUrls", newUrls);
      toast.success("Image uploaded!");
    } catch (err: any) {
      console.error("[AdCreate] Upload error:", err);
      toast.error(err?.data?.error || err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeCreative = (idx: number) => {
    updateField(
      "creativeUrls",
      form.creativeUrls.filter((_, i) => i !== idx)
    );
  };

  const handleLaunch = async () => {
    if (!user) {
      toast.error("Please sign in first");
      navigation.navigate("Auth");
      return;
    }
    try {
      await createCampaign.mutateAsync({
        title: form.title || "Untitled Campaign",
        description: form.description || undefined,
        ad_type: form.type,
        cta: form.cta,
        target_city: form.targetCity || undefined,
        target_age: form.targetAge,
        target_interests: form.targetInterests || undefined,
        daily_budget: form.budget[0],
        duration_days: parseInt(form.duration, 10),
        business_card_id: form.business_card_id || undefined,
        promotion_id: form.promotion_id || undefined,
        creative_url: form.creativeUrls[0] || undefined,
        creative_urls: form.creativeUrls,
      });
      toast.success("Ad campaign launched!");
      navigation.navigate("Ads");
    } catch (err: any) {
      toast.error(err?.data?.error || "Failed to create campaign");
    }
  };

  const selectedType = useMemo(
    () => adTypes.find((t) => t.id === form.type),
    [form.type]
  );

  if (!hasFeature(tier, 'ads')) {
    return (
      <View className="flex-1 bg-background">
        <View className="border-b border-border bg-card px-4 py-4 flex-row items-center gap-3">
          <Pressable onPress={() => navigation.goBack()}>
            <ArrowLeft size={20} color={iconColor} />
          </Pressable>
          <Text className="text-lg font-bold text-foreground">Create Ad Campaign</Text>
        </View>
        <UpgradePrompt
          feature="ads"
          promotionId={selectedPromotionId}
          businessName={selectedPromotion?.business_name}
          message={`Upgrade this business to create ads for ${selectedPromotion?.business_name || "this listing"}.`}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card px-4 py-4 flex-row items-center gap-3">
        <Pressable onPress={() => (step > 0 ? setStep(step - 1) : navigation.goBack())}>
          <ArrowLeft size={20} color={iconColor} />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">Create Ad Campaign</Text>
      </View>

      <View className="px-4 pt-4">
        <View className="flex-row gap-1.5">
          {steps.map((_, i) => (
            <View
              key={i}
              className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </View>
        <Text className="mt-2 text-xs font-medium text-muted-foreground">
          Step {step + 1}: {steps[step]}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} className="px-4 py-5">
        {step === 0 && (
          <View className="gap-3">
            <Text className="text-sm text-muted-foreground mb-2">Choose your ad format</Text>
            {adTypes.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => updateField("type", t.id)}
                className={`w-full flex-row items-center gap-3 p-4 rounded-xl border ${
                  form.type === t.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card"
                }`}
              >
                <Text className="text-3xl">{t.emoji}</Text>
                <View>
                  <Text className="text-sm font-semibold text-foreground">{t.name}</Text>
                  <Text className="text-xs text-muted-foreground">{t.desc}</Text>
                </View>
              </Pressable>
            ))}

            <View className="rounded-xl border border-border bg-card p-3">
              <Text className="text-xs text-muted-foreground">
                Campaign will be linked to selected promotion{selectedPromotion?.business_name ? `: ${selectedPromotion.business_name}` : ""}.
              </Text>
            </View>
          </View>
        )}

        {step === 1 && (
          <View className="gap-4">
            <View>
              <Label className="mb-2">Ad Creatives (up to 3 for A/B testing)</Label>
              <View className="flex-row flex-wrap gap-2">
                {form.creativeUrls.map((url, i) => (
                  <View key={i} className="relative h-24 w-24 rounded-xl overflow-hidden border border-border">
                    <Image source={{ uri: url }} style={{ height: "100%", width: "100%" }} />
                    <Pressable
                      onPress={() => removeCreative(i)}
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 items-center justify-center"
                    >
                      <X size={12} color="#ffffff" />
                    </Pressable>
                    <View className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5">
                      <Text className="text-[10px] text-white">{String.fromCharCode(65 + i)}</Text>
                    </View>
                  </View>
                ))}
                {form.creativeUrls.length < 3 && (
                  <Pressable
                    onPress={pickCreatives}
                    className="h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 size={20} color="#6a7181" />
                    ) : (
                      <>
                        <Upload size={18} color="#6a7181" />
                        <Text className="text-[10px] text-muted-foreground mt-1">Upload</Text>
                      </>
                    )}
                  </Pressable>
                )}
              </View>
            </View>

            <View className="gap-2">
              <Label>Ad Title</Label>
              <Input
                placeholder="e.g. Summer Sale - 50% Off"
                value={form.title}
                onChangeText={(v) => updateField("title", v)}
              />
            </View>
            <View className="gap-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Ad description"
                value={form.description}
                onChangeText={(v) => updateField("description", v)}
              />
            </View>
            <View className="gap-2">
              <Label>Call to Action</Label>
              <Select value={form.cta} onValueChange={(v) => updateField("cta", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Learn More",
                    "Book Now",
                    "Shop Now",
                    "Get Quote",
                    "Sign Up",
                    "Call Now",
                    "Get Directions",
                    "Chat Now",
                  ].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </View>
          </View>
        )}

        {step === 2 && (
          <View className="gap-4">
            <View className="flex-row items-center gap-2 mb-2">
              <Target size={18} color="#2563eb" />
              <Text className="text-base font-semibold text-foreground">Target Audience</Text>
            </View>
            <View className="gap-2">
              <Label>City / Region</Label>
              <Input
                placeholder="e.g. Mumbai, Pune (leave blank for all)"
                value={form.targetCity}
                onChangeText={(v) => updateField("targetCity", v)}
              />
            </View>
            <View className="gap-2">
              <Label>Age Group</Label>
              <Select value={form.targetAge} onValueChange={(v) => updateField("targetAge", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["18-25", "25-35", "35-45", "45-55", "18-65"].map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </View>
            <View className="gap-2">
              <Label>Interests</Label>
              <Input
                placeholder="e.g. Technology, Health, Food"
                value={form.targetInterests}
                onChangeText={(v) => updateField("targetInterests", v)}
              />
            </View>
          </View>
        )}

        {step === 3 && (
          <View className="gap-4">
            <View className="flex-row items-center gap-2 mb-2">
              <Wallet size={18} color="#2563eb" />
              <Text className="text-base font-semibold text-foreground">Budget & Duration</Text>
            </View>
            <View className="gap-2">
              <Label>Daily Budget: ₹{form.budget[0].toLocaleString()}</Label>
              <Slider
                value={form.budget}
                onValueChange={(v) => updateField("budget", v)}
                min={100}
                max={10000}
                step={100}
              />
              <View className="flex-row justify-between">
                <Text className="text-[10px] text-muted-foreground">₹100</Text>
                <Text className="text-[10px] text-muted-foreground">₹10,000</Text>
              </View>
            </View>
            <View className="gap-2">
              <Label>Duration</Label>
              <Select value={form.duration} onValueChange={(v) => updateField("duration", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[["7", "7 days"], ["14", "14 days"], ["30", "30 days"], ["60", "60 days"]].map(
                    ([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </View>

            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Live Preview</Text>
              <View className="mx-auto w-64 rounded-3xl border-4 border-foreground/20 bg-background p-2">
                <View className="rounded-2xl overflow-hidden bg-muted">
                  <View className="h-6 bg-card items-center justify-center">
                    <View className="h-1.5 w-12 rounded-full bg-foreground/20" />
                  </View>
                  <View className="p-3 gap-2">
                    <View className="h-2 w-16 rounded bg-muted-foreground/20" />
                    <View className="h-3 w-24 rounded bg-muted-foreground/20" />
                    <View className="flex-row items-center gap-2 p-2 rounded-lg border border-border bg-card">
                      {form.creativeUrls[0] ? (
                        <Image source={{ uri: form.creativeUrls[0] }} style={{ height: 40, width: 40, borderRadius: 8 }} />
                      ) : (
                        <View className="h-10 w-10 rounded bg-primary/20 items-center justify-center">
                          <Text className="text-lg">{selectedType?.emoji || "📣"}</Text>
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className="text-[10px] font-bold text-foreground" numberOfLines={1}>
                          {form.title || "Your Ad Title"}
                        </Text>
                        <Text className="text-[8px] text-muted-foreground" numberOfLines={1}>
                          {form.description || "Description"}
                        </Text>
                      </View>
                      <View className="bg-primary px-2 py-1 rounded">
                        <Text className="text-[8px] text-primary-foreground font-medium">
                          {form.cta}
                        </Text>
                      </View>
                    </View>
                    <View className="h-2 w-20 rounded bg-muted-foreground/20" />
                    <View className="h-8 rounded bg-muted-foreground/10" />
                    <View className="h-8 rounded bg-muted-foreground/10" />
                  </View>
                </View>
              </View>
            </View>

            <View className="rounded-xl border border-border bg-card p-4 gap-2">
              <Text className="text-sm font-semibold text-foreground">Campaign Summary</Text>
              <View className="gap-1">
                <Text className="text-xs text-muted-foreground">
                  Type: <Text className="text-foreground font-medium">{selectedType?.name || "—"}</Text>
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Title: <Text className="text-foreground font-medium">{form.title || "—"}</Text>
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Creatives: <Text className="text-foreground font-medium">{form.creativeUrls.length} image{form.creativeUrls.length !== 1 ? "s" : ""}</Text>
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Target: <Text className="text-foreground font-medium">{form.targetCity || "All India"}, {form.targetAge}</Text>
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Budget: <Text className="text-foreground font-medium">₹{form.budget[0].toLocaleString()}/day × {form.duration} days</Text>
                </Text>
                <Text className="text-primary font-semibold">
                  Total: ₹{(form.budget[0] * parseInt(form.duration, 10)).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View className="border-t border-border bg-card px-4 py-3">
        {step < 3 ? (
          <Pressable
            className="w-full flex-row items-center justify-center gap-2 rounded-xl bg-primary py-6"
            onPress={() => setStep(step + 1)}
            disabled={step === 0 && !form.type}
            style={step === 0 && !form.type ? { opacity: 0.6 } : undefined}
          >
            <Text style={{ color: colors.primaryForeground, fontSize: 16, fontWeight: "700" }}>
              Continue
            </Text>
            <ArrowRight size={16} color={colors.primaryForeground} />
          </Pressable>
        ) : (
          <Pressable
            className="w-full flex-row items-center justify-center gap-2 rounded-xl bg-primary py-6"
            onPress={handleLaunch}
            disabled={createCampaign.isPending}
            style={createCampaign.isPending ? { opacity: 0.6 } : undefined}
          >
            {createCampaign.isPending ? (
              <>
                <Loader2 size={16} color={colors.primaryForeground} />
                <Text style={{ color: colors.primaryForeground, fontSize: 16, fontWeight: "700" }}>
                  Launching...
                </Text>
              </>
            ) : (
              <>
                <Check size={16} color={colors.primaryForeground} />
                <Text style={{ color: colors.primaryForeground, fontSize: 16, fontWeight: "700" }}>
                  Launch Campaign
                </Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
};

export default AdCreate;

