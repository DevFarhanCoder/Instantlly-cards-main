
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  Building2,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  FileText,
  Plus,
  Search,
  Share2,
  Tag,
  User,
  X,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Progress } from "../components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { categories as fallbackCategories } from "../data/categories";
import { useListMobileCategoriesQuery } from "../store/api/categoriesApi";
import { useAuth } from "../hooks/useAuth";
import { useBusinessCards } from "../hooks/useBusinessCards";
import { supabase } from "../integrations/supabase/client";
import { toast } from "../lib/toast";
import { cn } from "../lib/utils";
import { colors } from "../theme/colors";

const STEPS = [
  { key: "personal", label: "Personal", icon: User, num: 1 },
  { key: "business", label: "Business", icon: Building2, num: 2 },
  { key: "about", label: "About", icon: FileText, num: 3 },
  { key: "offer", label: "Offer", icon: Tag, num: 4 },
  { key: "social", label: "Social", icon: Share2, num: 5 },
  { key: "additional", label: "SEO", icon: Search, num: 6 },
];

const inputClass = "rounded-xl bg-muted/50 border-0";
const errorInputClass = "rounded-xl bg-muted/50 border border-destructive";

const CardCreate = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const cardId = route?.params?.cardId as string | undefined;
  const { user } = useAuth();
  const { cards, createCard, updateCard } = useBusinessCards();
  const { data: categoryData = [] } = useListMobileCategoriesQuery();
  const categoryOptions = useMemo(() => {
    if (categoryData.length > 0) {
      return categoryData.map((cat) => ({
        id: String(cat.id),
        name: cat.name,
        emoji: cat.icon || "\u{1F4C1}",
      }));
    }
    return fallbackCategories;
  }, [categoryData]);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    personal: true,
  });
  const [showPreview, setShowPreview] = useState(false);
  const [serviceInput, setServiceInput] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState(false);
  const [logoAsset, setLogoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
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

  const updateField = (field: string, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));
  const markTouched = (field: string) =>
    setTouched((prev) => ({ ...prev, [field]: true }));
  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const progressFields = [
    form.fullName,
    form.phone,
    form.email,
    form.location,
    form.companyName,
    form.jobTitle,
    form.website,
    form.description,
    form.category,
    form.offer,
    form.logoPreview,
    form.instagram || form.facebook || form.linkedin ? "social" : "",
  ];
  const filledCount = progressFields.filter(Boolean).length;
  const progress = Math.round((filledCount / progressFields.length) * 100);

  const sectionComplete: Record<string, boolean> = useMemo(
    () => ({
      personal: !!(form.fullName && form.phone),
      business: !!(form.companyName || form.jobTitle),
      about: !!(form.description || form.category),
      offer: !!form.offer,
      social: !!(
        form.instagram ||
        form.facebook ||
        form.linkedin ||
        form.youtube ||
        form.twitter
      ),
      additional: !!form.keywords,
    }),
    [form]
  );

  const isValid = !!(form.fullName.trim() && form.phone.trim());

  const addService = () => {
    if (serviceInput.trim() && form.services.length < 8) {
      setForm((prev) => ({
        ...prev,
        services: [...prev.services, serviceInput.trim()],
      }));
      setServiceInput("");
    }
  };

  const removeService = (i: number) =>
    setForm((prev) => ({
      ...prev,
      services: prev.services.filter((_, idx) => idx !== i),
    }));

  const handleLogoUpload = async () => {
    if (!user) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error("Permission required to access photos");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    setLogoAsset(asset);
    updateField("logoPreview", asset.uri);
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoAsset || !user) return null;
    setUploading(true);
    try {
      const ext = (logoAsset.fileName || logoAsset.uri.split(".").pop() || "jpg")
        .split(".")
        .pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const response = await fetch(logoAsset.uri);
      const blob = await response.blob();
      const { error } = await supabase.storage
        .from("business-logos")
        .upload(path, blob, { upsert: true } as any);
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from("business-logos")
        .getPublicUrl(path);
      return urlData.publicUrl;
    } catch {
      toast.error("Logo upload failed");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleAutoLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      toast.error("Location permission denied");
      return;
    }
    toast.success("Detecting location...");
    const pos = await Location.getCurrentPositionAsync({});
    const places = await Location.reverseGeocodeAsync({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    });
    const addr = places[0];
    const loc = [
      addr?.subregion || (addr as any)?.neighborhood,
      addr?.city || addr?.region,
      addr?.region,
      addr?.country,
    ]
      .filter(Boolean)
      .join(", ");
    updateField("location", loc);
    updateField(
      "mapsLink",
      `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`
    );
    setForm((prev) => ({
      ...prev,
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    }));
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please sign in to create a card");
      navigation.navigate("Auth");
      return;
    }
    setTouched({ fullName: true, phone: true });
    if (!isValid) {
      toast.error("Please fill in Full Name and Mobile Number");
      return;
    }

    let logoUrl: string | null =
      form.logoPreview && !form.logoPreview.startsWith("file:")
        ? form.logoPreview
        : null;
    if (logoAsset) {
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
      await updateCard.mutateAsync({ id: cardId!, ...(cardData as any) });
    } else {
      await createCard.mutateAsync(cardData as any);
    }

    navigation.navigate("MyCards");
  };

  const AccordionSection = ({
    title,
    subtitle,
    required,
    isOpen,
    onToggle,
    stepNum,
    isComplete,
    children,
  }: {
    title: string;
    subtitle: string;
    required?: boolean;
    isOpen: boolean;
    onToggle: () => void;
    stepNum: number;
    isComplete: boolean;
    children: React.ReactNode;
  }) => (
    <View className="rounded-2xl border border-border bg-card overflow-hidden">
      <Pressable onPress={onToggle} className="flex-row items-center gap-3 p-4">
        <View
          className={cn(
            "h-10 w-10 items-center justify-center rounded-xl",
            isComplete ? "bg-green-500/15" : "bg-primary/10"
          )}
        >
          {isComplete ? (
            <Check size={18} color="#16a34a" />
          ) : (
            <Text className="text-sm font-bold text-primary">{stepNum}</Text>
          )}
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-foreground">
            {title}
            {required && <Text className="text-destructive"> *</Text>}
          </Text>
          <Text className="text-xs text-muted-foreground">{subtitle}</Text>
        </View>
        {isOpen ? (
          <ChevronUp size={20} color="#9aa2b1" />
        ) : (
          <ChevronDown size={20} color="#9aa2b1" />
        )}
      </Pressable>
      {isOpen && <View className="space-y-4 px-4 pb-5">{children}</View>}
    </View>
  );

  const submitLabel = uploading
    ? "Uploading..."
    : createCard.isPending || updateCard.isPending
    ? isEdit
      ? "Saving..."
      : "Creating..."
    : isEdit
    ? "Save Changes"
    : "Create Card";
  const submitDisabled =
    createCard.isPending || updateCard.isPending || uploading || !isValid;

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card px-4 py-3">
        <View className="flex-row items-center justify-between mb-2">
          <View>
            <Text className="text-xl font-bold text-foreground">
              {isEdit ? "Edit Card" : "Create New Card"}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {filledCount} of {progressFields.length} fields filled
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => setShowPreview(!showPreview)}
              className="h-8 w-8 items-center justify-center rounded-full bg-primary/10"
            >
              {showPreview ? (
                <EyeOff size={16} color="#2563eb" />
              ) : (
                <Eye size={16} color="#2563eb" />
              )}
            </Pressable>
            <Pressable
              onPress={() => navigation.goBack()}
              className="h-8 w-8 items-center justify-center rounded-full bg-muted"
            >
              <X size={16} color="#111827" />
            </Pressable>
          </View>
        </View>
        <Progress value={progress} className="h-1.5" />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
          <View className="flex-row gap-2">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isOpen = !!openSections[step.key];
              return (
                <Pressable
                  key={step.key}
                  onPress={() =>
                    setOpenSections(
                      STEPS.reduce((acc, s) => {
                        acc[s.key] = s.key === step.key;
                        return acc;
                      }, {} as Record<string, boolean>)
                    )
                  }
                  className={cn(
                    "flex-row items-center gap-1.5 rounded-full px-3 py-1.5",
                    isOpen
                      ? "bg-primary"
                      : sectionComplete[step.key]
                      ? "bg-green-500/15"
                      : "bg-muted"
                  )}
                >
                  {sectionComplete[step.key] && !isOpen ? (
                    <Check size={12} color="#16a34a" />
                  ) : (
                    <Icon size={12} color={isOpen ? "#ffffff" : "#6a7181"} />
                  )}
                  <Text
                    className={cn(
                      "text-xs font-medium",
                      isOpen
                        ? "text-primary-foreground"
                        : sectionComplete[step.key]
                        ? "text-green-600"
                        : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {showPreview && (
        <View className="border-b border-border bg-muted/30 px-4 py-4">
          <Text className="mb-2 text-xs font-bold text-muted-foreground uppercase">
            Live Preview
          </Text>
          <View className="rounded-2xl border border-border bg-card p-4">
            <View className="flex-row items-center gap-3">
              <View className="h-14 w-14 items-center justify-center rounded-xl bg-primary/10 overflow-hidden">
                {form.logoPreview ? (
                  <Image source={{ uri: form.logoPreview }} style={{ height: "100%", width: "100%" }} />
                ) : (
                  <Text className="text-xl">??</Text>
                )}
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-foreground">
                  {form.fullName || "Your Name"}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {form.jobTitle || "Job Title"}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {form.companyName || "Company"}
                </Text>
              </View>
            </View>
            {form.offer ? (
              <View className="mt-3 rounded-lg bg-success/10 px-3 py-2">
                <Text className="text-xs font-semibold text-success">?? {form.offer}</Text>
              </View>
            ) : null}
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: 260 }} className="px-4 pt-4 space-y-3">
        <AccordionSection
          title="Personal Information"
          subtitle="Your basic contact details"
          required
          isOpen={!!openSections.personal}
          onToggle={() => toggleSection("personal")}
          stepNum={1}
          isComplete={sectionComplete.personal}
        >
          <View className="space-y-1.5">
            <Label className="text-xs font-bold">Full Name *</Label>
            <Input
              placeholder="Enter your full name"
              value={form.fullName}
              onChangeText={(v) => updateField("fullName", v)}
              onBlur={() => markTouched("fullName")}
              className={touched.fullName && !form.fullName ? errorInputClass : inputClass}
            />
            {touched.fullName && !form.fullName && (
              <Text className="text-xs text-destructive">Full name is required</Text>
            )}
          </View>
          <View className="space-y-1.5">
            <Label className="text-xs font-bold">Birthdate</Label>
            <Input
              placeholder="YYYY-MM-DD"
              value={form.birthdate}
              onChangeText={(v) => updateField("birthdate", v)}
              className={inputClass}
            />
          </View>
          <View className="space-y-1.5">
            <Label className="text-xs font-bold">Anniversary</Label>
            <Input
              placeholder="YYYY-MM-DD"
              value={form.anniversary}
              onChangeText={(v) => updateField("anniversary", v)}
              className={inputClass}
            />
          </View>
          <View className="space-y-1.5">
            <Label className="text-xs font-bold">Gender</Label>
            <View className="flex-row gap-2">
              {["Male", "Female"].map((g) => (
                <Pressable
                  key={g}
                  onPress={() => updateField("gender", g)}
                  className={cn(
                    "flex-1 rounded-xl py-2.5",
                    form.gender === g
                      ? "bg-primary"
                      : "bg-muted/50"
                  )}
                >
                  <Text
                    className={cn(
                      "text-sm font-medium text-center",
                      form.gender === g
                        ? "text-primary-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {g === "Male" ? "??" : "??"} {g}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View className="space-y-1.5">
            <Label className="text-xs font-bold">Mobile Number *</Label>
            <View className="flex-row gap-2 items-center">
              <View className="h-10 items-center justify-center rounded-xl bg-muted/50 px-3">
                <Text className="text-sm text-muted-foreground">???? +91</Text>
              </View>
              <Input
                placeholder="Enter mobile number"
                value={form.phone}
                onChangeText={(v) => updateField("phone", v)}
                onBlur={() => markTouched("phone")}
                keyboardType="phone-pad"
                className={cn(
                  "flex-1",
                  touched.phone && !form.phone ? errorInputClass : inputClass
                )}
              />
            </View>
            {touched.phone && !form.phone && (
              <Text className="text-xs text-destructive">Mobile number is required</Text>
            )}
          </View>
          <View className="space-y-1.5">
            <Label className="text-xs font-bold">WhatsApp Number</Label>
            <View className="flex-row gap-2 items-center">
              <View className="h-10 items-center justify-center rounded-xl bg-muted/50 px-3">
                <Text className="text-sm text-muted-foreground">?? +91</Text>
              </View>
              <Input
                placeholder="WhatsApp number"
                value={form.whatsapp}
                onChangeText={(v) => updateField("whatsapp", v)}
                keyboardType="phone-pad"
                className={cn("flex-1", inputClass)}
              />
            </View>
          </View>
          <View className="space-y-1.5">
            <Label className="text-xs font-bold">Telegram Number / Username</Label>
            <View className="flex-row gap-2 items-center">
              <View className="h-10 items-center justify-center rounded-xl bg-muted/50 px-3">
                <Text className="text-sm text-muted-foreground">??</Text>
              </View>
              <Input
                placeholder="@username or phone number"
                value={form.telegram}
                onChangeText={(v) => updateField("telegram", v)}
                className={cn("flex-1", inputClass)}
              />
            </View>
          </View>
          <View className="space-y-1.5">
            <Label className="text-xs font-bold">Email Address</Label>
            <Input
              placeholder="your.email@example.com"
              value={form.email}
              onChangeText={(v) => updateField("email", v)}
              keyboardType="email-address"
              autoCapitalize="none"
              className={inputClass}
            />
          </View>
          <View className="space-y-1.5">
            <Label className="text-xs font-bold">Location / Address</Label>
            <View className="flex-row gap-2">
              <Input
                placeholder="City, State, Country"
                value={form.location}
                onChangeText={(v) => updateField("location", v)}
                className={cn("flex-1", inputClass)}
              />
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 rounded-xl"
                onPress={handleAutoLocation}
              >
                ?? Auto
              </Button>
            </View>
          </View>
          <View className="space-y-1.5">
            <Label className="text-xs font-bold">Google Maps Link</Label>
            <Input
              placeholder="https://maps.google.com/..."
              value={form.mapsLink}
              onChangeText={(v) => updateField("mapsLink", v)}
              className={inputClass}
            />
          </View>
        </AccordionSection>

        <AccordionSection
          title="Business Information"
          subtitle="Company and professional details"
          isOpen={!!openSections.business}
          onToggle={() => toggleSection("business")}
          stepNum={2}
          isComplete={sectionComplete.business}
        >
          <View className="space-y-1.5">
            <Label className="text-xs font-bold">Company Name</Label>
            <Input
              placeholder="Your company or organization"
              value={form.companyName}
              onChangeText={(v) => updateField("companyName", v)}
              className={inputClass}
            />
          </View>
          <View className="space-y-1.5">
            <Label className="text-xs font-bold">Job Title / Designation</Label>
            <Input
              placeholder="e.g. Marketing Manager, CEO"
              value={form.jobTitle}
              onChangeText={(v) => updateField("jobTitle", v)}
              className={inputClass}
            />
          </View>
          <View className="space-y-1.5">
            <Label className="text-xs font-bold">Company Phone</Label>
            <View className="flex-row gap-2 items-center">
              <View className="h-10 items-center justify-center rounded-xl bg-muted/50 px-3">
                <Text className="text-sm text-muted-foreground">???? +91</Text>
              </View>
              <Input
                placeholder="Company number"
                value={form.companyPhone}
                onChangeText={(v) => updateField("companyPhone", v)}
                keyboardType="phone-pad"
                className={cn("flex-1", inputClass)}
              />
            </View>
          </View>
          <View className="space-y-1.5">
            <Label className="text-xs font-bold">Company Email</Label>
            <Input
              placeholder="contact@company.com"
              value={form.companyEmail}
              onChangeText={(v) => updateField("companyEmail", v)}
              keyboardType="email-address"
              autoCapitalize="none"
              className={inputClass}
            />
          </View>
          <View className="space-y-1.5">
            <Label className="text-xs font-bold">Company Website</Label>
            <Input
              placeholder="https://company.com"
              value={form.website}
              onChangeText={(v) => updateField("website", v)}
              className={inputClass}
            />
          </View>
          <View className="space-y-1.5">
            <Label className="text-xs font-bold">Company Address</Label>
            <Input
              placeholder="Office address"
              value={form.companyAddress}
              onChangeText={(v) => updateField("companyAddress", v)}
              className={inputClass}
            />
          </View>
          <View className="space-y-1.5">
            <Label className="text-xs font-bold">Company Maps Link</Label>
            <Input
              placeholder="https://maps.google.com/..."
              value={form.companyMapsLink}
              onChangeText={(v) => updateField("companyMapsLink", v)}
              className={inputClass}
            />
          </View>
          <View className="space-y-1.5">
            <Label className="text-xs font-bold">Business Photo / Logo</Label>
            <Button
              variant="outline"
              className="w-full gap-2 rounded-xl border-primary/30"
              onPress={handleLogoUpload}
            >
              <Camera size={14} color="#2563eb" />
              {form.logoPreview ? "Change Photo" : "Add Photo"}
            </Button>
            {form.logoPreview ? (
              <View className="mt-2 items-center">
                <Image
                  source={{ uri: form.logoPreview }}
                  style={{ height: 120, width: 120, borderRadius: 16 }}
                />
              </View>
            ) : null}
          </View>
          <View className="space-y-1.5">
            <Label className="text-xs font-bold">Service Mode *</Label>
            <Text className="text-xs text-muted-foreground">
              Where do you serve your customers?
            </Text>
            <View className="flex-row gap-2 mt-1">
              {[
                { value: "home", label: "?? Home Service", desc: "We visit the customer" },
                { value: "visit", label: "?? At Business", desc: "Customer visits us" },
                { value: "both", label: "?? Both", desc: "Home & business" },
              ].map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() =>
                    setForm((prev) => ({
                      ...prev,
                      serviceMode: opt.value,
                      homeService: opt.value === "home" || opt.value === "both",
                    }))
                  }
                  className={cn(
                    "flex-1 rounded-xl border-2 px-2 py-3",
                    form.serviceMode === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/30"
                  )}
                >
                  <Text className="text-sm font-semibold text-foreground text-center">
                    {opt.label}
                  </Text>
                  <Text className="text-[10px] text-muted-foreground text-center mt-0.5">
                    {opt.desc}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </AccordionSection>

        <AccordionSection
          title="About Business"
          subtitle="Describe your services and hours"
          isOpen={!!openSections.about}
          onToggle={() => toggleSection("about")}
          stepNum={3}
          isComplete={sectionComplete.about}
        >
          <View className="space-y-1.5">
            <Label className="text-xs font-bold">About Business</Label>
            <Textarea
              placeholder="Brief description of your business or services"
              value={form.description}
              onChangeText={(v) => updateField("description", v)}
              rows={3}
              className={inputClass}
            />
          </View>
          <View className="space-y-1.5">
            <Label className="text-xs font-bold">Business Hours</Label>
            <Select value={form.businessHours} onValueChange={(v) => updateField("businessHours", v)}>
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder="Set business hours" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="9am-6pm">9:00 AM � 6:00 PM</SelectItem>
                <SelectItem value="9am-9pm">9:00 AM � 9:00 PM</SelectItem>
                <SelectItem value="10am-8pm">10:00 AM � 8:00 PM</SelectItem>
                <SelectItem value="24x7">24 x 7</SelectItem>
              </SelectContent>
            </Select>
          </View>
          <View className="space-y-1.5">
            <Label className="text-xs font-bold">Category</Label>
            <Select value={form.category} onValueChange={(v) => updateField("category", v)}>
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.emoji} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </View>
          <View className="space-y-1.5">
            <Label className="text-xs font-bold">Services (max 8)</Label>
            <View className="flex-row gap-2">
              <Input
                placeholder="Add a service"
                value={serviceInput}
                onChangeText={setServiceInput}
                onSubmitEditing={addService}
                className={cn("flex-1", inputClass)}
              />
              <Button size="sm" className="rounded-xl" onPress={addService}>
                <Plus size={14} color="#ffffff" /> Add
              </Button>
            </View>
            {form.services.length > 0 && (
              <View className="flex-row flex-wrap gap-1.5 mt-2">
                {form.services.map((s, i) => (
                  <View key={`${s}-${i}`} className="flex-row items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1">
                    <Text className="text-xs font-medium text-primary">{s}</Text>
                    <Pressable onPress={() => removeService(i)}>
                      <X size={12} color="#2563eb" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
          <View className="space-y-1.5">
            <Label className="text-xs font-bold">Established Year</Label>
            <Input
              placeholder="e.g. 2020"
              value={form.establishedYear}
              onChangeText={(v) => updateField("establishedYear", v)}
              keyboardType="number-pad"
              className={inputClass}
            />
          </View>
        </AccordionSection>

        <AccordionSection
          title="Special Offer"
          subtitle="Attract customers with an offer"
          isOpen={!!openSections.offer}
          onToggle={() => toggleSection("offer")}
          stepNum={4}
          isComplete={sectionComplete.offer}
        >
          <View className="space-y-1.5">
            <Label className="text-xs font-bold">Offer</Label>
            <Input
              placeholder="e.g. 20% off on first service"
              value={form.offer}
              onChangeText={(v) => updateField("offer", v)}
              className={inputClass}
            />
          </View>
        </AccordionSection>

        <AccordionSection
          title="Social Media"
          subtitle="Connect on social platforms"
          isOpen={!!openSections.social}
          onToggle={() => toggleSection("social")}
          stepNum={5}
          isComplete={sectionComplete.social}
        >
          <View className="space-y-1.5">
            <Label className="text-xs font-bold">Instagram</Label>
            <Input
              placeholder="@yourbusiness"
              value={form.instagram}
              onChangeText={(v) => updateField("instagram", v)}
              className={inputClass}
            />
          </View>
          <View className="space-y-1.5">
            <Label className="text-xs font-bold">Facebook</Label>
            <Input
              placeholder="facebook.com/yourbusiness"
              value={form.facebook}
              onChangeText={(v) => updateField("facebook", v)}
              className={inputClass}
            />
          </View>
          <View className="space-y-1.5">
            <Label className="text-xs font-bold">LinkedIn</Label>
            <Input
              placeholder="linkedin.com/in/yourprofile"
              value={form.linkedin}
              onChangeText={(v) => updateField("linkedin", v)}
              className={inputClass}
            />
          </View>
          <View className="space-y-1.5">
            <Label className="text-xs font-bold">YouTube</Label>
            <Input
              placeholder="youtube.com/@yourchannel"
              value={form.youtube}
              onChangeText={(v) => updateField("youtube", v)}
              className={inputClass}
            />
          </View>
          <View className="space-y-1.5">
            <Label className="text-xs font-bold">Twitter / X</Label>
            <Input
              placeholder="@yourhandle"
              value={form.twitter}
              onChangeText={(v) => updateField("twitter", v)}
              className={inputClass}
            />
          </View>
        </AccordionSection>

        <AccordionSection
          title="Additional Information"
          subtitle="Keywords and search optimization"
          isOpen={!!openSections.additional}
          onToggle={() => toggleSection("additional")}
          stepNum={6}
          isComplete={sectionComplete.additional}
        >
          <View className="space-y-1.5">
            <Label className="text-xs font-bold">Keywords</Label>
            <Textarea
              placeholder="Add keywords separated by commas to help people find your card"
              value={form.keywords}
              onChangeText={(v) => updateField("keywords", v)}
              rows={2}
              className={inputClass}
            />
          </View>
        </AccordionSection>
      </ScrollView>

      <View className="absolute bottom-56 left-0 right-0 border-t border-border bg-card px-4 py-3">
        <Pressable
          onPress={handleSubmit}
          disabled={submitDisabled}
          className="w-full items-center justify-center rounded-xl bg-primary py-6"
          style={submitDisabled ? { opacity: 0.6 } : undefined}
        >
          <Text style={{ color: colors.primaryForeground, fontSize: 16, fontWeight: "700" }}>
            {submitLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default CardCreate;


