/**
 * EventAgendaEdit — Organizer screen for managing a multi-day event agenda.
 *
 * Two tabs:
 *   Speakers — add/edit/delete speakers (photo, name, title, company, bio, links)
 *   Agenda   — add/edit/delete days, add sessions per day, tag speakers to sessions
 *
 * Navigation: Push from EventDetail via "Edit Agenda" button (organizer only).
 * Route params: { id: eventId }
 */
import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronUp,
  Mic2,
  Plus,
  Trash2,
  User,
  Users,
  Clock,
  Edit3,
  Link,
} from "lucide-react-native";

import { Button } from "../components/ui/button";
import { useColors } from "../theme/colors";
import { toast } from "../lib/toast";
import { API_URL } from "../store/api/baseApi";
import {
  useGetEventAgendaQuery,
  useCreateEventDayMutation,
  useDeleteEventDayMutation,
  useCreateEventSessionMutation,
  useDeleteEventSessionMutation,
  useCreateEventSpeakerMutation,
  useUpdateEventSpeakerMutation,
  useDeleteEventSpeakerMutation,
  useAssignSessionSpeakerMutation,
  useUnassignSessionSpeakerMutation,
} from "../store/api/eventsApi";
import type {
  AgendaDay,
  AgendaSession,
  AgendaSpeaker,
} from "../store/api/eventsApi";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDayDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

async function uploadSpeakerPhoto(uri: string): Promise<string> {
  const token = await SecureStore.getItemAsync("accessToken");
  if (!token) throw new Error("Not authenticated");
  const filename = uri.split("/").pop() ?? "photo.jpg";
  const ext = filename.split(".").pop() ?? "jpg";
  const mimeType = ext === "png" ? "image/png" : "image/jpeg";
  const formData = new FormData();
  formData.append("file", { uri, name: filename, type: mimeType } as any);
  const res = await fetch(
    `${API_URL}/api/uploads/event-media?folder=speaker`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }
  );
  if (!res.ok) throw new Error("Upload failed");
  const json = await res.json();
  return json.url as string;
}

// ─── Session type options ─────────────────────────────────────────────────────

const SESSION_TYPES = [
  "keynote",
  "panel",
  "workshop",
  "break",
  "networking",
  "session",
];

// ─── Speaker form modal ───────────────────────────────────────────────────────

interface SpeakerFormState {
  name: string;
  title: string;
  company: string;
  bio: string;
  linkedin_url: string;
  twitter_url: string;
  photo_url: string;
}

const EMPTY_SPEAKER: SpeakerFormState = {
  name: "",
  title: "",
  company: "",
  bio: "",
  linkedin_url: "",
  twitter_url: "",
  photo_url: "",
};

interface SpeakerFormModalProps {
  visible: boolean;
  initial?: SpeakerFormState;
  onSave: (data: SpeakerFormState) => Promise<void>;
  onClose: () => void;
}

