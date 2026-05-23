import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { addYears } from "date-fns";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ArrowLeft, CalendarDays, Globe, Image as ImageIcon, Plus, Upload, X } from "lucide-react-native";
import Svg, { Path, Rect, Circle, Line } from "react-native-svg";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { Textarea } from "../components/ui/textarea";
import { useAuth } from "../hooks/useAuth";
import { usePromotionContext } from "../contexts/PromotionContext";
import { useCreateVoucher } from "../hooks/useVouchers";
import { POPULAR_INDIAN_CITIES, normaliseCity } from "../data/indianCities";
import { useGetVoucherQuery, useUpdateVoucherMutation, useUploadVoucherImageMutation } from "../store/api/vouchersApi";
import { toast } from "../lib/toast";
import { useIconColor } from "../theme/colors";

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
  const iconColor = useIconColor();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const routePromotionId = route?.params?.promotionId ? Number(route.params.promotionId) : null;
  const editVoucherId: number | null = route?.params?.voucherId ? Number(route.params.voucherId) : null;
  const isEditMode = Boolean(editVoucherId);
  const { user } = useAuth();
  const { selectedPromotion, selectedPromotionId } = usePromotionContext();
  const createVoucher = useCreateVoucher();
  const [updateVoucher, { isLoading: isUpdating }] = useUpdateVoucherMutation();
  const [uploadVoucherImage] = useUploadVoucherImageMutation();
  const { data: editingVoucher } = useGetVoucherQuery(editVoucherId ?? 0, { skip: !editVoucherId });

  const editingPromotionId = (editingVoucher as any)?.business_promotion_id ?? (editingVoucher as any)?.business_promotion?.id ?? null;
  const resolvedPromotionId = routePromotionId || editingPromotionId || selectedPromotionId;

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showValidTillPicker, setShowValidTillPicker] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [uploadingField, setUploadingField] = useState<"voucher_image" | "voucher_banner" | null>(null);

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
    min_claim: "1",
    max_claims: "",
    is_popular: false,
    company_name: "",
    phone_number: "",
    address: "",
    city: "",
    pincode: "",
    allows_installment: false,
    upfront_amount: "",
    what_we_do: "",
    website: "",
    instagram: "",
    facebook: "",
    youtube: "",
    addresses: [""],
    marketed_by_instantlly: false,
    voucher_start_no: "",
    voucher_end_no: "",
    voucher_image: "",
    voucher_banner: "",
    expires_at: "",
  });

  const update = (field: string, value: any) => setForm((p) => ({ ...p, [field]: value }));

  // Auto-fill voucher_start_no = 1 and voucher_end_no = max_claims whenever Total Vouchers changes.
  // These fields are read-only and always derived from Total Vouchers.
  useEffect(() => {
    const max = parseInt(form.max_claims, 10);
    if (!form.max_claims || Number.isNaN(max) || max <= 0) {
      setForm((p) => ({ ...p, voucher_start_no: "", voucher_end_no: "" }));
      return;
    }
    setForm((p) => ({
      ...p,
      voucher_start_no: "1",
      voucher_end_no: String(max),
    }));
  }, [form.max_claims]);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Pre-fill form when editing
  useEffect(() => {
    if (!editingVoucher) return;
    const v: any = editingVoucher;
    setForm({
      title: v.title ?? "",
      subtitle: v.subtitle ?? "",
      category: v.category && voucherCategories.includes(v.category) ? v.category : "general",
      original_price: v.original_price != null ? String(v.original_price) : v.mrp != null ? String(v.mrp) : "",
      discounted_price: v.discounted_price != null ? String(v.discounted_price) : v.discount_value != null ? String(v.discount_value) : "",
      discount_label: v.discount_label ?? "",
      terms: v.terms ?? "",
      code: v.code ?? "",
      min_claim: v.min_vouchers_required != null ? String(v.min_vouchers_required) : "",
      max_claims: v.max_claims != null ? String(v.max_claims) : "",
      expires_at: v.expires_at ? new Date(v.expires_at).toISOString().slice(0, 10) : "",
      is_popular: Boolean(v.is_published),
      company_name: v.company_name ?? "",
      phone_number: v.phone_number ?? "",
      address: v.address ?? "",
      city: normaliseCity(v.city ?? ""),
      pincode: v.pincode ?? "",
      allows_installment: Boolean(v.allows_installment),
      upfront_amount: v.upfront_amount != null ? String(v.upfront_amount) : "",
      what_we_do: v.what_we_do ?? "",
      website: v.website ?? "",
      instagram: v.instagram ?? "",
      facebook: (v as any).facebook ?? "",
      youtube: (v as any).youtube ?? "",
      addresses: Array.isArray((v as any).addresses) && (v as any).addresses.length > 0
        ? (v as any).addresses
        : [(v as any).address ?? ""],
      marketed_by_instantlly: Boolean(v.marketed_by_instantlly),
      voucher_start_no: v.voucher_start_no != null ? String(v.voucher_start_no) : "",
      voucher_end_no: v.voucher_end_no != null ? String(v.voucher_end_no) : "",
      voucher_image: v.voucher_image ?? "",
      voucher_banner: v.voucher_banner ?? "",
    });
  }, [editingVoucher]);

  const formatDateForInput = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const parsedValidTill = form.expires_at ? new Date(form.expires_at) : null;
  const validTillDate = parsedValidTill && !isNaN(parsedValidTill.getTime()) ? parsedValidTill : null;

  const handleValidTillChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowValidTillPicker(false);
    if (event.type === "dismissed" || !selectedDate) return;
    update("expires_at", formatDateForInput(selectedDate));
  };

  const pickImage = async (field: "voucher_image" | "voucher_banner") => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") { toast.error("Gallery permission required"); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: field !== "voucher_banner",
        quality: 0.8,
        ...(field !== "voucher_banner" ? { aspect: [1, 1] as [number, number] } : {}),
      });
      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      // Show local preview immediately
      update(field, asset.uri);

      // Upload to S3
      setUploadingField(field);
      try {
        const fileName = asset.fileName || asset.uri.split("/").pop() || "voucher.jpg";
        const formData = new FormData();
        formData.append("file", {
          uri: Platform.OS === "android" ? asset.uri : asset.uri.replace("file://", ""),
          name: fileName,
          type: asset.mimeType || "image/jpeg",
        } as any);

        const { url } = await uploadVoucherImage(formData).unwrap();
        update(field, url);
        toast.success("Image uploaded");
      } catch (uploadErr: any) {
        console.error("[VoucherCreate] Image upload failed:", uploadErr);
        update(field, "");
        toast.error(uploadErr?.data?.error || "Failed to upload image");
      } finally {
        setUploadingField(null);
      }
    } catch (e: any) {
      toast.error(e?.message || "Could not open image picker");
      setUploadingField(null);
    }
  };

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
    if (!form.title || form.title.trim().length < 3) nextErrors.title = "Title is required";
    if (!form.city || !form.city.trim()) nextErrors.city = "City is required";
    const pincodeTrimmed = (form.pincode || "").trim();
    if (!pincodeTrimmed) {
      nextErrors.pincode = "Pincode is required";
    } else if (!/^\d{4,10}$/.test(pincodeTrimmed)) {
      nextErrors.pincode = "Pincode is required";
    }

    const original = Number(form.original_price);
    const discounted = Number(form.discounted_price);
    if (!form.original_price || Number.isNaN(original) || original <= 0) nextErrors.original_price = "Original price is required";
    if (!form.discounted_price || Number.isNaN(discounted) || discounted < 0) nextErrors.discounted_price = "Discounted price is required";
    if (!Number.isNaN(original) && !Number.isNaN(discounted) && discounted > original) {
      nextErrors.discounted_price = "Discounted price cannot exceed original price";
    }

    const minClaim = Number(form.min_claim);
    if (!form.min_claim || !String(form.min_claim).trim()) {
      nextErrors.min_claim = "Min claim is required";
    } else if (Number.isNaN(minClaim) || minClaim < 1) {
      nextErrors.min_claim = "Min claim must be at least 1";
    }

    const maxClaimsNum = Number(form.max_claims);
    if (!form.max_claims || !String(form.max_claims).trim()) {
      nextErrors.max_claims = "Total vouchers is required";
    } else if (Number.isNaN(maxClaimsNum) || maxClaimsNum < 1) {
      nextErrors.max_claims = "Total vouchers must be at least 1";
    } else if (!Number.isNaN(minClaim) && minClaim > maxClaimsNum) {
      nextErrors.min_claim = "Min claim cannot exceed total vouchers";
    }

    const startNoTrimmed = (form.voucher_start_no || "").trim();
    const endNoTrimmed = (form.voucher_end_no || "").trim();
    const startNo = Number(startNoTrimmed);
    const endNo = Number(endNoTrimmed);
    if (!startNoTrimmed) {
      nextErrors.voucher_start_no = "Voucher start no. is required";
    } else if (Number.isNaN(startNo) || startNo < 0) {
      nextErrors.voucher_start_no = "Enter a valid start number";
    }
    if (!endNoTrimmed) {
      nextErrors.voucher_end_no = "Voucher end no. is required";
    } else if (Number.isNaN(endNo) || endNo < 0) {
      nextErrors.voucher_end_no = "Enter a valid end number";
    }
    if (!nextErrors.voucher_start_no && !nextErrors.voucher_end_no && endNo < startNo) {
      nextErrors.voucher_end_no = "End no. must be greater than or equal to start no.";
    }

    if (form.allows_installment) {
      const upfront = Number(form.upfront_amount);
      if (!form.upfront_amount || Number.isNaN(upfront) || upfront <= 0) {
        nextErrors.upfront_amount = "Upfront amount is required when installment is enabled";
      } else if (upfront >= Number(form.discounted_price || form.original_price)) {
        nextErrors.upfront_amount = "Upfront amount must be less than the voucher price";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const canSubmit = useMemo(() => {
    const original = Number(form.original_price);
    const discounted = Number(form.discounted_price);
    const startNo = Number(form.voucher_start_no);
    const endNo = Number(form.voucher_end_no);
    const minClaim = Number(form.min_claim);
    const maxClaimsNum = Number(form.max_claims);
    return Boolean(
      resolvedPromotionId &&
      form.title.trim().length >= 3 &&
      form.city.trim().length > 0 &&
      form.pincode.trim().length > 0 &&
      !Number.isNaN(original) &&
      !Number.isNaN(discounted) &&
      original > 0 &&
      discounted >= 0 &&
      discounted <= original &&
      String(form.min_claim).trim().length > 0 &&
      !Number.isNaN(minClaim) &&
      minClaim >= 1 &&
      String(form.max_claims).trim().length > 0 &&
      !Number.isNaN(maxClaimsNum) &&
      maxClaimsNum >= 1 &&
      minClaim <= maxClaimsNum &&
      form.voucher_start_no.trim().length > 0 &&
      form.voucher_end_no.trim().length > 0 &&
      !Number.isNaN(startNo) &&
      !Number.isNaN(endNo) &&
      endNo >= startNo
    );
  }, [resolvedPromotionId, form.title, form.original_price, form.discounted_price, form.city, form.pincode, form.min_claim, form.max_claims, form.voucher_start_no, form.voucher_end_no]);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please sign in");
      navigation.navigate("Auth");
      return;
    }
    if (uploadingField) {
      toast.error("Please wait for the image to finish uploading");
      return;
    }
    if (!validateForm()) {
      return;
    }
    // Guard: never submit local file:// URIs
    const isLocalUri = (u: string) => !!u && (u.startsWith("file://") || u.startsWith("content://") || u.startsWith("ph://"));
    if (isLocalUri(form.voucher_image) || isLocalUri(form.voucher_banner)) {
      toast.error("Image is still uploading. Please try again in a moment.");
      return;
    }
    if (!validateForm()) {
      toast.error("Please fix highlighted fields");
      return;
    }
    const original = Number(form.original_price);
    const discounted = Number(form.discounted_price);
    let discountType = "flat";
    let discountValue = 0;
    if (original > 0 && discounted >= 0 && discounted <= original) {
      discountType = "percent";
      discountValue = Math.round(((original - discounted) / original) * 100);
    } else {
      discountValue = Math.max(0, original - discounted);
    }

    const expiresAt = form.expires_at ? new Date(form.expires_at) : addYears(new Date(), 1);

    const payload: any = {
      business_promotion_id: resolvedPromotionId,
      title: form.title,
      subtitle: form.subtitle || null,
      category: form.category,
      original_price: original,
      discounted_price: discounted,
      discount_type: discountType,
      discount_value: discountValue,
      discount_label: form.discount_label || null,
      terms: form.terms || null,
      code: form.code || null,
      min_claim: form.min_claim ? parseInt(form.min_claim, 10) : 1,
      max_claims: form.max_claims ? parseInt(form.max_claims, 10) : null,
      expires_at: expiresAt.toISOString(),
      is_popular: form.is_popular,
      company_name: form.company_name || null,
      phone_number: form.phone_number || null,
      address: form.addresses.filter(Boolean)[0] || null,
      addresses: form.addresses.filter(Boolean),
      city: normaliseCity(form.city),
      pincode: form.pincode.trim(),
      allows_installment: form.allows_installment,
      upfront_amount: form.allows_installment && form.upfront_amount ? parseFloat(form.upfront_amount) : null,
      what_we_do: form.what_we_do || null,
      website: form.website || null,
      instagram: form.instagram || null,
      facebook: form.facebook || null,
      youtube: form.youtube || null,
      marketed_by_instantlly: form.marketed_by_instantlly,
      voucher_start_no: form.voucher_start_no ? parseInt(form.voucher_start_no, 10) : null,
      voucher_end_no: form.voucher_end_no ? parseInt(form.voucher_end_no, 10) : null,
      voucher_image: form.voucher_image || null,
      voucher_banner: form.voucher_banner || null,
    };
    if (isEditMode && editVoucherId) {
      try {
        await updateVoucher({ id: editVoucherId, ...payload }).unwrap();
        toast.success("Voucher updated");
        navigation.goBack();
      } catch (e: any) {
        const msg = e?.data?.error || e?.error || e?.message || "Failed to update voucher";
        console.error("updateVoucher failed:", e);
        toast.error(typeof msg === "string" ? msg : "Failed to update voucher");
      }
      return;
    }
    await createVoucher.mutateAsync(payload);
    navigation.navigate("Vouchers");
  };

  // Vouchers are available on every active promotion (free or paid).

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <View className="border-b border-border bg-card px-4 py-4 flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={iconColor} />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">{isEditMode ? "Edit Voucher" : "Create Voucher"}</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: isKeyboardVisible ? 24 : 104, gap: 10 }}
        className="px-4 py-5"
        keyboardShouldPersistTaps="handled"
      >
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
          <Label>Promo Code (Optional — unlocks discounted price)</Label>
          <Input
            placeholder="e.g. SUMMER30"
            value={form.code}
            onChangeText={(v) => update("code", v.toUpperCase())}
            autoCapitalize="characters"
          />
        </View>

        <View className="gap-2">
          <Label>What We Do (Optional)</Label>
          <Textarea
            placeholder="e.g. We offer premium spa treatments and wellness packages..."
            value={form.what_we_do}
            onChangeText={(v) => update("what_we_do", v)}
            rows={3}
          />
        </View>

        <View className="gap-2">
          <Label>Website (Optional)</Label>
          <View className="flex-row items-center gap-2">
            <Globe size={16} color={iconColor} />
            <Input
              className="flex-1"
              placeholder="https://yourwebsite.com"
              value={form.website}
              onChangeText={(v) => update("website", v)}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>
        </View>

        <View className="gap-2">
          <Label>Instagram (Optional)</Label>
          <View className="flex-row items-center gap-2">
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#E1306C" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <Circle cx="12" cy="12" r="4" />
              <Line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </Svg>
            <Input
              className="flex-1"
              placeholder="@yourbusiness or https://instagram.com/..."
              value={form.instagram}
              onChangeText={(v) => update("instagram", v)}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <Text className="text-xs text-muted-foreground">Enter @username or full Instagram URL</Text>
        </View>

        <View className="gap-2">
          <Label>Facebook (Optional)</Label>
          <View className="flex-row items-center gap-2">
            <Svg width={16} height={16} viewBox="0 0 24 24">
              <Path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" fill="#1877F2" />
            </Svg>
            <Input
              className="flex-1"
              placeholder="@yourbusiness or https://facebook.com/..."
              value={form.facebook}
              onChangeText={(v) => update("facebook", v)}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <Text className="text-xs text-muted-foreground">Enter @pagename or full Facebook URL</Text>
        </View>

        <View className="gap-2">
          <Label>YouTube (Optional)</Label>
          <View className="flex-row items-center gap-2">
            <Svg width={16} height={16} viewBox="0 0 24 24">
              <Path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.96-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" fill="#FF0000" /><Path d="M9.75 15.02V8.98L15.5 12l-5.75 3.02z" fill="#fff" />
            </Svg>
            <Input
              className="flex-1"
              placeholder="https://youtube.com/@yourchannel"
              value={form.youtube}
              onChangeText={(v) => update("youtube", v)}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <Text className="text-xs text-muted-foreground">Enter channel URL or @handle</Text>
        </View>

        <View className="flex-row items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
          <View className="flex-1 pr-2">
            <Label>Marketed by Instantlly Cards</Label>
            <Text className="text-xs text-muted-foreground mt-1">
              Adds an Instantlly Cards promotion section at the end of the voucher detail page
            </Text>
          </View>
          <Switch
            checked={form.marketed_by_instantlly}
            onCheckedChange={(v) => update("marketed_by_instantlly", v)}
          />
        </View>

        <View className="gap-2">
          <Label>Voucher Logo (Optional)</Label>
          <Text className="text-xs text-muted-foreground">Shows as logo icon on the voucher card</Text>
          <Pressable
            onPress={() => pickImage("voucher_image")}
            disabled={uploadingField === "voucher_image"}
            className="rounded-xl border-2 border-dashed border-border items-center justify-center py-6 gap-2"
          >
            {form.voucher_image ? (
              <Image source={{ uri: form.voucher_image }} className="w-24 h-24 rounded-xl" resizeMode="cover" />
            ) : (
              <>
                <ImageIcon size={32} color={iconColor} />
                <Text className="text-xs text-muted-foreground">Tap to select logo image (1:1)</Text>
              </>
            )}
            {uploadingField === "voucher_image" ? (
              <View className="absolute inset-0 items-center justify-center bg-background/70 rounded-xl">
                <ActivityIndicator size="small" />
                <Text className="text-xs text-muted-foreground mt-1">Uploading...</Text>
              </View>
            ) : null}
          </Pressable>
          {form.voucher_image ? (
            <Pressable onPress={() => update("voucher_image", "")}>
              <Text className="text-xs text-destructive text-center">Remove</Text>
            </Pressable>
          ) : null}
        </View>

        <View className="gap-2">
          <Label>Voucher Banner (Optional)</Label>
          <Text className="text-xs text-muted-foreground">Full-width banner shown when customer taps the voucher card</Text>
          <Pressable
            onPress={() => pickImage("voucher_banner")}
            disabled={uploadingField === "voucher_banner"}
            className="rounded-xl border-2 border-dashed border-border items-center justify-center py-6 gap-2"
          >
            {form.voucher_banner ? (
              <Image source={{ uri: form.voucher_banner }} className="w-full h-40 rounded-xl" resizeMode="cover" />
            ) : (
              <>
                <Upload size={32} color={iconColor} />
                <Text className="text-xs text-muted-foreground">Tap to select banner image (16:9)</Text>
              </>
            )}
            {uploadingField === "voucher_banner" ? (
              <View className="absolute inset-0 items-center justify-center bg-background/70 rounded-xl">
                <ActivityIndicator size="small" />
                <Text className="text-xs text-muted-foreground mt-1">Uploading...</Text>
              </View>
            ) : null}
          </Pressable>
          {form.voucher_banner ? (
            <Pressable onPress={() => update("voucher_banner", "")}>
              <Text className="text-xs text-destructive text-center">Remove</Text>
            </Pressable>
          ) : null}
        </View>

        <View className="gap-2">
          <Label>Company Name</Label>
          <Input
            placeholder="e.g. Luxe Spa & Wellness"
            value={form.company_name}
            onChangeText={(v) => update("company_name", v)}
          />
        </View>

        <View className="gap-2">
          <Label>Phone Number</Label>
          <Input
            placeholder="e.g. 9876543210"
            keyboardType="phone-pad"
            value={form.phone_number}
            onChangeText={(v) => update("phone_number", v)}
          />
        </View>

        <View className="gap-2">
          <Label>Addresses (Where to Redeem)</Label>
          {form.addresses.map((addr, idx) => (
            <View key={idx} className="flex-row items-center gap-2">
              <Input
                className="flex-1"
                placeholder={idx === 0 ? "e.g. Shop 5, MG Road, Bengaluru" : "Additional address"}
                value={addr}
                onChangeText={(v) => {
                  const next = [...form.addresses];
                  next[idx] = v;
                  update("addresses", next);
                }}
              />
              {form.addresses.length > 1 && (
                <Pressable
                  onPress={() => update("addresses", form.addresses.filter((_, i) => i !== idx))}
                  className="p-1"
                >
                  <X size={16} color="#ef4444" />
                </Pressable>
              )}
            </View>
          ))}
          {form.addresses.length < 5 && (
            <Pressable
              onPress={() => update("addresses", [...form.addresses, ""])}
              className="flex-row items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2.5"
            >
              <Plus size={15} color="#2463eb" />
              <Text className="text-sm font-medium text-primary">Add another address</Text>
            </Pressable>
          )}
        </View>

        <View className="gap-2">
          <Label>City *</Label>
          <Select value={form.city} onValueChange={(v) => update("city", normaliseCity(v))}>
            <SelectTrigger>
              <SelectValue placeholder="Select city" />
            </SelectTrigger>
            <SelectContent>
              {POPULAR_INDIAN_CITIES.map((c) => (
                <SelectItem key={c.city} value={c.city}>
                  {c.city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.city ? <Text className="text-xs text-destructive">{errors.city}</Text> : null}
        </View>

        <View className="gap-2">
          <Label>Pincode *</Label>
          <Input
            placeholder="e.g. 560001"
            keyboardType="number-pad"
            value={form.pincode}
            onChangeText={(v) => update("pincode", v)}
          />
          {errors.pincode ? <Text className="text-xs text-destructive">{errors.pincode}</Text> : null}
        </View>

        <View className="gap-2">
          <Label>Terms & Conditions</Label>
          <Textarea
            placeholder="e.g. Valid Mon-Fri only. Cannot be combined with other offers."
            value={form.terms}
            onChangeText={(v) => update("terms", v)}
            rows={3}
            className="text-base"
          />
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 gap-2">
            <Label>Min Claim *</Label>
            <Input
              placeholder="1"
              keyboardType="number-pad"
              value={form.min_claim}
              onChangeText={(v) => update("min_claim", v.replace(/[^0-9]/g, ""))}
            />
            {errors.min_claim ? <Text className="text-xs text-destructive">{errors.min_claim}</Text> : null}
          </View>
          <View className="flex-1 gap-2">
            <Label>Total Vouchers Available *</Label>
            <Input
              placeholder="e.g. 100"
              keyboardType="number-pad"
              value={form.max_claims}
              onChangeText={(v) => update("max_claims", v.replace(/[^0-9]/g, ""))}
            />
            {errors.max_claims ? <Text className="text-xs text-destructive">{errors.max_claims}</Text> : null}
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 gap-2">
            <Label>Voucher Start No.</Label>
            <Input
              placeholder="Auto"
              value={form.voucher_start_no ? String(form.voucher_start_no).padStart(3, "0") : ""}
              editable={false}
              keyboardType="number-pad"
              className="bg-muted/40 text-muted-foreground"
            />
          </View>
          <View className="flex-1 gap-2">
            <Label>Voucher End No.</Label>
            <Input
              placeholder="Auto"
              value={form.voucher_end_no ? String(form.voucher_end_no).padStart(3, "0") : ""}
              editable={false}
              keyboardType="number-pad"
              className="bg-muted/40 text-muted-foreground"
            />
          </View>
        </View>
        <Text className="text-[11px] text-muted-foreground -mt-1">Auto-filled from Total Vouchers (e.g. 001 to {form.max_claims ? String(form.max_claims).padStart(3, "0") : "NNN"}). Not editable.</Text>

        <View className="gap-2">
          <Label>Valid Till</Label>
          <Pressable onPress={() => setShowValidTillPicker(true)}>
            <View pointerEvents="none">
              <Input
                placeholder="Select date"
                value={form.expires_at}
                editable={false}
              />
            </View>
            <View className="absolute right-3 top-3">
              <CalendarDays size={16} color={iconColor} />
            </View>
          </Pressable>
          {errors.expires_at ? <Text className="text-xs text-destructive">{errors.expires_at}</Text> : null}
          {validTillDate ? (
            <Text className="text-xs text-muted-foreground">
              This voucher is valid till {validTillDate.toLocaleDateString()}.
            </Text>
          ) : null}
        </View>

        {showValidTillPicker && (
          <DateTimePicker
            value={validTillDate ?? new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            minimumDate={new Date()}
            onChange={handleValidTillChange}
          />
        )}

        <View className="flex-row items-center justify-between rounded-xl border border-border bg-card p-4">
          <View>
            <Text className="text-sm font-medium text-foreground">Allow Installment Payment</Text>
            <Text className="text-xs text-muted-foreground">Buyer pays upfront now, rest within 30 days</Text>
          </View>
          <Switch checked={form.allows_installment} onCheckedChange={(v) => update("allows_installment", v)} />
        </View>

        {form.allows_installment && (
          <View className="gap-2">
            <Label>Upfront Amount (₹) *</Label>
            <Input
              placeholder="e.g. 10000"
              keyboardType="number-pad"
              value={form.upfront_amount}
              onChangeText={(v) => update("upfront_amount", v)}
            />
            {errors.upfront_amount ? <Text className="text-xs text-destructive">{errors.upfront_amount}</Text> : null}
            <Text className="text-xs text-muted-foreground">
              Buyer pays this now and gets the voucher immediately. Remaining balance due within 30 days.
            </Text>
          </View>
        )}

        <View className="flex-row items-center justify-between rounded-xl border border-border bg-card p-4">
          <View>
            <Text className="text-sm font-medium text-foreground">Mark as Popular</Text>
            <Text className="text-xs text-muted-foreground">Featured in the popular section</Text>
          </View>
          <Switch checked={form.is_popular} onCheckedChange={(v) => update("is_popular", v)} />
        </View>
      </ScrollView>

      {!isKeyboardVisible && (
        <View className="border-t border-border bg-card px-4 py-3">
          <Button className="w-full rounded-xl py-4" onPress={handleSubmit} disabled={createVoucher.isPending || isUpdating}>
            {isEditMode
              ? (isUpdating ? "Saving..." : "Save Changes")
              : (createVoucher.isPending ? "Creating..." : "Create Voucher")}
          </Button>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

export default VoucherCreate;

