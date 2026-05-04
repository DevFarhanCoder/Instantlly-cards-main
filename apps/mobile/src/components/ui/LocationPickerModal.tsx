/**
 * LocationPickerModal — lets the user choose a city or use GPS.
 *
 * Usage:
 *   <LocationPickerModal visible={show} onClose={() => setShow(false)} />
 */
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { CheckCircle2, MapPin, Navigation, Search, X } from "lucide-react-native";
import { useAppLocation } from "../../contexts/LocationContext";
import { useColors } from "../../theme/colors";

// ─── Popular Indian cities ────────────────────────────────────────────────────

const POPULAR_CITIES: { city: string; state: string }[] = [
  { city: "Mumbai", state: "Maharashtra" },
  { city: "Delhi", state: "Delhi" },
  { city: "Bangalore", state: "Karnataka" },
  { city: "Hyderabad", state: "Telangana" },
  { city: "Ahmedabad", state: "Gujarat" },
  { city: "Chennai", state: "Tamil Nadu" },
  { city: "Kolkata", state: "West Bengal" },
  { city: "Surat", state: "Gujarat" },
  { city: "Pune", state: "Maharashtra" },
  { city: "Jaipur", state: "Rajasthan" },
  { city: "Lucknow", state: "Uttar Pradesh" },
  { city: "Kanpur", state: "Uttar Pradesh" },
  { city: "Nagpur", state: "Maharashtra" },
  { city: "Indore", state: "Madhya Pradesh" },
  { city: "Thane", state: "Maharashtra" },
  { city: "Bhopal", state: "Madhya Pradesh" },
  { city: "Visakhapatnam", state: "Andhra Pradesh" },
  { city: "Patna", state: "Bihar" },
  { city: "Vadodara", state: "Gujarat" },
  { city: "Ghaziabad", state: "Uttar Pradesh" },
  { city: "Ludhiana", state: "Punjab" },
  { city: "Agra", state: "Uttar Pradesh" },
  { city: "Nashik", state: "Maharashtra" },
  { city: "Faridabad", state: "Haryana" },
  { city: "Meerut", state: "Uttar Pradesh" },
  { city: "Rajkot", state: "Gujarat" },
  { city: "Varanasi", state: "Uttar Pradesh" },
  { city: "Srinagar", state: "Jammu & Kashmir" },
  { city: "Aurangabad", state: "Maharashtra" },
  { city: "Amritsar", state: "Punjab" },
  { city: "Navi Mumbai", state: "Maharashtra" },
  { city: "Allahabad", state: "Uttar Pradesh" },
  { city: "Ranchi", state: "Jharkhand" },
  { city: "Howrah", state: "West Bengal" },
  { city: "Coimbatore", state: "Tamil Nadu" },
  { city: "Jabalpur", state: "Madhya Pradesh" },
  { city: "Gwalior", state: "Madhya Pradesh" },
  { city: "Vijayawada", state: "Andhra Pradesh" },
  { city: "Jodhpur", state: "Rajasthan" },
  { city: "Madurai", state: "Tamil Nadu" },
  { city: "Raipur", state: "Chhattisgarh" },
  { city: "Kota", state: "Rajasthan" },
  { city: "Guwahati", state: "Assam" },
  { city: "Chandigarh", state: "Chandigarh" },
  { city: "Solapur", state: "Maharashtra" },
  { city: "Hubli", state: "Karnataka" },
  { city: "Mysore", state: "Karnataka" },
  { city: "Tiruchirappalli", state: "Tamil Nadu" },
  { city: "Bareilly", state: "Uttar Pradesh" },
  { city: "Aligarh", state: "Uttar Pradesh" },
  { city: "Moradabad", state: "Uttar Pradesh" },
  { city: "Gurgaon", state: "Haryana" },
  { city: "Noida", state: "Uttar Pradesh" },
  { city: "Kolhapur", state: "Maharashtra" },
  { city: "Jalandhar", state: "Punjab" },
  { city: "Bhilai", state: "Chhattisgarh" },
  { city: "Dehradun", state: "Uttarakhand" },
  { city: "Jammu", state: "Jammu & Kashmir" },
  { city: "Udaipur", state: "Rajasthan" },
  { city: "Kochi", state: "Kerala" },
  { city: "Thiruvananthapuram", state: "Kerala" },
  { city: "Kozhikode", state: "Kerala" },
  { city: "Bhubaneswar", state: "Odisha" },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function LocationPickerModal({ visible, onClose }: Props) {
  const colors = useColors();
  const { city: currentCity, isManual, setManualCity, resetToGPS, isLoading } = useAppLocation();
  const [search, setSearch] = useState("");
  const [resetting, setResetting] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return POPULAR_CITIES;
    const q = search.toLowerCase();
    return POPULAR_CITIES.filter(
      (c) =>
        c.city.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q)
    );
  }, [search]);

  const handleSelect = async (c: { city: string; state: string }) => {
    await setManualCity(c.city, c.state);
    setSearch("");
    onClose();
  };

  const handleUseMyLocation = async () => {
    setResetting(true);
    await resetToGPS();
    setResetting(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Text
            style={{ fontSize: 17, fontWeight: "700", color: colors.foreground }}
          >
            Choose Location
          </Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <X size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* Current location row */}
        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}>
          <Pressable
            onPress={handleUseMyLocation}
            disabled={resetting || isLoading}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              padding: 12,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: !isManual ? colors.primary : colors.border,
              backgroundColor: !isManual ? colors.primary + "10" : colors.card,
            }}
          >
            {resetting || (isLoading && !isManual) ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Navigation size={18} color={colors.primary} />
            )}
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: colors.foreground,
                }}
              >
                Use my current location
              </Text>
              {!isManual && currentCity ? (
                <Text style={{ fontSize: 12, color: colors.primary, marginTop: 1 }}>
                  Detected: {currentCity}
                </Text>
              ) : isManual ? (
                <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 1 }}>
                  Tap to switch back to GPS
                </Text>
              ) : null}
            </View>
            {!isManual && (
              <CheckCircle2 size={16} color={colors.primary} />
            )}
          </Pressable>
        </View>

        {/* Search */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            marginHorizontal: 16,
            marginBottom: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
          }}
        >
          <Search size={15} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search city or state..."
            placeholderTextColor={colors.mutedForeground}
            style={{ flex: 1, fontSize: 14, color: colors.foreground }}
            autoCapitalize="words"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <X size={14} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {/* Section label */}
        <Text
          style={{
            fontSize: 11,
            fontWeight: "700",
            color: colors.mutedForeground,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            marginHorizontal: 16,
            marginBottom: 6,
          }}
        >
          {search.trim() ? `Results (${filtered.length})` : "Popular Cities"}
        </Text>

        {/* City list */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.city}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 44 }} />
          )}
          renderItem={({ item }) => {
            const isSelected = isManual && currentCity === item.city;
            return (
              <Pressable
                onPress={() => handleSelect(item)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 13,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: isSelected ? colors.primary + "20" : colors.muted,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MapPin
                    size={14}
                    color={isSelected ? colors.primary : colors.mutedForeground}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: isSelected ? "700" : "500",
                      color: isSelected ? colors.primary : colors.foreground,
                    }}
                  >
                    {item.city}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
                    {item.state}
                  </Text>
                </View>
                {isSelected && (
                  <CheckCircle2 size={16} color={colors.primary} />
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={{ padding: 32, alignItems: "center" }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                No cities found for "{search}"
              </Text>
            </View>
          }
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}
