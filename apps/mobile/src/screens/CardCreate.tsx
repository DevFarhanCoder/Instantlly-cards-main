import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  Building2,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
import { useGetCategoryTreeQuery } from "../store/api/categoriesApi";
import type { CategoryTreeNode } from "../store/api/categoriesApi";
import { useAuth } from "../hooks/useAuth";
import { useBusinessCards } from "../hooks/useBusinessCards";
import { useUploadImageMutation } from "../store/api/businessCardsApi";
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

const inputClass = "rounded-xl bg-muted/50 border-0 text-base h-14 px-4";
const errorInputClass = "rounded-xl bg-muted/50 border border-destructive text-base h-14 px-4";
const textareaClass = "rounded-xl bg-muted/50 border-0 text-base px-4 py-4 min-h-[100px]";
const labelClass = "text-sm font-bold";

const COUNTRY_CODES = [
  { code: "+91", country: "India", flag: "\u{1F1EE}\u{1F1F3}" },
  { code: "+1", country: "United States", flag: "\u{1F1FA}\u{1F1F8}" },
  { code: "+1", country: "Canada", flag: "\u{1F1E8}\u{1F1E6}" },
  { code: "+44", country: "United Kingdom", flag: "\u{1F1EC}\u{1F1E7}" },
  { code: "+61", country: "Australia", flag: "\u{1F1E6}\u{1F1FA}" },
  { code: "+971", country: "UAE", flag: "\u{1F1E6}\u{1F1EA}" },
  { code: "+65", country: "Singapore", flag: "\u{1F1F8}\u{1F1EC}" },
];

/* ── Reusable Country Picker Modal ─────────────────────── */
const CountryPickerModal = ({
  visible,
  onClose,
  selectedCode,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  selectedCode: string;
  onSelect: (code: string) => void;
}) => (
  <Modal visible={visible} transparent animationType="slide">
    <Pressable style={s.overlay} onPress={onClose}>
      <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>Select Country</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <X size={20} color="#6b7280" />
          </Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
          {COUNTRY_CODES.map((country, index) => {
            const active = selectedCode === country.code;
            return (
              <Pressable
                key={`${country.country}-${index}`}
                style={[s.pickItem, active && s.pickItemActive]}
                onPress={() => {
                  onSelect(country.code);
                  onClose();
                }}
              >
                <Text style={s.pickEmoji}>{country.flag}</Text>
                <Text style={[s.pickText, active && s.pickTextActive]}>
                  {country.country}
                </Text>
                <Text style={s.pickCode}>{country.code}</Text>
                {active && <Check size={16} color="#2563eb" />}
              </Pressable>
            );
          })}
        </ScrollView>
      </Pressable>
    </Pressable>
  </Modal>
);

