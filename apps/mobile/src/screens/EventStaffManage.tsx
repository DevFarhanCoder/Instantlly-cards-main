import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useColors } from "../theme/colors";
import {
  useListEventStaffQuery,
  useAddEventStaffMutation,
  useRemoveEventStaffMutation,
  EventStaffMember,
} from "../store/api/eventsApi";
import { Users, UserPlus, Trash2, ChevronLeft } from "lucide-react-native";

const ROLE_LABELS: Record<string, string> = {
  co_organizer: "Co-organizer",
  scanner: "Scanner",
};

export default function EventStaffManage() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const eventId = Number(route.params?.id);
  const colors = useColors();

  const { data: staff = [], isLoading } = useListEventStaffQuery(eventId);
  const [addStaff, { isLoading: adding }] = useAddEventStaffMutation();
  const [removeStaff] = useRemoveEventStaffMutation();

  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"co_organizer" | "scanner">("co_organizer");
  const [showForm, setShowForm] = useState(false);

  async function handleAdd() {
    const trimmed = phone.trim();
    const full = trimmed.startsWith("+") ? trimmed : `+91${trimmed}`;
    if (!trimmed) {
      Alert.alert("Error", "Enter a phone number");
      return;
    }
    try {
      await addStaff({ eventId, phone: full, role }).unwrap();
      setPhone("");
      setShowForm(false);
    } catch (e: any) {
      Alert.alert("Error", e?.data?.error ?? "Failed to add staff member");
    }
  }

  function handleRemove(member: EventStaffMember) {
    Alert.alert(
      "Remove staff",
      `Remove ${member.name || member.phone} from this event?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () =>
            removeStaff({ eventId, staffId: member.id }).unwrap().catch((e: any) =>
              Alert.alert("Error", e?.data?.error ?? "Failed to remove")
            ),
        },
      ]
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View
        className="flex-row items-center gap-3 px-4 pb-3 border-b border-border bg-card"
        style={{ paddingTop: (StatusBar.currentHeight ?? 0) + 14 }}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <ChevronLeft size={22} color={colors.foreground} />
        </Pressable>
        <Text className="text-base font-bold text-foreground flex-1">Manage Team</Text>
        <Pressable
          onPress={() => setShowForm((v) => !v)}
          className="flex-row items-center gap-1.5 bg-primary px-3 py-1.5 rounded-lg"
        >
          <UserPlus size={14} color="#fff" />
          <Text className="text-xs font-semibold text-white">
            {showForm ? "Cancel" : "Add"}
          </Text>
        </Pressable>
      </View>

      {/* Add form — outside ScrollView so keyboard doesn't push list */}
      {showForm && (
        <View className="border-b border-border bg-card px-4 py-4 gap-3">
          <Text className="text-sm font-semibold text-foreground">Add Staff Member</Text>

          {/* Phone with +91 prefix */}
          <View className="flex-row items-center h-11 rounded-lg border border-input bg-background overflow-hidden">
            <View className="px-3 h-full justify-center border-r border-input bg-muted">
              <Text className="text-sm font-medium text-foreground">+91</Text>
            </View>
            <TextInput
              className="flex-1 px-3 text-sm text-foreground"
              placeholder="Phone number"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              value={phone}
              onChangeText={setPhone}
              maxLength={10}
            />
          </View>

          {/* Role selector */}
          <View className="flex-row gap-2">
            {(["co_organizer", "scanner"] as const).map((r) => (
              <Pressable
                key={r}
                onPress={() => setRole(r)}
                className={`flex-1 py-2 rounded-xl border items-center ${
                  role === r ? "border-primary bg-primary/10" : "border-border bg-background"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    role === r ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {ROLE_LABELS[r]}
                </Text>
              </Pressable>
            ))}
          </View>

          <View>
            <Text className="text-xs text-muted-foreground">
              {role === "co_organizer"
                ? "Can edit agenda, sessions & speakers. Cannot delete the event."
                : "Can only scan tickets at the door."}
            </Text>
          </View>

          <Pressable
            onPress={handleAdd}
            disabled={adding}
            className="bg-primary rounded-xl py-2.5 items-center"
          >
            {adding ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-sm font-semibold text-white">Add Member</Text>
            )}
          </Pressable>
        </View>
      )}

      <ScrollView className="flex-1 p-4" keyboardShouldPersistTaps="handled">

        {/* Staff list */}
        {isLoading ? (
          <ActivityIndicator className="mt-8" color={colors.primary} />
        ) : staff.length === 0 ? (
          <View className="items-center mt-12 gap-2">
            <Users size={36} color={colors.mutedForeground} />
            <Text className="text-sm text-muted-foreground text-center">
              No team members yet.{"\n"}Tap Add to invite co-organizers.
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {staff.map((member) => (
              <View
                key={member.id}
                className="flex-row items-center bg-card border border-border rounded-xl px-4 py-3 gap-3"
              >
                {/* Avatar initial */}
                <View className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center">
                  <Text className="text-sm font-bold text-primary">
                    {(member.name || member.phone).charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">
                    {member.name || member.phone}
                  </Text>
                  <Text className="text-xs text-muted-foreground">{member.phone}</Text>
                </View>
                <View
                  className={`px-2 py-0.5 rounded-full mr-2 ${
                    member.role === "co_organizer"
                      ? "bg-blue-500/10"
                      : "bg-green-500/10"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-semibold ${
                      member.role === "co_organizer" ? "text-blue-500" : "text-green-600"
                    }`}
                  >
                    {ROLE_LABELS[member.role]}
                  </Text>
                </View>
                <Pressable onPress={() => handleRemove(member)} hitSlop={8}>
                  <Trash2 size={16} color="#ef4444" />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