function SpeakerFormModal({
  visible,
  initial,
  onSave,
  onClose,
}: SpeakerFormModalProps) {
  const colors = useColors();
  const [form, setForm] = useState<SpeakerFormState>(initial ?? EMPTY_SPEAKER);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    setForm(initial ?? EMPTY_SPEAKER);
  }, [visible, initial]);

  const set = (key: keyof SpeakerFormState, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission required", "Allow photo access to upload speaker photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;
    const uri = result.assets[0]?.uri;
    if (!uri) return;
    try {
      setUploading(true);
      const url = await uploadSpeakerPhoto(uri);
      set("photo_url", url);
    } catch (e: any) {
      Alert.alert("Upload failed", e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert("Name required", "Please enter a speaker name.");
      return;
    }
    try {
      setSaving(true);
      await onSave(form);
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save speaker");
    } finally {
      setSaving(false);
    }
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
          <Pressable onPress={onClose}>
            <Text style={{ color: colors.primary, fontSize: 15 }}>Cancel</Text>
          </Pressable>
          <Text
            style={{
              fontWeight: "700",
              fontSize: 16,
              color: colors.foreground,
            }}
          >
            {initial?.name ? "Edit Speaker" : "Add Speaker"}
          </Text>
          <Pressable onPress={handleSave} disabled={saving}>
            <Text
              style={{
                color: saving ? colors.mutedForeground : colors.primary,
                fontSize: 15,
                fontWeight: "700",
              }}
            >
              {saving ? "Saving…" : "Save"}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 14 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Photo */}
          <Pressable
            onPress={pickPhoto}
            style={{ alignItems: "center", marginBottom: 8 }}
          >
            {form.photo_url ? (
              <Image
                source={{ uri: form.photo_url }}
                style={{ width: 80, height: 80, borderRadius: 40 }}
              />
            ) : (
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: colors.muted,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: colors.border,
                  borderStyle: "dashed",
                }}
              >
                <User size={28} color={colors.mutedForeground} />
              </View>
            )}
            <Text
              style={{
                marginTop: 6,
                fontSize: 12,
                color: colors.primary,
                fontWeight: "600",
              }}
            >
              {uploading ? "Uploading…" : "Tap to add photo"}
            </Text>
          </Pressable>

          {[
            { label: "Name *", key: "name", placeholder: "e.g. Jane Smith" },
            { label: "Job Title", key: "title", placeholder: "e.g. Head of AI" },
            { label: "Company", key: "company", placeholder: "e.g. Acme Corp" },
          ].map(({ label, key, placeholder }) => (
            <View key={key}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: colors.mutedForeground,
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                {label}
              </Text>
              <TextInput
                value={form[key as keyof SpeakerFormState]}
                onChangeText={(v) => set(key as keyof SpeakerFormState, v)}
                placeholder={placeholder}
                placeholderTextColor={colors.mutedForeground}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: colors.foreground,
                  backgroundColor: colors.card,
                }}
              />
            </View>
          ))}

          <View>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: colors.mutedForeground,
                marginBottom: 4,
                textTransform: "uppercase",
                letterSpacing: 0.6,
              }}
            >
              Bio
            </Text>
            <TextInput
              value={form.bio}
              onChangeText={(v) => set("bio", v)}
              placeholder="Short bio (2–3 lines)"
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={4}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 14,
                color: colors.foreground,
                backgroundColor: colors.card,
                minHeight: 80,
                textAlignVertical: "top",
              }}
            />
          </View>

          {[
            { label: "LinkedIn URL", key: "linkedin_url", placeholder: "https://linkedin.com/in/..." },
            { label: "Twitter URL", key: "twitter_url", placeholder: "https://twitter.com/..." },
          ].map(({ label, key, placeholder }) => (
            <View key={key}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: colors.mutedForeground,
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                {label}
              </Text>
              <TextInput
                value={form[key as keyof SpeakerFormState]}
                onChangeText={(v) => set(key as keyof SpeakerFormState, v)}
                placeholder={placeholder}
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                keyboardType="url"
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: colors.foreground,
                  backgroundColor: colors.card,
                }}
              />
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Session form modal ───────────────────────────────────────────────────────

interface SessionFormState {
  title: string;
  description: string;
  start_time: string; // "HH:MM"
  end_time: string;
  session_type: string;
  location: string;
  speaker_ids: number[];
}

const EMPTY_SESSION: SessionFormState = {
  title: "",
  description: "",
  start_time: "09:00",
  end_time: "10:00",
  session_type: "session",
  location: "",
  speaker_ids: [],
};

interface SessionFormModalProps {
  visible: boolean;
  dayDate: string; // ISO date for the day — used to build full timestamp
  speakers: AgendaSpeaker[];
  onSave: (data: SessionFormState) => Promise<void>;
  onClose: () => void;
}

function SessionFormModal({
  visible,
  dayDate,
  speakers,
  onSave,
  onClose,
}: SessionFormModalProps) {
  const colors = useColors();
  const [form, setForm] = useState<SessionFormState>(EMPTY_SESSION);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (visible) setForm(EMPTY_SESSION);
  }, [visible]);

  const set = (key: keyof SessionFormState, val: any) =>
    setForm((f) => ({ ...f, [key]: val }));

  const toggleSpeaker = (id: number) => {
    setForm((f) => ({
      ...f,
      speaker_ids: f.speaker_ids.includes(id)
        ? f.speaker_ids.filter((x) => x !== id)
        : [...f.speaker_ids, id],
    }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      Alert.alert("Title required", "Please enter a session title.");
      return;
    }
    try {
      setSaving(true);
      await onSave(form);
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save session");
    } finally {
      setSaving(false);
    }
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
          <Pressable onPress={onClose}>
            <Text style={{ color: colors.primary, fontSize: 15 }}>Cancel</Text>
          </Pressable>
          <Text
            style={{
              fontWeight: "700",
              fontSize: 16,
              color: colors.foreground,
            }}
          >
            Add Session
          </Text>
          <Pressable onPress={handleSave} disabled={saving}>
            <Text
              style={{
                color: saving ? colors.mutedForeground : colors.primary,
                fontSize: 15,
                fontWeight: "700",
              }}
            >
              {saving ? "Saving…" : "Save"}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 14 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View>
            <Text style={labelStyle(colors)}>Session Title *</Text>
            <TextInput
              value={form.title}
              onChangeText={(v) => set("title", v)}
              placeholder="e.g. Opening Keynote"
              placeholderTextColor={colors.mutedForeground}
              style={inputStyle(colors)}
            />
          </View>

          {/* Description */}
          <View>
            <Text style={labelStyle(colors)}>Description</Text>
            <TextInput
              value={form.description}
              onChangeText={(v) => set("description", v)}
              placeholder="Brief session description"
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
              style={[inputStyle(colors), { minHeight: 70, textAlignVertical: "top" }]}
            />
          </View>

          {/* Times */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={labelStyle(colors)}>Start Time</Text>
              <TextInput
                value={form.start_time}
                onChangeText={(v) => set("start_time", v)}
                placeholder="09:00"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numbers-and-punctuation"
                style={inputStyle(colors)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={labelStyle(colors)}>End Time</Text>
              <TextInput
                value={form.end_time}
                onChangeText={(v) => set("end_time", v)}
                placeholder="10:00"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numbers-and-punctuation"
                style={inputStyle(colors)}
              />
            </View>
          </View>

          {/* Type */}
          <View>
            <Text style={labelStyle(colors)}>Session Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {SESSION_TYPES.map((t) => {
                  const active = form.session_type === t;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => set("session_type", t)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 7,
                        borderRadius: 20,
                        backgroundColor: active ? colors.primary : colors.muted,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          textTransform: "capitalize",
                          color: active ? colors.primaryForeground : colors.mutedForeground,
                        }}
                      >
                        {t}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* Location / Track */}
          <View>
            <Text style={labelStyle(colors)}>Room / Track (optional)</Text>
            <TextInput
              value={form.location}
              onChangeText={(v) => set("location", v)}
              placeholder="e.g. Hall A"
              placeholderTextColor={colors.mutedForeground}
              style={inputStyle(colors)}
            />
          </View>

          {/* Speaker tags */}
          {speakers.length > 0 ? (
            <View>
              <Text style={labelStyle(colors)}>
                Tag Speakers ({form.speaker_ids.length} selected)
              </Text>
              <View style={{ gap: 8 }}>
                {speakers.map((sp) => {
                  const selected = form.speaker_ids.includes(sp.id);
                  return (
                    <Pressable
                      key={sp.id}
                      onPress={() => toggleSpeaker(sp.id)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        padding: 10,
                        borderRadius: 10,
                        borderWidth: 1.5,
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected
                          ? colors.primary + "10"
                          : colors.card,
                      }}
                    >
                      {sp.photo_url ? (
                        <Image
                          source={{ uri: sp.photo_url }}
                          style={{ width: 32, height: 32, borderRadius: 16 }}
                        />
                      ) : (
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: colors.primary + "20",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "700",
                              color: colors.primary,
                            }}
                          >
                            {sp.name[0]?.toUpperCase() ?? "S"}
                          </Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "600",
                            color: colors.foreground,
                          }}
                        >
                          {sp.name}
                        </Text>
                        {sp.title ? (
                          <Text
                            style={{ fontSize: 11, color: colors.mutedForeground }}
                          >
                            {sp.title}
                          </Text>
                        ) : null}
                      </View>
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          borderWidth: 2,
                          borderColor: selected ? colors.primary : colors.border,
                          backgroundColor: selected ? colors.primary : "transparent",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {selected ? (
                          <Text
                            style={{ color: colors.primaryForeground, fontSize: 12 }}
                          >
                            ✓
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : (
            <View
              style={{
                padding: 12,
                backgroundColor: colors.muted,
                borderRadius: 10,
              }}
            >
              <Text
                style={{ fontSize: 12, color: colors.mutedForeground, textAlign: "center" }}
              >
                Add speakers first — then you can tag them to sessions.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Style helpers ────────────────────────────────────────────────────────────

function labelStyle(colors: ReturnType<typeof useColors>) {
  return {
    fontSize: 11,
    fontWeight: "600" as const,
    color: colors.mutedForeground,
    marginBottom: 4,
    textTransform: "uppercase" as const,
    letterSpacing: 0.6,
  };
}

function inputStyle(colors: ReturnType<typeof useColors>) {
  return {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.foreground,
    backgroundColor: colors.card,
  };
}

// ─── Build ISO timestamp from a day date + "HH:MM" string ────────────────────

function buildTimestamp(dayDateIso: string, timeStr: string): string {
  const d = new Date(dayDateIso);
  const [hh = "0", mm = "0"] = timeStr.trim().split(":");
  d.setHours(parseInt(hh, 10), parseInt(mm, 10), 0, 0);
  return d.toISOString();
}

// ─── Main screen ──────────────────────────────────────────────────────────────

type ActiveTab = "speakers" | "agenda";

export default function EventAgendaEdit() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const eventId = Number(route?.params?.id);
  const colors = useColors();

  const { data: agenda, isLoading } = useGetEventAgendaQuery(eventId, {
    skip: !eventId,
  });

  const [createDay] = useCreateEventDayMutation();
  const [deleteDay] = useDeleteEventDayMutation();
  const [createSession] = useCreateEventSessionMutation();
  const [deleteSession] = useDeleteEventSessionMutation();
  const [createSpeaker] = useCreateEventSpeakerMutation();
  const [updateSpeaker] = useUpdateEventSpeakerMutation();
  const [deleteSpeaker] = useDeleteEventSpeakerMutation();
  const [assignSpeaker] = useAssignSessionSpeakerMutation();
  const [unassignSpeaker] = useUnassignSessionSpeakerMutation();

  const [activeTab, setActiveTab] = useState<ActiveTab>("speakers");
  const [expandedDayId, setExpandedDayId] = useState<number | null>(null);

  // Modals
  const [speakerFormVisible, setSpeakerFormVisible] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState<AgendaSpeaker | null>(null);
  const [sessionFormVisible, setSessionFormVisible] = useState(false);
  const [sessionFormDayId, setSessionFormDayId] = useState<number | null>(null);
  const [sessionFormDayDate, setSessionFormDayDate] = useState<string>("");

  const speakers = agenda?.speakers ?? [];
  const days = agenda?.days ?? [];

  // ── Speaker actions ──────────────────────────────────────────────────────

  const handleAddSpeaker = useCallback(
    async (form: SpeakerFormState) => {
      await createSpeaker({
        eventId,
        speaker: {
          name: form.name.trim(),
          title: form.title.trim() || undefined,
          company: form.company.trim() || undefined,
          bio: form.bio.trim() || undefined,
          photo_url: form.photo_url || undefined,
          linkedin_url: form.linkedin_url.trim() || undefined,
          twitter_url: form.twitter_url.trim() || undefined,
        },
      }).unwrap();
      toast.success("Speaker added");
    },
    [eventId, createSpeaker]
  );

  const handleEditSpeaker = useCallback(
    async (form: SpeakerFormState) => {
      if (!editingSpeaker) return;
      await updateSpeaker({
        eventId,
        speakerId: editingSpeaker.id,
        speaker: {
          name: form.name.trim(),
          title: form.title.trim() || undefined,
          company: form.company.trim() || undefined,
          bio: form.bio.trim() || undefined,
          photo_url: form.photo_url || undefined,
          linkedin_url: form.linkedin_url.trim() || undefined,
          twitter_url: form.twitter_url.trim() || undefined,
        },
      }).unwrap();
      toast.success("Speaker updated");
    },
    [editingSpeaker, eventId, updateSpeaker]
  );

  const handleDeleteSpeaker = useCallback(
    (sp: AgendaSpeaker) => {
      Alert.alert(
        "Delete Speaker",
        `Remove "${sp.name}" from all sessions?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteSpeaker({ eventId, speakerId: sp.id }).unwrap();
                toast.success("Speaker removed");
              } catch {
                toast.error("Failed to delete speaker");
              }
            },
          },
        ]
      );
    },
    [eventId, deleteSpeaker]
  );

  // ── Day actions ──────────────────────────────────────────────────────────

  const handleAddDay = useCallback(async () => {
    const nextNum = days.length + 1;
    const dayDate = new Date();
    dayDate.setDate(dayDate.getDate() + days.length);
    try {
      const created = await createDay({
        eventId,
        day: {
          day_number: nextNum,
          date: dayDate.toISOString().split("T")[0],
          title: `Day ${nextNum}`,
        },
      }).unwrap();
      setExpandedDayId(created.id);
      toast.success(`Day ${nextNum} added`);
    } catch {
      toast.error("Failed to add day");
    }
  }, [eventId, days, createDay]);

  const handleDeleteDay = useCallback(
    (day: AgendaDay) => {
      Alert.alert(
        "Delete Day",
        `Remove Day ${day.day_number} and all its sessions?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteDay({ eventId, dayId: day.id }).unwrap();
                toast.success("Day removed");
              } catch {
                toast.error("Failed to delete day");
              }
            },
          },
        ]
      );
    },
    [eventId, deleteDay]
  );

  // ── Session actions ──────────────────────────────────────────────────────

  const openAddSession = (day: AgendaDay) => {
    setSessionFormDayId(day.id);
    setSessionFormDayDate(day.date);
    setSessionFormVisible(true);
  };

  const handleAddSession = useCallback(
    async (form: SessionFormState) => {
      if (!sessionFormDayId || !sessionFormDayDate) return;
      const created = await createSession({
        eventId,
        session: {
          day_id: sessionFormDayId,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          start_time: buildTimestamp(sessionFormDayDate, form.start_time),
          end_time: buildTimestamp(sessionFormDayDate, form.end_time),
          session_type: form.session_type,
          location: form.location.trim() || undefined,
        },
      }).unwrap();

      // Assign tagged speakers
      await Promise.all(
        form.speaker_ids.map((spId) =>
          assignSpeaker({
            eventId,
            sessionId: created.id,
            speakerId: spId,
          }).unwrap()
        )
      );

      toast.success("Session added");
    },
    [eventId, sessionFormDayId, sessionFormDayDate, createSession, assignSpeaker]
  );

  const handleDeleteSession = useCallback(
    (session: AgendaSession) => {
      Alert.alert("Delete Session", `Remove "${session.title}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteSession({
                eventId,
                sessionId: session.id,
              }).unwrap();
              toast.success("Session removed");
            } catch {
              toast.error("Failed to delete session");
            }
          },
        },
      ]);
    },
    [eventId, deleteSession]
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View
        style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: colors.primary,
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={colors.primaryForeground} />
        </Pressable>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: colors.primaryForeground,
            flex: 1,
          }}
        >
          Edit Agenda
        </Text>
      </View>

      {/* Tab strip */}
      <View
        style={{
          flexDirection: "row",
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          paddingHorizontal: 16,
        }}
      >
        {(
          [
            { id: "speakers" as ActiveTab, label: `Speakers (${speakers.length})`, icon: <Users size={14} color={activeTab === "speakers" ? colors.primary : colors.mutedForeground} /> },
            { id: "agenda" as ActiveTab, label: `Agenda (${days.length} days)`, icon: <Calendar size={14} color={activeTab === "agenda" ? colors.primary : colors.mutedForeground} /> },
          ] as const
        ).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingVertical: 12,
                marginRight: 24,
                borderBottomWidth: 2,
                borderBottomColor: isActive ? colors.primary : "transparent",
              }}
            >
              {tab.icon}
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: isActive ? "700" : "500",
                  color: isActive ? colors.primary : colors.mutedForeground,
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Speakers tab ─────────────────────────────────────────────────── */}
        {activeTab === "speakers" ? (
          <View style={{ gap: 12 }}>
            <Button
              onPress={() => {
                setEditingSpeaker(null);
                setSpeakerFormVisible(true);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                justifyContent: "center",
              }}
            >
              <Plus size={16} color={colors.primaryForeground} />
              <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>
                Add Speaker
              </Text>
            </Button>

            {speakers.length === 0 ? (
              <View
                style={{
                  padding: 24,
                  alignItems: "center",
                  backgroundColor: colors.muted,
                  borderRadius: 12,
                }}
              >
                <Mic2 size={32} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
                <Text
                  style={{ color: colors.mutedForeground, textAlign: "center", fontSize: 13 }}
                >
                  No speakers yet.{"\n"}Tap "Add Speaker" to add your first one.
                </Text>
              </View>
            ) : (
              speakers.map((sp) => (
                <View
                  key={sp.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: 12,
                    backgroundColor: colors.card,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  {sp.photo_url ? (
                    <Image
                      source={{ uri: sp.photo_url }}
                      style={{ width: 44, height: 44, borderRadius: 22 }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: colors.primary + "20",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: "700",
                          color: colors.primary,
                        }}
                      >
                        {sp.name[0]?.toUpperCase() ?? "S"}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: colors.foreground,
                      }}
                    >
                      {sp.name}
                    </Text>
                    {sp.title ? (
                      <Text
                        style={{ fontSize: 12, color: colors.mutedForeground }}
                        numberOfLines={1}
                      >
                        {sp.title}
                        {sp.company ? ` · ${sp.company}` : ""}
                      </Text>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => {
                      setEditingSpeaker(sp);
                      setSpeakerFormVisible(true);
                    }}
                    style={{ padding: 6 }}
                  >
                    <Edit3 size={16} color={colors.primary} />
                  </Pressable>
                  <Pressable
                    onPress={() => handleDeleteSpeaker(sp)}
                    style={{ padding: 6 }}
                  >
                    <Trash2 size={16} color={colors.destructive} />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        ) : null}

        {/* ── Agenda tab ───────────────────────────────────────────────────── */}
        {activeTab === "agenda" ? (
          <View style={{ gap: 12 }}>
            <Button
              onPress={handleAddDay}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                justifyContent: "center",
              }}
            >
              <Plus size={16} color={colors.primaryForeground} />
              <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>
                Add Day
              </Text>
            </Button>

            {days.length === 0 ? (
              <View
                style={{
                  padding: 24,
                  alignItems: "center",
                  backgroundColor: colors.muted,
                  borderRadius: 12,
                }}
              >
                <Calendar size={32} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
                <Text
                  style={{ color: colors.mutedForeground, textAlign: "center", fontSize: 13 }}
                >
                  No days yet.{"\n"}Tap "Add Day" to start building your agenda.
                </Text>
              </View>
            ) : (
              days.map((day) => {
                const expanded = expandedDayId === day.id;
                return (
                  <View
                    key={day.id}
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
                      overflow: "hidden",
                    }}
                  >
                    {/* Day header */}
                    <Pressable
                      onPress={() =>
                        setExpandedDayId(expanded ? null : day.id)
                      }
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        padding: 14,
                        gap: 10,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "700",
                            color: colors.foreground,
                          }}
                        >
                          Day {day.day_number}
                          {day.title ? ` — ${day.title}` : ""}
                        </Text>
                        <Text
                          style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}
                        >
                          {formatDayDate(day.date)} · {day.sessions.length} session{day.sessions.length !== 1 ? "s" : ""}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => handleDeleteDay(day)}
                        style={{ padding: 6 }}
                      >
                        <Trash2 size={15} color={colors.destructive} />
                      </Pressable>
                      {expanded ? (
                        <ChevronUp size={18} color={colors.mutedForeground} />
                      ) : (
                        <ChevronDown size={18} color={colors.mutedForeground} />
                      )}
                    </Pressable>

                    {/* Sessions (expanded) */}
                    {expanded ? (
                      <View
                        style={{
                          borderTopWidth: 1,
                          borderTopColor: colors.border,
                          padding: 14,
                          gap: 10,
                        }}
                      >
                        {day.sessions.map((session) => (
                          <View
                            key={session.id}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 10,
                              padding: 10,
                              backgroundColor: colors.background,
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: colors.border,
                            }}
                          >
                            <Clock size={13} color={colors.primary} />
                            <View style={{ flex: 1 }}>
                              <Text
                                style={{
                                  fontSize: 13,
                                  fontWeight: "600",
                                  color: colors.foreground,
                                }}
                              >
                                {session.title}
                              </Text>
                              <Text
                                style={{
                                  fontSize: 11,
                                  color: colors.mutedForeground,
                                }}
                              >
                                {formatTime(session.start_time)} – {formatTime(session.end_time)}
                                {session.speakers.length > 0
                                  ? ` · ${session.speakers.length} speaker${session.speakers.length > 1 ? "s" : ""}`
                                  : ""}
                              </Text>
                            </View>
                            <Pressable
                              onPress={() => handleDeleteSession(session)}
                              style={{ padding: 4 }}
                            >
                              <Trash2 size={14} color={colors.destructive} />
                            </Pressable>
                          </View>
                        ))}

                        <Pressable
                          onPress={() => openAddSession(day)}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            padding: 10,
                            borderRadius: 10,
                            borderWidth: 1.5,
                            borderColor: colors.primary,
                            borderStyle: "dashed",
                          }}
                        >
                          <Plus size={14} color={colors.primary} />
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: "600",
                              color: colors.primary,
                            }}
                          >
                            Add Session
                          </Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
        ) : null}
      </ScrollView>

      {/* Speaker form modal */}
      <SpeakerFormModal
        visible={speakerFormVisible}
        initial={
          editingSpeaker
            ? {
                name: editingSpeaker.name,
                title: editingSpeaker.title ?? "",
                company: editingSpeaker.company ?? "",
                bio: editingSpeaker.bio ?? "",
                linkedin_url: editingSpeaker.linkedin_url ?? "",
                twitter_url: editingSpeaker.twitter_url ?? "",
                photo_url: editingSpeaker.photo_url ?? "",
              }
            : undefined
        }
        onSave={editingSpeaker ? handleEditSpeaker : handleAddSpeaker}
        onClose={() => {
          setSpeakerFormVisible(false);
          setEditingSpeaker(null);
        }}
      />

      {/* Session form modal */}
      <SessionFormModal
        visible={sessionFormVisible}
        dayDate={sessionFormDayDate}
        speakers={speakers}
        onSave={handleAddSession}
        onClose={() => setSessionFormVisible(false)}
      />
    </View>
  );
}
