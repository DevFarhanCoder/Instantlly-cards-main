import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useColors } from "../theme/colors";
import {
  useGetVoucherStaffQuery,
  useAddVoucherStaffMutation,
  useRemoveVoucherStaffMutation,
} from "../store/api/vouchersApi";
import { ChevronLeft, MapPin, Trash2, UserPlus, Users } from "lucide-react-native";

const ROLE_OPTIONS = [
  { value: "scanner", label: "Scanner" },
  { value: "co-owner", label: "Co-owner" },
];

const ROLE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  scanner: { bg: "#2563eb15", border: "#2563eb40", text: "#2563eb" },
  "co-owner": { bg: "#7c3aed15", border: "#7c3aed40", text: "#7c3aed" },
};

export default function VoucherStaff() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { voucherId, voucherTitle, addresses: rawAddresses = [] } = route.params as {
    voucherId: number;
    voucherTitle: string;
    addresses: Array<string | { address: string; instagram?: string | null }>;
  };
  // Normalise to plain strings for display in address pills
  const addresses = rawAddresses.map((a) =>
    typeof a === 'string' ? a : a.address
  ).filter(Boolean);
  const colors = useColors();

  const { data: staff = [], isLoading } = useGetVoucherStaffQuery(voucherId);
  const [addStaff, { isLoading: adding }] = useAddVoucherStaffMutation();
  const [removeStaff] = useRemoveVoucherStaffMutation();

  const [showForm, setShowForm] = useState(false);
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("scanner");
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);

  async function handleAdd() {
    const trimmed = phone.trim();
    if (!trimmed) {
      Alert.alert("Error", "Enter a phone number");
      return;
    }
    const full = trimmed.startsWith("+") ? trimmed : `+91${trimmed}`;
    try {
      await addStaff({
        voucherId,
        phone: full,
        role,
        assigned_address: selectedAddress ?? undefined,
      }).unwrap();
      setPhone("");
      setSelectedAddress(null);
      setShowForm(false);
    } catch (e: any) {
      Alert.alert("Error", e?.data?.error ?? "Failed to add team member");
    }
  }

  function handleRemove(memberId: number, name: string | null) {
    Alert.alert(
      "Remove Member",
      `Remove ${name ?? "this member"} from the team?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removeStaff({ voucherId, staffId: memberId }).unwrap();
            } catch (e: any) {
              Alert.alert("Error", e?.data?.error ?? "Failed to remove member");
            }
          },
        },
      ]
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          gap: 12,
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground }}>
            Team
          </Text>
          <Text style={{ fontSize: 12, color: colors.mutedForeground }} numberOfLines={1}>
            {voucherTitle}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowForm((v) => !v)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: "#2563eb",
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 8,
          }}
        >
          <UserPlus size={15} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* Add member form */}
        {showForm && (
          <View
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
              padding: 16,
              gap: 12,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>
              Add Team Member
            </Text>

            {/* Phone input */}
            <View>
              <Text style={{ fontSize: 12, color: colors.mutedForeground, marginBottom: 4 }}>
                Phone Number
              </Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="+91XXXXXXXXXX"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: colors.foreground,
                  backgroundColor: colors.background,
                }}
              />
            </View>

            {/* Role selection */}
            <View>
              <Text style={{ fontSize: 12, color: colors.mutedForeground, marginBottom: 6 }}>
                Role
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {ROLE_OPTIONS.map((r) => (
                  <TouchableOpacity
                    key={r.value}
                    onPress={() => setRole(r.value)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 20,
                      borderWidth: 1.5,
                      borderColor: role === r.value ? (ROLE_COLORS[r.value]?.text ?? "#2563eb") : colors.border,
                      backgroundColor: role === r.value ? (ROLE_COLORS[r.value]?.bg ?? "#2563eb15") : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: role === r.value ? (ROLE_COLORS[r.value]?.text ?? "#2563eb") : colors.mutedForeground,
                      }}
                    >
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Address selection (optional) */}
            {addresses.length > 0 && (
              <View>
                <Text style={{ fontSize: 12, color: colors.mutedForeground, marginBottom: 6 }}>
                  Assign to Address (optional)
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {addresses.map((addr) => (
                    <TouchableOpacity
                      key={addr}
                      onPress={() =>
                        setSelectedAddress((prev) => (prev === addr ? null : addr))
                      }
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 5,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        borderWidth: 1.5,
                        borderColor:
                          selectedAddress === addr ? "#2563eb" : colors.border,
                        backgroundColor:
                          selectedAddress === addr ? "#2563eb15" : "transparent",
                      }}
                    >
                      <MapPin
                        size={12}
                        color={selectedAddress === addr ? "#2563eb" : colors.mutedForeground}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          color:
                            selectedAddress === addr
                              ? "#2563eb"
                              : colors.mutedForeground,
                          fontWeight: selectedAddress === addr ? "600" : "400",
                        }}
                      >
                        {addr}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Buttons */}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowForm(false);
                  setPhone("");
                  setSelectedAddress(null);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: colors.mutedForeground, fontWeight: "600" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAdd}
                disabled={adding}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: "#2563eb",
                  alignItems: "center",
                  opacity: adding ? 0.6 : 1,
                }}
              >
                {adding ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Add Member</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Staff list */}
        {isLoading ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : staff.length === 0 ? (
          <View
            style={{
              paddingVertical: 48,
              alignItems: "center",
              gap: 10,
            }}
          >
            <Users size={40} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, fontSize: 15 }}>
              No team members yet
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 13, textAlign: "center" }}>
              Tap "Add" to add a scanner who can redeem this voucher.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {staff.map((member) => (
              <View
                key={member.id}
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                  padding: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                {/* Avatar placeholder */}
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: "#2563eb20",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 18, color: "#2563eb", fontWeight: "700" }}>
                    {(member.user.name ?? member.user.phone ?? "?")[0].toUpperCase()}
                  </Text>
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>
                    {member.user.name ?? "Unknown"}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                    {member.user.phone ?? ""}
                  </Text>
                  {member.assigned_address && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <MapPin size={11} color={colors.mutedForeground} />
                      <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
                        {member.assigned_address}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Role pill */}
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 20,
                    backgroundColor: ROLE_COLORS[member.role]?.bg ?? "#2563eb15",
                    borderWidth: 1,
                    borderColor: ROLE_COLORS[member.role]?.border ?? "#2563eb40",
                  }}
                >
                  <Text style={{ fontSize: 11, color: ROLE_COLORS[member.role]?.text ?? "#2563eb", fontWeight: "600" }}>
                    {member.role === "co-owner" ? "Co-owner" : member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                  </Text>
                </View>

                {/* Remove button */}
                <TouchableOpacity
                  onPress={() => handleRemove(member.id, member.user.name)}
                  style={{ padding: 6 }}
                >
                  <Trash2 size={17} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
