import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  Modal,
  Switch,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ArrowLeft, ChevronDown, ChevronRight, ChevronUp, X, Clock, Check, Search, Plus, Trash2 } from "lucide-react-native";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { useAuth } from "../hooks/useAuth";
import { useBusinessCards } from "../hooks/useBusinessCards";
import { useCreatePromotionMutation } from "../store/api/promotionsApi";
import { useUploadImageMutation } from "../store/api/businessCardsApi";
import { toast } from "../lib/toast";
import { cn } from "../lib/utils";
import { colors } from "../theme/colors";
import { categories as fallbackCategories } from "../data/categories";
import { useGetCategoryTreeQuery } from "../store/api/categoriesApi";
import { useAppDispatch } from "../store";
import { setCredentials, setActiveRole } from "../store/authSlice";
import * as SecureStore from 'expo-secure-store';
import type { CategoryTreeNode } from "../store/api/categoriesApi";
import { parseCategoryString } from "../lib/categoryUtils";
import { useIconColor } from "../theme/colors";

const STEPS = [
  { id: 1, title: "Business", label: "Business Information" },
  { id: 2, title: "Category", label: "Business Category" },
  { id: 3, title: "Contact", label: "Contact Details" },
  { id: 4, title: "Location", label: "Location & Credentials" },
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const inputClass = "rounded-xl bg-muted/50 border border-border text-base h-14 px-4";
const labelClass = "text-sm font-bold mb-2";

const s = StyleSheet.create({
  catOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  catDropdown: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "80%" },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  sheetTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 12 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f3f4f6", borderRadius: 12, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, fontSize: 15, color: "#111827" },
  pickItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  pickItemActive: { backgroundColor: "#eff6ff" },
  pickEmoji: { fontSize: 22, marginRight: 10, width: 30 },
  pickText: { fontSize: 15, color: "#111827", flex: 1, minHeight: 56 },
  pickTextActive: { color: "#2563eb", fontWeight: "600" },
  emptyState: { paddingVertical: 32, alignItems: "center" },
  emptyText: { fontSize: 15, color: "#9ca3af" },
});

