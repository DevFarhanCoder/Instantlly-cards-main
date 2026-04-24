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
  ArrowLeft,
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
import { useUploadImageMutation, useGetMyCardsQuery } from "../store/api/businessCardsApi";
import { toast } from "../lib/toast";
import { cn } from "../lib/utils";
import { colors } from "../theme/colors";

const STEPS = [
  { key: "personal", label: "Personal", icon: User, num: 1 },
  { key: "social", label: "Social", icon: Share2, num: 2 },
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
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!visible) {
      setSearch("");
      setPath([]);
      setSelectedSubcategories([]);
      setExpandedItems(new Set());
    } else {
      // Parse existing selection when modal opens
      if (selected && selected.includes(" > ")) {
        const parts = selected.split(" > ");
        if (parts.length === 2) {
          const parentCategoryName = parts[0];
          const subcategories = parts[1].includes(", ") ? parts[1].split(", ") : [parts[1]];
          setSelectedSubcategories(subcategories);
          
          // Auto-navigate to parent category
          const parentNode = tree.find(n => n.name === parentCategoryName);
          if (parentNode) {
            setPath([parentNode]);
          }
        }
      }
    }
  }, [visible, selected, tree]);

  const currentNodes = path.length > 0 ? path[path.length - 1].children : tree;
  const parentLabel = path.length > 0 ? path[path.length - 1].name : null;
  const isSubcategoryView = path.length > 0;

  // Flatten tree for search
  const flattenTree = useCallback(
    (nodes: CategoryTreeNode[]): CategoryTreeNode[] =>
      nodes.reduce<CategoryTreeNode[]>(
        (acc, n) => [...acc, n, ...flattenTree(n.children)],
        []
      ),
    []
  );

  const toggleExpanded = (itemName: string) => {
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

  // Recursively build display items with nested children
  const buildDisplayItems = useCallback((nodes: CategoryTreeNode[], level: number = 0): any[] => {
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
        items.push(...buildDisplayItems(node.children, level + 1));
      }
    });
    return items;
  }, [expandedItems]);

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
            level: 0,
          }));
      }
      return fallback
        .filter((c) => c.name.toLowerCase().includes(q))
        .map((c) => ({ id: c.id, name: c.name, icon: c.emoji, hasChildren: false, node: null as CategoryTreeNode | null, level: 0 }));
    }
    if (tree.length > 0) {
      return buildDisplayItems(currentNodes);
    }
    return fallback.map((c) => ({ id: c.id, name: c.name, icon: c.emoji, hasChildren: false, node: null as CategoryTreeNode | null, level: 0 }));
  }, [search, tree, currentNodes, fallback, flattenTree, buildDisplayItems]);

  const goBack = () => setPath((p) => p.slice(0, -1));

  const handleDone = () => {
    if (selectedSubcategories.length > 0 && parentLabel) {
      const categoryString = `${parentLabel} > ${selectedSubcategories.join(", ")}`;
      onSelect(categoryString);
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={s.catOverlay} onPress={onClose}>
        <Pressable style={s.catDropdown} onPress={(e) => e.stopPropagation()}>
          <View style={s.sheetHeader}>
            {path.length > 0 && !search ? (
              <Pressable onPress={goBack} hitSlop={8} style={{ padding: 4 }}>
                <ArrowLeft size={20} color="#6b7280" />
              </Pressable>
            ) : null}
            <View style={{ flex: 1 }}>
              <Text style={s.sheetTitle}>
                {parentLabel && !search ? parentLabel : "Select Category"}
              </Text>
              {isSubcategoryView && !search && (
                <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                  Select services • Children expand automatically
                </Text>
              )}
            </View>
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
              const isSelected = isSubcategoryView && selectedSubcategories.includes(item.name);
              const isExpanded = expandedItems.has(item.name);
              const showCheckbox = isSubcategoryView && !search;
              const paddingLeft = 12 + (item.level * 20);
              
              return (
                <View key={item.id}>
                  <Pressable
                    style={[s.pickItem, (active || isSelected) && s.pickItemActive, { paddingLeft }]}
                    onPress={() => {
                      if (!isSubcategoryView && item.hasChildren && item.node && !search) {
                        // Root level: Navigate into category
                        setPath((p) => [...p, item.node!]);
                        setSelectedSubcategories([]);
                      } else if (isSubcategoryView && item.hasChildren && !search) {
                        // Subcategory with children: Select and auto-expand
                        toggleSubcategory(item.name, item.hasChildren);
                      } else if (isSubcategoryView && !search) {
                        // Leaf item: Toggle selection
                        toggleSubcategory(item.name, item.hasChildren);
                      } else {
                        // Search result: Select and close
                        onSelect(item.name);
                        onClose();
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
                    <Text style={[s.pickText, (active || isSelected) && s.pickTextActive, { flex: 1 }]}>
                      {item.name}
                    </Text>
                    {isSubcategoryView && item.hasChildren && !search && (
                      <View style={{ padding: 4 }}>
                        {isExpanded ? (
                          <ChevronDown size={18} color="#6b7280" />
                        ) : (
                          <ChevronRight size={16} color="#9ca3af" />
                        )}
                      </View>
                    )}
                    {!isSubcategoryView && item.hasChildren && !search && (
                      <ChevronRight size={16} color="#9ca3af" />
                    )}
                  </Pressable>
                </View>
              );
            })}
            {displayItems.length === 0 && (
              <View style={s.emptyState}>
                <Text style={s.emptyText}>No categories found</Text>
              </View>
            )}
          </ScrollView>
          {isSubcategoryView && selectedSubcategories.length > 0 && !search && (
            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: "#e5e7eb" }}>
              <Button 
                onPress={handleDone}
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
  const plan = route?.params?.plan as string | undefined;
  const skipPreview = route?.params?.skipPreview as boolean | undefined;
  const { user } = useAuth();
  const { cards, createCard, updateCard } = useBusinessCards();
  const { data: myCards = [], isLoading: isLoadingMyCards } = useGetMyCardsQuery(undefined, { skip: !user });

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    personal: true,
  });
  const [showPreview, setShowPreview] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [phoneCountry, setPhoneCountry] = useState("+91");
  const [whatsappCountry, setWhatsappCountry] = useState("+91");
  const [showPhoneCountryPicker, setShowPhoneCountryPicker] = useState(false);
  const [showWhatsappCountryPicker, setShowWhatsappCountryPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const isEdit = !!cardId;
  const [showForm, setShowForm] = useState(false);
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);

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
    state: "",
    pincode: "",
    instagram: "",
    facebook: "",
    linkedin: "",
    youtube: "",
    twitter: "",
    // Preview-only fields (not sent to API)
    logoPreview: "",
    jobTitle: "",
    companyName: "",
    offer: "",
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
      whatsapp: String((card as any).whatsapp || ""),
      telegram: String((card as any).telegram || ""),
      email: card.email || "",
      location: card.location || "",
      state: String((card as any).state || ""),
      pincode: String((card as any).pincode || ""),
      instagram: card.instagram || "",
      facebook: card.facebook || "",
      linkedin: card.linkedin || "",
      youtube: card.youtube || "",
      twitter: card.twitter || "",
      logoPreview: "",
      jobTitle: String((card as any).job_title || ""),
      companyName: String((card as any).company_name || ""),
      offer: String((card as any).offer || ""),
    });
    if (card.logo_url) setProfilePhotoUri(card.logo_url);
    // Restore country codes
    if ((card as any).personal_country_code) setPhoneCountry((card as any).personal_country_code);
  }, [isEdit, cardId, cards]);

  const updateField = useCallback((field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const [uploadImage] = useUploadImageMutation();

  const pickProfilePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      toast.error("Permission to access photos is required");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setProfilePhotoUri(result.assets[0].uri);
    }
  };

  const uploadProfilePhoto = async (): Promise<string | null> => {
    if (!profilePhotoUri || profilePhotoUri.startsWith("http")) return profilePhotoUri;
    try {
      setUploading(true);
      const uri = profilePhotoUri;
      const ext = uri.split(".").pop() || "jpg";
      const formData = new FormData();
      formData.append("file", { uri, name: `profile.${ext}`, type: `image/${ext}` } as any);
      const result = await uploadImage(formData).unwrap();
      return result.url;
    } catch {
      toast.error("Profile photo upload failed");
      return null;
    } finally {
      setUploading(false);
    }
  };

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

  const handleAutoLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      toast.error("Location permission denied");
      return;
    }
    toast.success("Detecting location...");
    const pos = await Location.getCurrentPositionAsync({});
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=en`,
        { headers: { "User-Agent": "InstantllyCards/1.0" } }
      );
      const data = await res.json();
      const a = data.address || {};
      const area = a.suburb || a.neighbourhood || a.quarter || a.village || a.hamlet || null;
      const city = a.city || a.town || a.county || a.state_district || a.state;
      const loc = [area, city, city !== a.state ? a.state : null, a.country]
        .filter(Boolean)
        .join(", ");
      updateField("location", loc);
      if (a.state) updateField("state", a.state);
      if (a.postcode) updateField("pincode", a.postcode);
    } catch {
      toast.error("Could not resolve address");
    }
  };

  const progressFields = [
    form.fullName,
    form.phone,
    form.email,
    form.location,
    form.state,
    form.pincode,
    form.instagram || form.facebook || form.linkedin ? "social" : "",
  ];
  const filledCount = progressFields.filter(Boolean).length;
  const progress = Math.round((filledCount / progressFields.length) * 100);

  const sectionComplete: Record<string, boolean> = useMemo(
    () => ({
      personal: !!(form.fullName && form.phone),
      social: !!(
        form.instagram ||
        form.facebook ||
        form.linkedin ||
        form.youtube ||
        form.twitter
      ),
    }),
    [form]
  );

  const isValid = !!(form.fullName.trim() && form.phone.trim() && form.state.trim() && form.pincode.trim());

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please sign in to create a card");
      navigation.navigate("Auth");
      return;
    }
    setTouched({ fullName: true, phone: true, state: true, pincode: true });
    if (!isValid) {
      toast.error("Please fill in Full Name, Mobile Number, State and Pincode");
      return;
    }

    const profilePhotoUrl = await uploadProfilePhoto();

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
      state: form.state || null,
      pincode: form.pincode || null,
      instagram: form.instagram || null,
      facebook: form.facebook || null,
      linkedin: form.linkedin || null,
      youtube: form.youtube || null,
      twitter: form.twitter || null,
      personal_country_code: phoneCountry,
      logo_url: profilePhotoUrl || null,
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
  
  // Show form if: editing, user explicitly clicked create, skip preview flag, or no existing cards
  const shouldShowForm = isEdit || showForm || skipPreview || !myCards.length;

  // Debug logging
  useEffect(() => {
    if (myCards.length > 0) {
      console.log('[CardCreate] User ID:', user?.id);
      console.log('[CardCreate] User Email:', user?.email);
      console.log('[CardCreate] Found cards:', myCards.length);
      console.log('[CardCreate] First card user_id:', myCards[0]?.user_id);
      console.log('[CardCreate] All card user_ids:', myCards.map((c: any) => c.user_id));
    }
  }, [myCards, user]);

  // If not showing form, show existing cards view
  if (!shouldShowForm && !isEdit && user && !isLoadingMyCards && myCards.length > 0) {
    return (
      <View className="flex-1 bg-background">
        {/* ── Simple Header ── */}
        <View className="border-b border-border bg-card px-4 py-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-lg font-bold text-foreground">Your Business Cards</Text>
              <Text className="text-xs text-muted-foreground">
                {user?.email || 'User'} • {myCards.length} {myCards.length === 1 ? 'card' : 'cards'}
              </Text>
            </View>
            <Pressable
              onPress={() => navigation.goBack()}
              className="h-8 w-8 items-center justify-center rounded-full bg-muted"
            >
              <X size={16} color="#111827" />
            </Pressable>
          </View>
        </View>

        <ScrollView 
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 }}
        >
          {/* Existing Cards */}
          <View className="gap-3">
            {myCards.map((card: any) => (
              <Pressable
                key={card.id}
                onPress={() => navigation.navigate("BusinessDetail", { id: String(card.id) })}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <View className="flex-row items-start gap-3">
                  <View className="h-14 w-14 items-center justify-center rounded-xl bg-primary/10 overflow-hidden">
                    {card.logo_url ? (
                      <Image source={{ uri: card.logo_url }} className="h-full w-full" resizeMode="cover" />
                    ) : (
                      <Text className="text-2xl">🏢</Text>
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-foreground">
                      {card.full_name}
                    </Text>
                    {card.job_title && (
                      <Text className="text-sm font-medium text-primary">{card.job_title}</Text>
                    )}
                    {card.company_name && (
                      <Text className="text-sm text-muted-foreground">{card.company_name}</Text>
                    )}
                  </View>
                </View>
                {card.category && (
                  <View className="mt-3">
                    <Text className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                      {card.category}
                    </Text>
                  </View>
                )}
                {card.offer && (
                  <View className="mt-2 rounded-lg bg-accent px-3 py-2">
                    <Text className="text-xs font-medium text-accent-foreground">
                      🎁 {card.offer}
                    </Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          {/* Create New Card Button */}
          <View className="mt-6">
            <Pressable
              onPress={() => setShowForm(true)}
              className="rounded-2xl bg-primary p-4 flex-row items-center justify-center gap-2"
            >
              <Plus size={20} color="#ffffff" />
              <Text className="text-base font-bold text-primary-foreground">Create New Business Card</Text>
            </Pressable>
            <Text className="text-xs text-muted-foreground text-center mt-3">
              Create additional business cards for different services or locations
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

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
                {profilePhotoUri ? (
                  <Image
                    source={{ uri: profilePhotoUri }}
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
                  {form.phone || "Phone"}
                </Text>
                <Text className="text-[10px] text-muted-foreground">
                  {form.email || "Email"}
                </Text>
              </View>
            </View>
            {form.location ? (
              <View className="mt-2 rounded-lg bg-muted px-2 py-1.5">
                <Text className="text-[10px] font-semibold text-muted-foreground">
                  {"📍"} {form.location}
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
            <Label className={labelClass}>Profile Photo</Label>
            <View className="flex-row items-center gap-4">
              <View className="h-20 w-20 rounded-full bg-muted/50 items-center justify-center overflow-hidden border border-border">
                {profilePhotoUri ? (
                  <Image source={{ uri: profilePhotoUri }} style={{ width: 80, height: 80, borderRadius: 40 }} resizeMode="cover" />
                ) : (
                  <User size={32} color="#9ca3af" />
                )}
              </View>
              <View className="flex-1 gap-2">
                <Pressable
                  onPress={pickProfilePhoto}
                  className="flex-row items-center justify-center gap-2 rounded-xl bg-primary/10 py-3 px-4"
                >
                  <Camera size={16} color="#2563eb" />
                  <Text className="text-sm font-medium text-primary">
                    {profilePhotoUri ? "Change Photo" : "Upload Photo"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
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
              >
                {"\u{1F4CD}"} Auto
              </Button>
            </View>
            <TextInput
              placeholder="Enter complete address (Street, Area, City)"
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
            <Label className={labelClass}>State <Text className="text-destructive">*</Text></Label>
            <Input
              placeholder="Enter state"
              value={form.state}
              onChangeText={(v) => updateField("state", v)}
              onBlur={() => markTouched("state")}
              className={touched.state && !form.state ? errorInputClass : inputClass}
            />
            {touched.state && !form.state && (
              <Text className="text-xs text-destructive">State is required</Text>
            )}
          </View>
          <View style={{ gap: 6 }}>
            <Label className={labelClass}>Pincode <Text className="text-destructive">*</Text></Label>
            <Input
              placeholder="Enter pincode"
              value={form.pincode}
              onChangeText={(v) => updateField("pincode", v)}
              onBlur={() => markTouched("pincode")}
              keyboardType="numeric"
              maxLength={6}
              className={touched.pincode && !form.pincode ? errorInputClass : inputClass}
            />
            {touched.pincode && !form.pincode && (
              <Text className="text-xs text-destructive">Pincode is required</Text>
            )}
          </View>
        </AccordionSection>

        {/* Section 2: Social */}
        <AccordionSection
          title="Social Media"
          subtitle="Connect on social platforms"
          isOpen={!!openSections.social}
          onToggle={() => toggleSection("social")}
          stepNum={2}
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