/* ── Category Picker Modal with Nested Navigation ─────── */
const CategoryPickerModal = ({
  visible,
  onClose,
  selected,
  onSelect,
  tree,
  fallback,
}: {
  visible: boolean;
  onClose: () => void;
  selected: string;
  onSelect: (name: string) => void;
  tree: CategoryTreeNode[];
  fallback: Array<{ id: string; name: string; emoji: string }>;
}) => {
  const [search, setSearch] = useState("");
  const [path, setPath] = useState<CategoryTreeNode[]>([]);

  useEffect(() => {
    if (!visible) {
      setSearch("");
      setPath([]);
    }
  }, [visible]);

  const currentNodes = path.length > 0 ? path[path.length - 1].children : tree;
  const parentLabel = path.length > 0 ? path[path.length - 1].name : null;

  // Flatten tree for search
  const flattenTree = useCallback(
    (nodes: CategoryTreeNode[]): CategoryTreeNode[] =>
      nodes.reduce<CategoryTreeNode[]>(
        (acc, n) => [...acc, n, ...flattenTree(n.children)],
        []
      ),
    []
  );

  const displayItems = useMemo(() => {
    if (search) {
      const q = search.toLowerCase();
      if (tree.length > 0) {
        return flattenTree(tree)
          .filter((n) => n.name.toLowerCase().includes(q))
          .map((n) => ({
            id: String(n.id),
            name: n.name,
            icon: n.icon,
            hasChildren: n.children.length > 0,
            node: n,
          }));
      }
      return fallback
        .filter((c) => c.name.toLowerCase().includes(q))
        .map((c) => ({ id: c.id, name: c.name, icon: c.emoji, hasChildren: false, node: null as CategoryTreeNode | null }));
    }
    if (tree.length > 0) {
      return currentNodes.map((n) => ({
        id: String(n.id),
        name: n.name,
        icon: n.icon,
        hasChildren: n.children.length > 0,
        node: n,
      }));
    }
    return fallback.map((c) => ({ id: c.id, name: c.name, icon: c.emoji, hasChildren: false, node: null as CategoryTreeNode | null }));
  }, [search, tree, currentNodes, fallback, flattenTree]);

  const goBack = () => setPath((p) => p.slice(0, -1));

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={s.catOverlay} onPress={onClose}>
        <Pressable style={s.catDropdown} onPress={(e) => e.stopPropagation()}>
          <View style={s.sheetHeader}>
            {path.length > 0 && !search ? (
              <Pressable onPress={goBack} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <ChevronLeft size={18} color="#6b7280" />
                <Text style={{ fontSize: 13, color: "#6b7280" }}>Back</Text>
              </Pressable>
            ) : null}
            <Text style={[s.sheetTitle, { flex: 1 }]}>
              {parentLabel && !search ? parentLabel : "Select Category"}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>
          <View style={s.searchWrap}>
            <View style={s.searchBox}>
              <Search size={16} color="#9ca3af" />
              <TextInput
                placeholder="Search categories..."
                value={search}
                onChangeText={setSearch}
                style={s.searchInput}
                placeholderTextColor="#9ca3af"
                autoCorrect={false}
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch("")} hitSlop={8}>
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
            {displayItems.map((item) => {
              const active = selected === item.name;
              return (
                <Pressable
                  key={item.id}
                  style={[s.pickItem, active && s.pickItemActive]}
                  onPress={() => {
                    if (item.hasChildren && item.node && !search) {
                      setPath((p) => [...p, item.node!]);
                    } else {
                      onSelect(item.name);
                      onClose();
                    }
                  }}
                >
                  <Text style={s.pickEmoji}>{item.icon || "\u{1F4C1}"}</Text>
                  <Text style={[s.pickText, active && s.pickTextActive, { flex: 1 }]}>
                    {item.name}
                  </Text>
                  {active && <Check size={18} color="#2563eb" />}
                  {item.hasChildren && !search && (
                    <ChevronRight size={16} color="#9ca3af" />
                  )}
                </Pressable>
              );
            })}
            {displayItems.length === 0 && (
              <View style={s.emptyState}>
                <Text style={s.emptyText}>No categories found</Text>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

/* ── Accordion Section (must be outside CardCreate to avoid remount on re-render) ── */
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
    <Pressable onPress={onToggle} className="flex-row items-center gap-3.5 p-5">
      <View
        className={cn(
          "h-12 w-12 items-center justify-center rounded-xl",
          isComplete ? "bg-green-500/15" : "bg-primary/10"
        )}
      >
        {isComplete ? (
          <Check size={22} color="#16a34a" />
        ) : (
          <Text className="text-base font-bold text-primary">{stepNum}</Text>
        )}
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold text-foreground">
          {title}
          {required && <Text className="text-destructive"> *</Text>}
        </Text>
        <Text className="text-sm text-muted-foreground mt-0.5">{subtitle}</Text>
      </View>
      {isOpen ? (
        <ChevronUp size={24} color="#9aa2b1" />
      ) : (
        <ChevronDown size={24} color="#9aa2b1" />
      )}
    </Pressable>
    {isOpen && (
      <View style={{ gap: 16, paddingHorizontal: 20, paddingBottom: 24 }}>
        {children}
      </View>
    )}
  </View>
);

/* ── Main Component ────────────────────────────────────── */
const CardCreate = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const cardId = route?.params?.cardId as string | undefined;
  const { user } = useAuth();
  const { cards, createCard, updateCard } = useBusinessCards();
  const [uploadImage] = useUploadImageMutation();
  const { data: categoryTree = [] } = useGetCategoryTreeQuery();
  const categoryOptions = useMemo(() => {
    // Flatten the tree for display in the category trigger text
    const flatten = (nodes: CategoryTreeNode[]): Array<{ id: string; name: string; emoji: string }> =>
      nodes.reduce<Array<{ id: string; name: string; emoji: string }>>((acc, n) => [
        ...acc,
        { id: String(n.id), name: n.name, emoji: n.icon || "\u{1F4C1}" },
        ...flatten(n.children),
      ], []);
    if (categoryTree.length > 0) return flatten(categoryTree);
    return fallbackCategories;
  }, [categoryTree]);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    personal: true,
  });
  const [showPreview, setShowPreview] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [serviceInput, setServiceInput] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState(false);
  const [logoAsset, setLogoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [phoneCountry, setPhoneCountry] = useState("+91");
  const [whatsappCountry, setWhatsappCountry] = useState("+91");
  const [companyPhoneCountry, setCompanyPhoneCountry] = useState("+91");
  const [showPhoneCountryPicker, setShowPhoneCountryPicker] = useState(false);
  const [showWhatsappCountryPicker, setShowWhatsappCountryPicker] = useState(false);
  const [showCompanyPhoneCountryPicker, setShowCompanyPhoneCountryPicker] = useState(false);
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
    companyPhones: [""] as string[],
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
    serviceMode: "visit" as string,
  });

  useEffect(() => {
    if (!isEdit || cards.length === 0) return;
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;

    // Convert ISO date to DD/MM/YYYY for display
    const isoToDisplay = (iso: string | null | undefined): string => {
      if (!iso) return "";
      try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        const dd = String(d.getUTCDate()).padStart(2, "0");
        const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
        const yyyy = d.getUTCFullYear();
        return `${dd}/${mm}/${yyyy}`;
      } catch {
        return iso;
      }
    };

    setForm({
      fullName: card.full_name || "",
      birthdate: isoToDisplay(card.birthdate),
      anniversary: isoToDisplay(card.anniversary),
      gender: card.gender || "",
      phone: card.phone || "",
      whatsapp: (card as any).whatsapp || "",
      telegram: (card as any).telegram || "",
      email: card.email || "",
      location: card.location || "",
      mapsLink: card.maps_link || "",
      companyName: card.company_name || "",
      jobTitle: card.job_title || "",
      companyPhones: card.company_phone 
        ? card.company_phone.split(",").map(p => p.trim()) 
        : [""],
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
      serviceMode: "visit",
    });
    // Restore country codes
    if ((card as any).personal_country_code) setPhoneCountry((card as any).personal_country_code);
    if ((card as any).company_country_code) setCompanyPhoneCountry((card as any).company_country_code);
  }, [isEdit, cardId, cards]);

  const updateField = useCallback((field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const formatDateInput = (text: string): string => {
    const numericOnly = text.replace(/[^\d]/g, "");
    let formatted = "";
    for (let i = 0; i < numericOnly.length && i < 8; i++) {
      if (i === 2 || i === 4) formatted += "/";
      formatted += numericOnly[i];
    }
    return formatted;
  };

  const markTouched = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);
  
  const toggleSection = useCallback((key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

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
      const fileName = logoAsset.fileName || `${Date.now()}.jpg`;
      const formData = new FormData();
      formData.append("file", {
        uri: logoAsset.uri,
        name: fileName,
        type: logoAsset.mimeType || "image/jpeg",
      } as any);
      const result = await uploadImage(formData).unwrap();
      return result.url;
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
  };

  const handleAutoCompanyLocation = async () => {
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
      addr?.name,
      addr?.street,
      addr?.subregion || (addr as any)?.neighborhood,
      addr?.city || addr?.region,
      addr?.region,
      addr?.postalCode,
      addr?.country,
    ]
      .filter(Boolean)
      .join(", ");
    updateField("companyAddress", loc);
    updateField(
      "companyMapsLink",
      `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`
    );
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

    // Convert DD/MM/YYYY to ISO date for DateTime fields
    const parseDate = (str: string): string | null => {
      if (!str) return null;
      const parts = str.split("/");
      if (parts.length !== 3) return str;
      const [dd, mm, yyyy] = parts;
      if (!dd || !mm || !yyyy || yyyy.length < 4) return null;
      return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T00:00:00.000Z`;
    };

    const cardData = {
      full_name: form.fullName,
      birthdate: parseDate(form.birthdate),
      anniversary: parseDate(form.anniversary),
      gender: form.gender || null,
      phone: form.phone,
      whatsapp: form.whatsapp || null,
      telegram: form.telegram || null,
      email: form.email || null,
      location: form.location || null,
      maps_link: form.mapsLink || null,
      company_name: form.companyName || null,
      job_title: form.jobTitle || null,
      company_phone: form.companyPhones.filter(p => p.trim()).join(", ") || null,
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
      personal_country_code: phoneCountry,
      company_country_code: companyPhoneCountry,
    };

    if (isEdit) {
      await updateCard.mutateAsync({ id: cardId!, ...(cardData as any) });
    } else {
      await createCard.mutateAsync(cardData as any);
    }

    navigation.navigate("MyCards");
  };

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

  /* ── Render ── */
  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      {/* ── Header ── */}
      <View className="border-b border-border bg-card px-4 py-2">
        <View className="flex-row items-center justify-between mb-1.5">
          <View>
            <Text className="text-lg font-bold text-foreground">
              {isEdit ? "Edit Card" : "Create New Card"}
            </Text>
            <Text className="text-[10px] text-muted-foreground">
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
        <Progress value={progress} className="h-1" />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          className="mt-2"
        >
          <View className="flex-row gap-2">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isOpen = !!openSections[step.key];
              return (
                <Pressable
                  key={step.key}
                  onPress={() =>
                    setOpenSections(
                      STEPS.reduce((acc, st) => {
                        acc[st.key] = st.key === step.key;
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

      {/* ── Preview ── */}
      {showPreview && (
        <View className="border-b border-border bg-muted/30 px-4 py-2">
          <Text className="mb-1.5 text-[10px] font-bold text-muted-foreground uppercase">
            Preview
          </Text>
          <View className="rounded-xl border border-border bg-card p-3">
            <View className="flex-row items-center gap-2.5">
              <View className="h-12 w-12 items-center justify-center rounded-lg bg-primary/10 overflow-hidden">
                {form.logoPreview ? (
                  <Image
                    source={{ uri: form.logoPreview }}
                    style={{ height: "100%", width: "100%" }}
                  />
                ) : (
                  <Text className="text-lg">{"\u{1F3E2}"}</Text>
                )}
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-foreground">
                  {form.fullName || "Your Name"}
                </Text>
                <Text className="text-[10px] text-muted-foreground">
                  {form.jobTitle || "Job Title"}
                </Text>
                <Text className="text-[10px] text-muted-foreground">
                  {form.companyName || "Company"}
                </Text>
              </View>
            </View>
            {form.offer ? (
              <View className="mt-2 rounded-lg bg-success/10 px-2 py-1.5">
                <Text className="text-[10px] font-semibold text-success">
                  {"\u{1F381}"} {form.offer}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      )}

      {/* ── Form ── */}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 16, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 }}
      >
        {/* Section 1: Personal */}
        <AccordionSection
          title="Personal Information"
          subtitle="Your basic contact details"
          required
          isOpen={!!openSections.personal}
          onToggle={() => toggleSection("personal")}
          stepNum={1}
          isComplete={sectionComplete.personal}
        >
          <View style={{ gap: 6 }}>
            <Label className={labelClass}>Full Name *</Label>
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
          <View style={{ gap: 6 }}>
            <Label className={labelClass}>Birthdate</Label>
            <Input
              placeholder="DD/MM/YYYY (e.g., 15/06/1990)"
              value={form.birthdate}
              onChangeText={(v) => updateField("birthdate", formatDateInput(v))}
              keyboardType="numeric"
              maxLength={10}
              className={inputClass}
            />
          </View>
          <View style={{ gap: 6 }}>
            <Label className={labelClass}>Anniversary</Label>
            <Input
              placeholder="DD/MM/YYYY (e.g., 20/05/2015)"
              value={form.anniversary}
              onChangeText={(v) => updateField("anniversary", formatDateInput(v))}
              keyboardType="numeric"
              maxLength={10}
              className={inputClass}
            />
          </View>
          <View style={{ gap: 6 }}>
            <Label className={labelClass}>Gender</Label>
            <View className="flex-row gap-2">
              {([
                { value: "Male", emoji: "\u{1F468}" },
                { value: "Female", emoji: "\u{1F469}" },
              ] as const).map((g) => (
                <Pressable
                  key={g.value}
                  onPress={() => updateField("gender", g.value)}
                  className={cn(
                    "flex-1 rounded-xl py-3",
                    form.gender === g.value ? "bg-primary" : "bg-muted/50"
                  )}
                >
                  <Text
                    className={cn(
                      "text-base font-medium text-center",
                      form.gender === g.value
                        ? "text-primary-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {g.emoji} {g.value}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={{ gap: 6 }}>
            <Label className={labelClass}>Mobile Number *</Label>
            <View className="flex-row gap-2 items-center">
              <Pressable
                onPress={() => setShowPhoneCountryPicker(true)}
                className="h-14 flex-row items-center justify-center gap-1 rounded-xl bg-muted/50 px-3 min-w-[90px]"
              >
                <Text className="text-base text-muted-foreground">
                  {COUNTRY_CODES.find((c) => c.code === phoneCountry)?.flag}{" "}
                  {phoneCountry}
                </Text>
                <ChevronDown size={14} color="#6b7280" />
              </Pressable>
              <Input
                placeholder="Enter mobile number"
                value={form.phone}
                onChangeText={(v) => updateField("phone", v)}
                onBlur={() => markTouched("phone")}
                keyboardType="phone-pad"
                maxLength={10}
                className={cn(
                  "flex-1",
                  touched.phone && !form.phone ? errorInputClass : inputClass
                )}
              />
            </View>
            {touched.phone && !form.phone && (
              <Text className="text-xs text-destructive">
                Mobile number is required
              </Text>
            )}
          </View>
          <View style={{ gap: 6 }}>
            <Label className={labelClass}>WhatsApp Number</Label>
            <View className="flex-row gap-2 items-center">
              <Pressable
                onPress={() => setShowWhatsappCountryPicker(true)}
                className="h-14 flex-row items-center justify-center gap-1 rounded-xl bg-muted/50 px-3 min-w-[90px]"
              >
                <Text className="text-base text-muted-foreground">
                  {COUNTRY_CODES.find((c) => c.code === whatsappCountry)?.flag}{" "}
                  {whatsappCountry}
                </Text>
                <ChevronDown size={14} color="#6b7280" />
              </Pressable>
              <Input
                placeholder="WhatsApp number"
                value={form.whatsapp}
                onChangeText={(v) => updateField("whatsapp", v)}
                keyboardType="phone-pad"
                maxLength={10}
                className={cn("flex-1", inputClass)}
              />
            </View>
          </View>
          <View style={{ gap: 6 }}>
            <Label className={labelClass}>Telegram Username / Number</Label>
            <Input
              placeholder="@username or phone number"
              value={form.telegram}
              onChangeText={(v) => updateField("telegram", v)}
              className={inputClass}
            />
          </View>
          <View style={{ gap: 6 }}>
            <Label className={labelClass}>Email Address</Label>
            <Input
              placeholder="your.email@example.com"
              value={form.email}
              onChangeText={(v) => updateField("email", v)}
              keyboardType="email-address"
              autoCapitalize="none"
              className={inputClass}
            />
          </View>
          <View style={{ gap: 6 }}>
            <Label className={labelClass}>Location / Address</Label>
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
                // className="flex-row items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5"
              >
                {"\u{1F4CD}"} Auto
              </Button>
            </View>
            <TextInput
              placeholder="Enter complete business address (Street, Area, City, State, Country)"
              value={form.location}
              onChangeText={(v) => updateField("location", v)}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className={cn(textareaClass, "text-base")}
              placeholderTextColor="#9ca3af"
            />
          </View>
          <View style={{ gap: 6 }}>
            <Label className={labelClass}>Google Maps Link</Label>
            <Input
              placeholder="https://maps.google.com/..."
              value={form.mapsLink}
              onChangeText={(v) => updateField("mapsLink", v)}
              className={inputClass}
            />
          </View>
        </AccordionSection>

        {/* Section 2: Business */}
        <AccordionSection
          title="Business Information"
          subtitle="Company and professional details"
          isOpen={!!openSections.business}
          onToggle={() => toggleSection("business")}
          stepNum={2}
          isComplete={sectionComplete.business}
        >
          <View style={{ gap: 6 }}>
            <Label className={labelClass}>Company Name</Label>
            <Input
              placeholder="Your company or organization"
              value={form.companyName}
              onChangeText={(v) => updateField("companyName", v)}
              className={inputClass}
            />
          </View>
          <View style={{ gap: 6 }}>
            <Label className={labelClass}>Job Title / Designation</Label>
            <Input
              placeholder="e.g. Marketing Manager, CEO"
              value={form.jobTitle}
              onChangeText={(v) => updateField("jobTitle", v)}
              className={inputClass}
            />
          </View>
          <View style={{ gap: 6 }}>
            <Label className={labelClass}>Company Phone</Label>
            {form.companyPhones.map((cp, idx) => (
              <View key={idx} className="flex-row gap-2 items-center">
                <Pressable
                  onPress={() => setShowCompanyPhoneCountryPicker(true)}
                  className="h-14 flex-row items-center justify-center gap-1 rounded-xl bg-muted/50 px-3 min-w-[90px]"
                >
                  <Text className="text-base text-muted-foreground">
                    {COUNTRY_CODES.find((c) => c.code === companyPhoneCountry)?.flag}{" "}
                    {companyPhoneCountry}
                  </Text>
                  <ChevronDown size={14} color="#6b7280" />
                </Pressable>
                <Input
                  placeholder="Company number"
                  value={cp}
                  onChangeText={(v) => {
                    const updated = [...form.companyPhones];
                    updated[idx] = v;
                    updateField("companyPhones", updated);
                  }}
                  keyboardType="phone-pad"
                  className={cn("flex-1", inputClass)}
                />
                {form.companyPhones.length > 1 && (
                  <Pressable
                    onPress={() => {
                      const updated = form.companyPhones.filter((_, i) => i !== idx);
                      updateField("companyPhones", updated);
                    }}
                  >
                    <X size={18} color="#ef4444" />
                  </Pressable>
                )}
              </View>
            ))}
            {form.companyPhones.length < 3 && (
              <Pressable
                onPress={() => setForm({ ...form, companyPhones: [...form.companyPhones, ""] })}
                className="flex-row items-center justify-center gap-2 rounded-xl bg-primary/10 py-3 mt-1"
              >
                <Plus size={16} color="#2563eb" />
                <Text className="text-sm font-medium text-primary">Add another number</Text>
              </Pressable>
            )}
          </View>
          <View style={{ gap: 6 }}>
            <Label className={labelClass}>Company Email</Label>
            <Input
              placeholder="contact@company.com"
              value={form.companyEmail}
              onChangeText={(v) => updateField("companyEmail", v)}
              keyboardType="email-address"
              autoCapitalize="none"
              className={inputClass}
            />
          </View>
          <View style={{ gap: 6 }}>
            <Label className={labelClass}>Company Website</Label>
            <Input
              placeholder="https://company.com"
              value={form.website}
              onChangeText={(v) => updateField("website", v)}
              className={inputClass}
            />
          </View>
          <View style={{ gap: 6 }}>
            <Label className={labelClass}>Company Address</Label>
            <View className="flex-row gap-2">
              <Input
                placeholder="Office address"
                value={form.companyAddress}
                onChangeText={(v) => updateField("companyAddress", v)}
                className={cn("flex-1", inputClass)}
              />
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 rounded-xl"
                onPress={handleAutoCompanyLocation}
              >
                {"\u{1F4CD}"} Auto
              </Button>
            </View>
          </View>
          <View style={{ gap: 6 }}>
            <Label className={labelClass}>Company Maps Link</Label>
            <Input
              placeholder="https://maps.google.com/..."
              value={form.companyMapsLink}
              onChangeText={(v) => updateField("companyMapsLink", v)}
              className={inputClass}
            />
          </View>
          <View style={{ gap: 6 }}>
            <Label className={labelClass}>Business Photo / Logo</Label>
            <Button
              variant="outline"
              className="w-full gap-2 rounded-xl border-primary/30"
              onPress={handleLogoUpload}
            >
              <Camera size={18} color="#2563eb" />
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
          <View style={{ gap: 6 }}>
            <Label className={labelClass}>Service Mode *</Label>
            <Text className="text-xs text-muted-foreground">
              Where do you serve your customers?
            </Text>
            <View className="flex-row gap-2 mt-1">
              {[
                { value: "home", label: "\u{1F3E0} Home Service", desc: "We visit the customer" },
                { value: "visit", label: "\u{1F3E2} At Business", desc: "Customer visits us" },
                { value: "both", label: "\u{1F504} Both", desc: "Home & business" },
              ].map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() =>
                    setForm((prev) => ({
                      ...prev,
                      serviceMode: opt.value,
                    }))
                  }
                  className={cn(
                    "flex-1 rounded-xl border-2 px-2 py-3",
                    form.serviceMode === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/30"
                  )}
                >
                  <Text className="text-base font-semibold text-foreground text-center">
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

        {/* Section 3: About */}
        <AccordionSection
          title="About Business"
          subtitle="Describe your services and hours"
          isOpen={!!openSections.about}
          onToggle={() => toggleSection("about")}
          stepNum={3}
          isComplete={sectionComplete.about}
        >
          <View style={{ gap: 6 }}>
            <Label className={labelClass}>About Business</Label>
            <Textarea
              placeholder="Brief description of your business or services"
              value={form.description}
              onChangeText={(v) => updateField("description", v)}
              className={textareaClass}
            />
          </View>
          <View style={{ gap: 6 }}>
            <Label className={labelClass}>Business Hours</Label>
            <Select
              value={form.businessHours}
              onValueChange={(v) => updateField("businessHours", v)}
            >
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder="Set business hours" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="9am-6pm">9:00 AM - 6:00 PM</SelectItem>
                <SelectItem value="9am-9pm">9:00 AM - 9:00 PM</SelectItem>
                <SelectItem value="10am-8pm">10:00 AM - 8:00 PM</SelectItem>
                <SelectItem value="24x7">24 x 7</SelectItem>
              </SelectContent>
            </Select>
          </View>
          <View style={{ gap: 6 }}>
            <Label className={labelClass}>Category</Label>
            <Pressable
              onPress={() => setShowCategoryPicker(true)}
              className={inputClass}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: form.category ? colors.foreground : "#9ca3af",
                }}
              >
                {form.category
                  ? `${categoryOptions.find((c) => c.name === form.category)?.emoji || "\u{1F4C1}"} ${form.category}`
                  : "Select category"}
              </Text>
              <ChevronDown size={16} color="#6b7280" />
            </Pressable>
          </View>
          <View style={{ gap: 6 }}>
            <Label className={labelClass}>Services (max 8)</Label>
            <View className="flex-row gap-2">
              <Input
                placeholder="Add a service"
                value={serviceInput}
                onChangeText={setServiceInput}
                onSubmitEditing={addService}
                className={cn("flex-1", inputClass)}
              />
              <Button size="sm" className="rounded-xl" onPress={addService}>
                <Plus size={16} color="#ffffff" /> Add
              </Button>
            </View>
            {form.services.length > 0 && (
              <View className="flex-row flex-wrap gap-1.5 mt-2">
                {form.services.map((svc, i) => (
                  <View
                    key={`${svc}-${i}`}
                    className="flex-row items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5"
                  >
                    <Text className="text-sm font-medium text-primary">{svc}</Text>
                    <Pressable onPress={() => removeService(i)}>
                      <X size={14} color="#2563eb" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
          <View style={{ gap: 6 }}>
            <Label className={labelClass}>Established Year</Label>
            <Input
              placeholder="e.g. 2020"
              value={form.establishedYear}
              onChangeText={(v) => updateField("establishedYear", v)}
              keyboardType="number-pad"
              className={inputClass}
            />
          </View>
        </AccordionSection>

        {/* Section 4: Offer */}
        <AccordionSection
          title="Special Offer"
          subtitle="Attract customers with an offer"
          isOpen={!!openSections.offer}
          onToggle={() => toggleSection("offer")}
          stepNum={4}
          isComplete={sectionComplete.offer}
        >
          <View style={{ gap: 6 }}>
            <Label className={labelClass}>Offer</Label>
            <Input
              placeholder="e.g. 20% off on first service"
              value={form.offer}
              onChangeText={(v) => updateField("offer", v)}
              className={inputClass}
            />
          </View>
        </AccordionSection>

        {/* Section 5: Social */}
        <AccordionSection
          title="Social Media"
          subtitle="Connect on social platforms"
          isOpen={!!openSections.social}
          onToggle={() => toggleSection("social")}
          stepNum={5}
          isComplete={sectionComplete.social}
        >
          <View style={{ gap: 6 }}>
            <Label className={labelClass}>Instagram</Label>
            <Input
              placeholder="@yourbusiness"
              value={form.instagram}
              onChangeText={(v) => updateField("instagram", v)}
              className={inputClass}
            />
          </View>
          <View style={{ gap: 6 }}>
            <Label className={labelClass}>Facebook</Label>
            <Input
              placeholder="facebook.com/yourbusiness"
              value={form.facebook}
              onChangeText={(v) => updateField("facebook", v)}
              className={inputClass}
            />
          </View>
          <View style={{ gap: 6 }}>
            <Label className={labelClass}>LinkedIn</Label>
            <Input
              placeholder="linkedin.com/in/yourprofile"
              value={form.linkedin}
              onChangeText={(v) => updateField("linkedin", v)}
              className={inputClass}
            />
          </View>
          <View style={{ gap: 6 }}>
            <Label className={labelClass}>YouTube</Label>
            <Input
              placeholder="youtube.com/@yourchannel"
              value={form.youtube}
              onChangeText={(v) => updateField("youtube", v)}
              className={inputClass}
            />
          </View>
          <View style={{ gap: 6 }}>
            <Label className={labelClass}>Twitter / X</Label>
            <Input
              placeholder="@yourhandle"
              value={form.twitter}
              onChangeText={(v) => updateField("twitter", v)}
              className={inputClass}
            />
          </View>
        </AccordionSection>

        {/* Section 6: SEO */}
        <AccordionSection
          title="Additional Information"
          subtitle="Keywords and search optimization"
          isOpen={!!openSections.additional}
          onToggle={() => toggleSection("additional")}
          stepNum={6}
          isComplete={sectionComplete.additional}
        >
          <View style={{ gap: 6 }}>
            <Label className={labelClass}>Keywords</Label>
            <Textarea
              placeholder="Add keywords separated by commas to help people find your card"
              value={form.keywords}
              onChangeText={(v) => updateField("keywords", v)}
              className={textareaClass}
            />
          </View>
        </AccordionSection>
      </ScrollView>

      {/* ── Sticky Submit Button ── */}
      <View style={s.submitBar}>
        <Pressable
          onPress={handleSubmit}
          disabled={submitDisabled}
          style={[s.submitBtn, submitDisabled && { opacity: 0.5 }]}
        >
          <Text style={s.submitText}>{submitLabel}</Text>
        </Pressable>
      </View>

      {/* ── Modals ── */}
      <CountryPickerModal
        visible={showPhoneCountryPicker}
        onClose={() => setShowPhoneCountryPicker(false)}
        selectedCode={phoneCountry}
        onSelect={setPhoneCountry}
      />
      <CountryPickerModal
        visible={showWhatsappCountryPicker}
        onClose={() => setShowWhatsappCountryPicker(false)}
        selectedCode={whatsappCountry}
        onSelect={setWhatsappCountry}
      />
      <CountryPickerModal
        visible={showCompanyPhoneCountryPicker}
        onClose={() => setShowCompanyPhoneCountryPicker(false)}
        selectedCode={companyPhoneCountry}
        onSelect={setCompanyPhoneCountry}
      />
      <CategoryPickerModal
        visible={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        selected={form.category}
        onSelect={(name) => updateField("category", name)}
        tree={categoryTree}
        fallback={fallbackCategories}
      />
    </KeyboardAvoidingView>
  );
};

/* ── Styles ── */
const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  catOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  catDropdown: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    maxHeight: "60%",
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "65%",
    paddingBottom: 20,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  searchWrap: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#1f2937",
    paddingVertical: 0,
  },
  pickItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  pickItemActive: {
    backgroundColor: "#eff6ff",
  },
  pickEmoji: {
    fontSize: 22,
    marginRight: 12,
  },
  pickText: {
    flex: 1,
    fontSize: 16,
    color: "#1f2937",
  },
  pickTextActive: {
    color: "#2563eb",
    fontWeight: "600",
  },
  pickCode: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
    marginRight: 8,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#9ca3af",
  },
  submitBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: colors.card,
  },
  submitBtn: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: colors.primary,
    paddingVertical: 18,
  },
  submitText: {
    color: colors.primaryForeground,
    fontSize: 18,
    fontWeight: "700",
  },
});

export default CardCreate;