const BusinessPromotionForm = () => {
  const iconColor = useIconColor();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const plan = route?.params?.plan || "free";
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const { createCard } = useBusinessCards();
  const [createPromotion] = useCreatePromotionMutation();
  const [uploadImage] = useUploadImageMutation();

  const MAX_IMAGES = 10;
  const [businessImages, setBusinessImages] = useState<{ uri: string; url: string | null; uploading: boolean }[]>([]);

  const pickBusinessImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error("Permission required to access photos");
      return;
    }
    const remaining = MAX_IMAGES - businessImages.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_IMAGES} images already selected`);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (result.canceled || !result.assets.length) return;
    // Add all images as uploading
    const newImages = result.assets.map(asset => ({ uri: asset.uri, url: null, uploading: true }));
    setBusinessImages(prev => [...prev, ...newImages]);
    // Upload all images
    for (let i = 0; i < newImages.length; i++) {
      const asset = result.assets[i];
      const idx = businessImages.length + i;
      try {
        const fileName = asset.fileName || `business-${Date.now()}-${i}.jpg`;
        const formData = new FormData();
        formData.append("file", {
          uri: asset.uri,
          name: fileName,
          type: asset.mimeType || "image/jpeg",
        } as any);
        const { url } = await uploadImage(formData).unwrap();
        setBusinessImages(prev => prev.map((img, j) => j === idx ? { ...img, url, uploading: false } : img));
      } catch (err: any) {
        toast.error("Image upload failed");
        setBusinessImages(prev => prev.filter((_, j) => j !== idx));
      }
    }
  };

  const removeBusinessImage = (index: number) => {
    setBusinessImages(prev => prev.filter((_, i) => i !== index));
  };

  const { data: categoryTree = [] } = useGetCategoryTreeQuery();

  const [currentStep, setCurrentStep] = useState(1);
  const [showBusinessHours, setShowBusinessHours] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  
  // Category picker state
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryPath, setCategoryPath] = useState<CategoryTreeNode[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [customCategory, setCustomCategory] = useState("");

  // Form state
  const [form, setForm] = useState({
    // Step 1: Business
    businessName: "",
    ownerName: "",
    businessHours: "",
    businessDescription: "",
    gstNumber: "",
    panNumber: "",

    // Step 2: Category
    category: "",

    // Step 3: Contact
    email: "",
    phone: "",
    additionalPhones: [] as string[],
    whatsapp: "",
    website: "",

    // Step 4: Location
    pincode: "",
    plotNo: "",
    locality: "",
    street: "",
    landmark: "",
    city: "",
    state: "",
  });

  // Business hours state
  const [businessHoursDays, setBusinessHoursDays] = useState<{
    [key: string]: { enabled: boolean; openTime: string; closeTime: string };
  }>({
    Sunday: { enabled: false, openTime: "9 AM", closeTime: "6 PM" },
    Monday: { enabled: true, openTime: "9 AM", closeTime: "6 PM" },
    Tuesday: { enabled: false, openTime: "9 AM", closeTime: "6 PM" },
    Wednesday: { enabled: false, openTime: "9 AM", closeTime: "6 PM" },
    Thursday: { enabled: false, openTime: "9 AM", closeTime: "6 PM" },
    Friday: { enabled: false, openTime: "9 AM", closeTime: "6 PM" },
    Saturday: { enabled: false, openTime: "9 AM", closeTime: "6 PM" },
  });

  const updateField = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const addAdditionalPhone = () => {
    setForm(prev => ({
      ...prev,
      additionalPhones: [...prev.additionalPhones, ""]
    }));
  };

  const updateAdditionalPhone = (index: number, value: string) => {
    setForm(prev => ({
      ...prev,
      additionalPhones: prev.additionalPhones.map((p, i) => i === index ? value : p)
    }));
  };

  const removeAdditionalPhone = (index: number) => {
    setForm(prev => ({
      ...prev,
      additionalPhones: prev.additionalPhones.filter((_, i) => i !== index)
    }));
  };

  const toggleDayHours = (day: string) => {
    setBusinessHoursDays(prev => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled },
    }));
  };

  const handleBusinessHoursDone = () => {
    const enabledDays = Object.entries(businessHoursDays).filter(([_, v]) => v.enabled);
    const hoursText = enabledDays.length === 7
      ? "Open 7 days a week"
      : `Open ${enabledDays.length} days a week`;
    updateField("businessHours", hoursText);
    setShowBusinessHours(false);
  };

  // Category picker handlers
  useEffect(() => {
    if (!showCategoryPicker) {
      setCategorySearch("");
      setCategoryPath([]);
      setSelectedSubcategories([]);
      setExpandedItems(new Set());
    } else {
      // Parse existing selection when modal opens
      if (form.category && form.category.includes(" > ")) {
        const parts = form.category.split(" > ");
        if (parts.length === 2) {
          const parentCategoryName = parts[0];
          const subcategories = parts[1].includes(", ") ? parts[1].split(", ") : [parts[1]];
          setSelectedSubcategories(subcategories);
          
          // Auto-navigate to parent category
          const parentNode = categoryTree.find(n => n.name === parentCategoryName);
          if (parentNode) {
            setCategoryPath([parentNode]);
          }
        }
      }
    }
  }, [showCategoryPicker, form.category, categoryTree]);

  const flattenCategoryTree = useCallback(
    (nodes: CategoryTreeNode[]): CategoryTreeNode[] =>
      nodes.reduce<CategoryTreeNode[]>(
        (acc, n) => [...acc, n, ...flattenCategoryTree(n.children)],
        []
      ),
    []
  );

  const toggleCategoryExpanded = (itemName: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemName)) {
        newSet.delete(itemName);
      } else {
        newSet.add(itemName);
      }
      return newSet;
    });
  };

  const toggleSubcategory = (name: string, hasChildren: boolean = false) => {
    setSelectedSubcategories(prev => {
      const isCurrentlySelected = prev.includes(name);
      
      // If selecting (not deselecting) and has children, auto-expand
      if (!isCurrentlySelected && hasChildren) {
        setExpandedItems(prevExpanded => {
          const newSet = new Set(prevExpanded);
          newSet.add(name);
          return newSet;
        });
      }
      
      // If deselecting, collapse it
      if (isCurrentlySelected && hasChildren) {
        setExpandedItems(prevExpanded => {
          const newSet = new Set(prevExpanded);
          newSet.delete(name);
          return newSet;
        });
      }
      
      return isCurrentlySelected 
        ? prev.filter(s => s !== name)
        : [...prev, name];
    });
  };

  const buildCategoryDisplayItems = useCallback((nodes: CategoryTreeNode[], level: number = 0): any[] => {
    const items: any[] = [];
    nodes.forEach((node) => {
      items.push({
        id: String(node.id),
        name: node.name,
        icon: node.icon,
        hasChildren: node.children.length > 0,
        node: node,
        level: level,
      });
      
      // If this item is expanded and has children, add them
      if (expandedItems.has(node.name) && node.children.length > 0) {
        items.push(...buildCategoryDisplayItems(node.children, level + 1));
      }
    });
    return items;
  }, [expandedItems]);

  const currentCategoryNodes = categoryPath.length > 0 ? categoryPath[categoryPath.length - 1].children : categoryTree;
  const categoryParentLabel = categoryPath.length > 0 ? categoryPath[categoryPath.length - 1].name : null;
  const isSubcategoryView = categoryPath.length > 0;

  const categoryDisplayItems = useMemo(() => {
    if (categorySearch) {
      const q = categorySearch.toLowerCase();
      if (categoryTree.length > 0) {
        return flattenCategoryTree(categoryTree)
          .filter((n) => n.name.toLowerCase().includes(q))
          .map((n) => ({
            id: String(n.id),
            name: n.name,
            icon: n.icon,
            hasChildren: n.children.length > 0,
            node: n,
            level: 0,
          }));
      }
      return fallbackCategories
        .filter((c) => c.name.toLowerCase().includes(q))
        .map((c) => ({ id: c.id, name: c.name, icon: c.emoji, hasChildren: false, node: null as CategoryTreeNode | null, level: 0 }));
    }
    if (categoryTree.length > 0) {
      return buildCategoryDisplayItems(currentCategoryNodes);
    }
    return fallbackCategories.map((c) => ({ id: c.id, name: c.name, icon: c.emoji, hasChildren: false, node: null as CategoryTreeNode | null, level: 0 }));
  }, [categorySearch, categoryTree, currentCategoryNodes, fallbackCategories, flattenCategoryTree, buildCategoryDisplayItems]);

  const handleCategoryDone = () => {
    if (selectedSubcategories.length > 0 && categoryParentLabel) {
      const categoryString = `${categoryParentLabel} > ${selectedSubcategories.join(", ")}`;
      updateField("category", categoryString);
    }
    setShowCategoryPicker(false);
  };

  const handleSimpleCategorySelect = (categoryName: string) => {
    updateField("category", categoryName);
    setShowCategoryPicker(false);
  };

  const handleCustomCategoryAdd = () => {
    if (customCategory.trim()) {
      updateField("category", `Custom: ${customCategory.trim()}`);
      setCustomCategory("");
      setShowCategoryPicker(false);
      toast.success("Custom category added");
    } else {
      toast.error("Please enter a category name");
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please sign in to create a card");
      navigation.navigate("Auth");
      return;
    }

    const cardData = {
      full_name: form.ownerName,
      phone: form.phone,
      email: form.email || null,
      whatsapp: form.whatsapp || null,
      company_name: form.businessName || null,
      company_phone: form.additionalPhones.filter(p => p.trim()).join(", ") || null,
      website: form.website || null,
      description: form.businessDescription || null,
      business_hours: form.businessHours || null,
      category: form.category || null,
      company_address: `${form.plotNo ? form.plotNo + ", " : ""}${form.street ? form.street + ", " : ""}${form.locality ? form.locality + ", " : ""}${form.city ? form.city + ", " : ""}${form.state || ""}`.trim() || null,
      pincode: form.pincode || null,
      gst_number: form.gstNumber || null,
      pan_number: form.panNumber || null,
      keywords: null,
      services: [],
      images: businessImages.filter(i => i.url).map(i => i.url),
    };

    // Check if premium plan - navigate to plan selection
    if (plan === "premium") {
      navigation.navigate("PremiumPlanSelection", { formData: cardData });
    } else {
      // Free plan - create card and promotion
      const card = await createCard.mutateAsync(cardData as any);
      const cardId = typeof card.id === 'string' ? parseInt(card.id, 10) : card.id;

      // Create a free BusinessPromotion record
      const categoryArray = parseCategoryString(cardData.category);
      const promoResult: any = await createPromotion({
        business_name: cardData.company_name || cardData.full_name,
        owner_name: cardData.full_name,
        description: cardData.description,
        email: cardData.email,
        phone: cardData.phone,
        whatsapp: cardData.whatsapp,
        website: cardData.website,
        pincode: cardData.pincode,
        city: form.city || null,
        state: form.state || null,
        business_card_id: cardId,
        category: categoryArray,
        listing_type: "free",
        listing_intent: "free",
        plan_type: "free",
      }).unwrap();

      // Update tokens + roles if returned by backend (business role granted on create)
      if (promoResult.accessToken && promoResult.refreshToken && promoResult.roles && user) {
        const updatedUser = { ...user, roles: promoResult.roles };
        dispatch(setCredentials({ user: updatedUser, accessToken: promoResult.accessToken, refreshToken: promoResult.refreshToken }));
        await SecureStore.setItemAsync('accessToken', promoResult.accessToken);
        await SecureStore.setItemAsync('refreshToken', promoResult.refreshToken);
        dispatch(setActiveRole('business'));
        await SecureStore.setItemAsync('activeRole', 'business');
        console.log('[BusinessPromoForm] Role + tokens updated after free promotion');
      }

      toast.success("Business listing created successfully!");
      navigation.navigate("MyCards");
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return form.businessName && form.ownerName;
      case 2:
        return form.category;
      case 3:
        return form.email && form.phone;
      case 4:
        return form.pincode && form.locality && form.street && form.city && form.state;
      default:
        return true;
    }
  };

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="border-b border-border bg-card px-4 py-4">
        <View className="flex-row items-center gap-3 mb-4">
          <Pressable onPress={handleBack}>
            <ArrowLeft size={20} color={iconColor} />
          </Pressable>
          <Text className="text-lg font-bold text-foreground">Business Promotion</Text>
        </View>

        {/* Step Indicators */}
        <View className="flex-row items-center">
          {STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <View className="items-center flex-1">
                <View
                  className={cn(
                    "h-10 w-10 rounded-full items-center justify-center",
                    currentStep >= step.id ? "bg-primary" : "bg-muted"
                  )}
                >
                  <Text
                    className={cn(
                      "font-bold",
                      currentStep >= step.id ? "text-primary-foreground" : "text-muted-foreground"
                    )}
                  >
                    {step.id}
                  </Text>
                </View>
                <Text
                  className={cn(
                    "text-xs mt-1",
                    currentStep === step.id ? "text-primary font-semibold" : "text-muted-foreground"
                  )}
                >
                  {step.title}
                </Text>
              </View>
              {index < STEPS.length - 1 && (
                <View className="h-0.5 flex-1 bg-border mt-[-16]" />
              )}
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* Form Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 }}
      >
        {/* Step 1: Business Information */}
        {currentStep === 1 && (
          <View className="gap-4">
            <View>
              <Text className="text-xl font-bold text-foreground mb-1">Business Information</Text>
              <Text className="text-sm text-muted-foreground">Step 1 of 4</Text>
            </View>

            <View>
              <Label className={labelClass}>Business Name *</Label>
              <Input
                placeholder="Enter your business name"
                value={form.businessName}
                onChangeText={(v) => updateField("businessName", v)}
                className={inputClass}
              />
            </View>

            <View>
              <Label className={labelClass}>Owner Name *</Label>
              <Input
                placeholder="Your full name"
                value={form.ownerName}
                onChangeText={(v) => updateField("ownerName", v)}
                className={inputClass}
              />
            </View>

            <View>
              <Label className={labelClass}>Business Hours</Label>
              <Pressable
                onPress={() => setShowBusinessHours(true)}
                className={inputClass}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
              >
                <Text style={{ color: form.businessHours ? colors.foreground : "#9ca3af" }}>
                  {form.businessHours || "Set business hours"}
                </Text>
                <ChevronDown size={16} color="#6b7280" />
              </Pressable>
            </View>

            <View>
              <Label className={labelClass}>Business Images (Optional, up to {MAX_IMAGES})</Label>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {businessImages.map((img, index) => (
                  <View
                    key={index}
                    style={{
                      width: 100, height: 100, borderRadius: 10,
                      overflow: "hidden", backgroundColor: "#f3f4f6",
                      borderWidth: 1, borderColor: img.url ? "#2563eb" : "#d1d5db",
                    }}
                  >
                    <Image
                      source={{ uri: img.uri }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="contain"
                    />
                    {img.uploading && (
                      <View style={{
                        position: "absolute", inset: 0, backgroundColor: "rgba(255,255,255,0.7)",
                        alignItems: "center", justifyContent: "center",
                      }}>
                        <ActivityIndicator size="small" color="#2563eb" />
                      </View>
                    )}
                    <Pressable
                      onPress={() => removeBusinessImage(index)}
                      style={{
                        position: "absolute", top: 4, right: 4,
                        backgroundColor: "rgba(0,0,0,0.6)",
                        borderRadius: 10, padding: 3,
                      }}
                    >
                      <X size={12} color="#fff" />
                    </Pressable>
                  </View>
                ))}
                {businessImages.length < MAX_IMAGES && (
                  <Pressable
                    onPress={pickBusinessImages}
                    style={{
                      width: 100, height: 100, borderRadius: 10,
                      borderWidth: 2, borderStyle: "dashed", borderColor: "#d1d5db",
                      backgroundColor: "#f9fafb", alignItems: "center", justifyContent: "center", gap: 4,
                    }}
                  >
                    <Plus size={28} color="#6b7280" />
                    <Text style={{ fontSize: 11, color: "#6b7280", textAlign: "center" }}>Add Photos</Text>
                  </Pressable>
                )}
              </View>
              {businessImages.length > 0 && (
                <Text style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>
                  {businessImages.length} image{businessImages.length > 1 ? "s" : ""} selected
                </Text>
              )}
            </View>

            <View>
              <Label className={labelClass}>Business Description</Label>
              <Textarea
                placeholder="Brief description of your business"
                value={form.businessDescription}
                onChangeText={(v) => updateField("businessDescription", v)}
                className="rounded-xl bg-muted/50 border border-border text-base px-4 py-4 min-h-[100px]"
              />
            </View>

            <View>
              <Label className={labelClass}>GST Number (Optional)</Label>
              <Input
                placeholder="22AAAAA0000A1Z5"
                value={form.gstNumber}
                onChangeText={(v) => updateField("gstNumber", v)}
                className={inputClass}
              />
              <Text className="text-xs text-muted-foreground mt-1">
                Format: 2 digits state code + 10 digit PAN + 3 characters
              </Text>
            </View>

            <View>
              <Label className={labelClass}>PAN Number (Optional)</Label>
              <Input
                placeholder="AAAAA0000A"
                value={form.panNumber}
                onChangeText={(v) => updateField("panNumber", v.toUpperCase())}
                className={inputClass}
                maxLength={10}
              />
            </View>
          </View>
        )}

        {/* Step 2: Category */}
        {currentStep === 2 && (
          <View className="gap-4">
            <View>
              <Text className="text-xl font-bold text-foreground mb-1">Business Category</Text>
              <Text className="text-sm text-muted-foreground">Step 2 of 4</Text>
            </View>

            <View>
              <Text className="text-lg font-bold text-foreground mb-2">Add Business Category <Text style={{ color: "#ef4444" }}>*</Text></Text>
              <Text className="text-sm text-muted-foreground mb-4">
                Choose the right business categories so your customer can easily find you
              </Text>

              <Pressable
                onPress={() => setShowCategoryPicker(true)}
                className={inputClass}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
              >
                <Text style={{ color: form.category ? colors.foreground : "#9ca3af" }}>
                  {form.category || "Type Business Category"}
                </Text>
                <ChevronDown size={16} color="#6b7280" />
              </Pressable>
            </View>
          </View>
        )}

        {/* Step 3: Contact Details */}
        {currentStep === 3 && (
          <View className="gap-4">
            <View>
              <Text className="text-xl font-bold text-foreground mb-1">Contact Details</Text>
              <Text className="text-sm text-muted-foreground">Step 3 of 4</Text>
            </View>

            <View>
              <Label className={labelClass}>Email Address *</Label>
              <Input
                placeholder="business@example.com"
                value={form.email}
                onChangeText={(v) => updateField("email", v)}
                keyboardType="email-address"
                className={inputClass}
              />
            </View>

            <View>
              <Label className={labelClass}>Phone Number *</Label>
              <Input
                placeholder="+91 98765 43210"
                value={form.phone}
                onChangeText={(v) => updateField("phone", v)}
                keyboardType="phone-pad"
                className={inputClass}
              />
            </View>

            {form.additionalPhones.map((phone, index) => (
              <View key={index} className="gap-2">
                <View className="flex-row items-center justify-between">
                  <Label className={labelClass}>Additional Phone {index + 1}</Label>
                  <Pressable
                    onPress={() => removeAdditionalPhone(index)}
                    className="flex-row items-center gap-1"
                  >
                    <Trash2 size={16} color="#ef4444" />
                    <Text className="text-sm text-red-500">Remove</Text>
                  </Pressable>
                </View>
                <Input
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChangeText={(v) => updateAdditionalPhone(index, v)}
                  keyboardType="phone-pad"
                  className={inputClass}
                />
              </View>
            ))}

            <Pressable 
              onPress={addAdditionalPhone}
              className="flex-row items-center gap-2 py-2"
            >
              <Plus size={18} color="#2563eb" />
              <Text className="text-sm font-semibold text-primary">Add Phone</Text>
            </Pressable>

            <View>
              <Label className={labelClass}>WhatsApp Number</Label>
              <Input
                placeholder="+91 98765 43210"
                value={form.whatsapp}
                onChangeText={(v) => updateField("whatsapp", v)}
                keyboardType="phone-pad"
                className={inputClass}
              />
            </View>

            <View>
              <Label className={labelClass}>Website (Optional)</Label>
              <Input
                placeholder="www.yourbusiness.com"
                value={form.website}
                onChangeText={(v) => updateField("website", v)}
                keyboardType="url"
                className={inputClass}
              />
            </View>
          </View>
        )}

        {/* Step 4: Location & Credentials */}
        {currentStep === 4 && (
          <View className="gap-4">
            <View>
              <Text className="text-xl font-bold text-foreground mb-1">Location & Credentials</Text>
              <Text className="text-sm text-muted-foreground">Step 4 of 4</Text>
            </View>

            <View>
              <Label className={labelClass}>Pincode *</Label>
              <Input
                placeholder="Enter pincode"
                value={form.pincode}
                onChangeText={(v) => updateField("pincode", v)}
                keyboardType="number-pad"
                maxLength={6}
                className={inputClass}
              />
            </View>

            <View>
              <Label className={labelClass}>Plot No. / Bldg No. / Wing / Shop No. / Floor</Label>
              <Input
                placeholder="e.g., Behram Baug, 605"
                value={form.plotNo}
                onChangeText={(v) => updateField("plotNo", v)}
                className={inputClass}
              />
            </View>

            <View>
              <Label className={labelClass}>Business Locality *</Label>
              <Input
                placeholder="e.g., Range Heights"
                value={form.locality}
                onChangeText={(v) => updateField("locality", v)}
                className={inputClass}
              />
            </View>

            <View>
              <Label className={labelClass}>Street / Road Name *</Label>
              <Input
                placeholder="e.g., Behram Baug"
                value={form.street}
                onChangeText={(v) => updateField("street", v)}
                className={inputClass}
              />
            </View>

            <View>
              <Label className={labelClass}>Landmark</Label>
              <Input
                placeholder="e.g., Coliseum"
                value={form.landmark}
                onChangeText={(v) => updateField("landmark", v)}
                className={inputClass}
              />
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Label className={labelClass}>City *</Label>
                <Input
                  placeholder="Nagpur"
                  value={form.city}
                  onChangeText={(v) => updateField("city", v)}
                  className={inputClass}
                />
              </View>

              <View className="flex-1">
                <Label className={labelClass}>State *</Label>
                <Input
                  placeholder="State"
                  value={form.state}
                  onChangeText={(v) => updateField("state", v)}
                  className={inputClass}
                />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer Buttons */}
      <View className="border-t border-border bg-card px-4 py-3 flex-row gap-3">
        <Pressable
          onPress={handleBack}
          className="flex-1 rounded-xl bg-muted py-3 items-center justify-center"
        >
          <Text className="text-base font-semibold text-foreground">Back</Text>
        </Pressable>

        <Pressable
          onPress={handleNext}
          disabled={!isStepValid()}
          className={cn(
            "flex-1 rounded-xl py-3 items-center justify-center",
            isStepValid() ? "bg-primary" : "bg-muted"
          )}
        >
          <Text className={cn(
            "text-base font-semibold",
            isStepValid() ? "text-primary-foreground" : "text-muted-foreground"
          )}>
            {currentStep === 4 ? "Save & Continue" : "Save & Continue"}
          </Text>
        </Pressable>
      </View>

      {/* Category Picker Modal */}
      <Modal visible={showCategoryPicker} transparent animationType="fade">
        <Pressable style={s.catOverlay} onPress={() => setShowCategoryPicker(false)}>
          <Pressable style={s.catDropdown} onPress={(e) => e.stopPropagation()}>
            <View style={s.sheetHeader}>
              {categoryPath.length > 0 && !categorySearch ? (
                <Pressable onPress={() => setCategoryPath((p) => p.slice(0, -1))} hitSlop={8} style={{ padding: 4 }}>
                  <ArrowLeft size={20} color="#6b7280" />
                </Pressable>
              ) : null}
              <View style={{ flex: 1 }}>
                <Text style={s.sheetTitle}>
                  {categoryParentLabel && !categorySearch ? categoryParentLabel : "Select Category"}
                </Text>
                {isSubcategoryView && !categorySearch && (
                  <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                    Select services • Children expand automatically
                  </Text>
                )}
              </View>
              <Pressable onPress={() => setShowCategoryPicker(false)} hitSlop={8}>
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>
            
            <View style={s.searchWrap}>
              <View style={s.searchBox}>
                <Search size={16} color="#9ca3af" />
                <TextInput
                  placeholder="Search categories..."
                  value={categorySearch}
                  onChangeText={setCategorySearch}
                  style={s.searchInput}
                  placeholderTextColor="#9ca3af"
                  autoCorrect={false}
                />
                {categorySearch.length > 0 && (
                  <Pressable onPress={() => setCategorySearch("")} hitSlop={8}>
                    <X size={16} color="#9ca3af" />
                  </Pressable>
                )}
              </View>
            </View>
            
            <ScrollView
              keyboardShouldPersistTaps="handled"
              bounces={false}
              style={{ flexGrow: 0 }}
            >
              {categoryDisplayItems.map((item) => {
                const active = form.category === item.name;
                const isSelected = isSubcategoryView && selectedSubcategories.includes(item.name);
                const isExpanded = expandedItems.has(item.name);
                const showCheckbox = isSubcategoryView && !categorySearch;
                const paddingLeft = 12 + (item.level * 20);
                
                return (
                  <View key={item.id}>
                    <Pressable
                      style={[s.pickItem, (active || isSelected) && s.pickItemActive, { paddingLeft }]}
                      onPress={() => {
                        if (!isSubcategoryView && item.hasChildren && item.node && !categorySearch) {
                          // Root level: Navigate into category
                          setCategoryPath((p) => [...p, item.node!]);
                          setSelectedSubcategories([]);
                        } else if (isSubcategoryView && item.hasChildren && !categorySearch) {
                          // Subcategory with children: Select and auto-expand
                          toggleSubcategory(item.name, item.hasChildren);
                        } else if (isSubcategoryView && !categorySearch) {
                          // Leaf item: Toggle selection
                          toggleSubcategory(item.name, item.hasChildren);
                        } else {
                          // Search result: Select and close
                          handleSimpleCategorySelect(item.name);
                        }
                      }}
                    >
                      {showCheckbox && (
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            toggleSubcategory(item.name, item.hasChildren);
                          }}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 6,
                            borderWidth: 2,
                            borderColor: isSelected ? "#2563eb" : "#d1d5db",
                            backgroundColor: isSelected ? "#dbeafe" : "transparent",
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: 10,
                          }}
                        >
                          {isSelected && <Check size={16} color="#2563eb" />}
                        </Pressable>
                      )}
                      {!showCheckbox && (
                        <Text style={s.pickEmoji}>{item.icon || "\u{1F4C1}"}</Text>
                      )}
                      <Text 
                        style={[s.pickText, (active || isSelected) && s.pickTextActive, { flex: 1 }]}
                        numberOfLines={2}
                      >
                        {item.name}
                      </Text>
                      {isSubcategoryView && item.hasChildren && !categorySearch && (
                        <View style={{ padding: 4 }}>
                          {isExpanded ? (
                            <ChevronDown size={18} color="#6b7280" />
                          ) : (
                            <ChevronRight size={16} color="#9ca3af" />
                          )}
                        </View>
                      )}
                      {!isSubcategoryView && item.hasChildren && !categorySearch && (
                        <ChevronRight size={16} color="#9ca3af" />
                      )}
                    </Pressable>
                  </View>
                );
              })}
              {categoryDisplayItems.length === 0 && (
                <View style={s.emptyState}>
                  <Text style={s.emptyText}>No categories found</Text>
                </View>
              )}
            </ScrollView>
            
            {/* Custom Category Input */}
            {!isSubcategoryView && (
              <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: "#e5e7eb", backgroundColor: "#f9fafb" }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#6b7280", marginBottom: 8 }}>
                  Can't find your category?
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      placeholder="Enter custom category..."
                      value={customCategory}
                      onChangeText={setCustomCategory}
                      style={{
                        backgroundColor: "#ffffff",
                        borderWidth: 1,
                        borderColor: "#d1d5db",
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        fontSize: 15,
                        color: "#111827"
                      }}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                  <Pressable
                    onPress={handleCustomCategoryAdd}
                    style={{
                      backgroundColor: "#2563eb",
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      justifyContent: "center",
                      alignItems: "center",
                      minWidth: 80
                    }}
                  >
                    <Text style={{ color: "#ffffff", fontWeight: "600", fontSize: 14 }}>
                      Add
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
            
            {isSubcategoryView && selectedSubcategories.length > 0 && !categorySearch && (
              <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: "#e5e7eb" }}>
                <Button 
                  onPress={handleCategoryDone}
                  className="bg-primary rounded-xl py-3"
                >
                  <Text style={{ color: "#ffffff", fontWeight: "600", fontSize: 16 }}>
                    Done ({selectedSubcategories.length} selected)
                  </Text>
                </Button>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Business Hours Modal */}
      <Modal visible={showBusinessHours} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-background rounded-t-3xl max-h-[80%]">
            <View className="border-b border-border px-4 py-4 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-foreground">Business Hours</Text>
              <Pressable onPress={() => setShowBusinessHours(false)}>
                <X size={24} color={iconColor} />
              </Pressable>
            </View>

            <ScrollView className="px-4 py-4">
              {DAYS.map((day) => (
                <View key={day} className="mb-4">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-base font-semibold text-foreground">{day}</Text>
                    <Switch
                      value={businessHoursDays[day].enabled}
                      onValueChange={() => toggleDayHours(day)}
                    />
                  </View>

                  {businessHoursDays[day].enabled ? (
                    <View className="flex-row items-center gap-3">
                      <View className="flex-1">
                        <Text className="text-xs text-muted-foreground mb-1">Opens at</Text>
                        <View className="bg-muted/50 rounded-lg px-3 py-2">
                          <Text className="text-sm">{businessHoursDays[day].openTime}</Text>
                        </View>
                      </View>
                      <View className="flex-1">
                        <Text className="text-xs text-muted-foreground mb-1">Closes at</Text>
                        <View className="bg-muted/50 rounded-lg px-3 py-2">
                          <Text className="text-sm">{businessHoursDays[day].closeTime}</Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <Text className="text-sm italic text-muted-foreground">Closed</Text>
                  )}
                </View>
              ))}
            </ScrollView>

            <View className="border-t border-border px-4 py-3">
              <Button onPress={handleBusinessHoursDone} className="rounded-xl">
                <Text className="text-base font-semibold text-primary-foreground">Done</Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default BusinessPromotionForm;
