/**
 * EventAgendaSection
 *
 * Rendered inside EventDetail below the main info card when the event has
 * an agenda (days + sessions + speakers).  Fully read-only — organizer
 * editing lives in EventAgendaEdit (separate screen).
 *
 * Layout:
 *   ┌─ Tab strip ─────────────────────────────────────────┐
 *   │  [Overview]  [ Agenda ]  [ Speakers ]               │
 *   └─────────────────────────────────────────────────────┘
 *   Active tab content:
 *     Agenda  — day pills → timeline of sessions → speaker avatars
 *     Speakers — 2-col grid → speaker sheet on tap
 */
import React, { useState, useCallback } from "react";
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Mic2, Users, Clock, MapPin, ExternalLink } from "lucide-react-native";
import { useGetEventAgendaQuery } from "../../store/api/eventsApi";
import type { AgendaDay, AgendaSession, AgendaSpeaker } from "../../store/api/eventsApi";
import { useColors } from "../../theme/colors";
import { Badge } from "./badge";
import { Card, CardContent } from "./card";

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

const SESSION_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  keynote:     { bg: "#eff6ff", text: "#2563eb" },
  panel:       { bg: "#f0fdf4", text: "#16a34a" },
  workshop:    { bg: "#faf5ff", text: "#7c3aed" },
  break:       { bg: "#fff7ed", text: "#c2410c" },
  networking:  { bg: "#fef9c3", text: "#a16207" },
  session:     { bg: "#f1f5f9", text: "#475569" },
};

function sessionTypeStyle(type: string) {
  return SESSION_TYPE_COLORS[type] ?? SESSION_TYPE_COLORS["session"];
}

// ─── Speaker sheet ────────────────────────────────────────────────────────────

interface SpeakerSheetProps {
  speaker: AgendaSpeaker | null;
  sessions: AgendaSession[];
  visible: boolean;
  onClose: () => void;
}

function SpeakerSheet({ speaker, sessions, visible, onClose }: SpeakerSheetProps) {
  const colors = useColors();
  if (!speaker) return null;

  const speakerSessions = sessions.filter((s) =>
    s.speakers.some((sp) => sp.id === speaker.id)
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
        onPress={onClose}
      >
        <View style={{ flex: 1 }} />
        <Pressable
          style={{ backgroundColor: colors.card }}
          onPress={(e) => e.stopPropagation()}
        >
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 20,
              paddingBottom: 32,
              maxHeight: 600,
            }}
          >
            {/* Drag handle */}
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.border,
                alignSelf: "center",
                marginBottom: 20,
              }}
            />

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Speaker header */}
              <View style={{ flexDirection: "row", gap: 14, marginBottom: 16 }}>
                {speaker.photo_url ? (
                  <Image
                    source={{ uri: speaker.photo_url }}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 36,
                      backgroundColor: colors.muted,
                    }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 36,
                      backgroundColor: colors.primary + "20",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 28,
                        fontWeight: "700",
                        color: colors.primary,
                      }}
                    >
                      {speaker.name[0]?.toUpperCase() ?? "S"}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1, justifyContent: "center" }}>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "700",
                      color: colors.foreground,
                    }}
                  >
                    {speaker.name}
                  </Text>
                  {speaker.title ? (
                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.mutedForeground,
                        marginTop: 2,
                      }}
                    >
                      {speaker.title}
                      {speaker.company ? ` · ${speaker.company}` : ""}
                    </Text>
                  ) : null}
                </View>
              </View>

              {/* Bio */}
              {speaker.bio ? (
                <Text
                  style={{
                    fontSize: 14,
                    lineHeight: 22,
                    color: colors.foreground,
                    marginBottom: 16,
                  }}
                >
                  {speaker.bio}
                </Text>
              ) : null}

              {/* Links */}
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
                {speaker.linkedin_url ? (
                  <Pressable
                    onPress={() => Linking.openURL(speaker.linkedin_url!)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: "#0a66c2",
                    }}
                  >
                    <Text style={{ fontSize: 12, color: "#0a66c2", fontWeight: "600" }}>
                      LinkedIn
                    </Text>
                    <ExternalLink size={11} color="#0a66c2" />
                  </Pressable>
                ) : null}
                {speaker.twitter_url ? (
                  <Pressable
                    onPress={() => Linking.openURL(speaker.twitter_url!)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: "#1da1f2",
                    }}
                  >
                    <Text style={{ fontSize: 12, color: "#1da1f2", fontWeight: "600" }}>
                      Twitter
                    </Text>
                    <ExternalLink size={11} color="#1da1f2" />
                  </Pressable>
                ) : null}
              </View>

              {/* Sessions this speaker appears in */}
              {speakerSessions.length > 0 ? (
                <View>
                  <Text
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: 0.8,
                      color: colors.mutedForeground,
                      marginBottom: 8,
                      fontWeight: "600",
                    }}
                  >
                    Speaking in
                  </Text>
                  {speakerSessions.map((s) => (
                    <View
                      key={s.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        paddingVertical: 8,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                      }}
                    >
                      <Clock size={13} color={colors.primary} />
                      <Text
                        style={{ fontSize: 13, color: colors.foreground, flex: 1 }}
                      >
                        {s.title}
                      </Text>
                      <Text
                        style={{ fontSize: 12, color: colors.mutedForeground }}
                      >
                        {formatTime(s.start_time)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Session card ─────────────────────────────────────────────────────────────

interface SessionCardProps {
  session: AgendaSession;
  onSpeakerPress: (speaker: AgendaSpeaker) => void;
}

function SessionCard({ session, onSpeakerPress }: SessionCardProps) {
  const colors = useColors();
  const typeStyle = sessionTypeStyle(session.session_type);

  return (
    <View
      style={{
        flexDirection: "row",
        gap: 12,
        marginBottom: 12,
      }}
    >
      {/* Time rail */}
      <View style={{ width: 56, alignItems: "center" }}>
        <Text
          style={{ fontSize: 11, fontWeight: "700", color: colors.primary }}
        >
          {formatTime(session.start_time)}
        </Text>
        <View
          style={{
            flex: 1,
            width: 1,
            backgroundColor: colors.border,
            marginTop: 6,
          }}
        />
      </View>

      {/* Session content */}
      <View
        style={{
          flex: 1,
          backgroundColor: colors.card,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 12,
          marginBottom: 4,
        }}
      >
        {/* Type chip */}
        <View
          style={{
            alignSelf: "flex-start",
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 20,
            backgroundColor: typeStyle.bg,
            marginBottom: 6,
          }}
        >
          <Text
            style={{ fontSize: 10, fontWeight: "700", color: typeStyle.text, textTransform: "capitalize" }}
          >
            {session.session_type}
          </Text>
        </View>

        <Text
          style={{
            fontSize: 14,
            fontWeight: "700",
            color: colors.foreground,
            marginBottom: 4,
          }}
        >
          {session.title}
        </Text>

        {session.description ? (
          <Text
            style={{
              fontSize: 12,
              color: colors.mutedForeground,
              lineHeight: 18,
              marginBottom: 6,
            }}
            numberOfLines={2}
          >
            {session.description}
          </Text>
        ) : null}

        {/* End time + location */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Clock size={11} color={colors.mutedForeground} />
            <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
              ends {formatTime(session.end_time)}
            </Text>
          </View>
          {session.location ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <MapPin size={11} color={colors.mutedForeground} />
              <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
                {session.location}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Speaker avatars */}
        {session.speakers.length > 0 ? (
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            {session.speakers.map((sp) => (
              <Pressable
                key={sp.id}
                onPress={() => onSpeakerPress(sp)}
                style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
              >
                {sp.photo_url ? (
                  <Image
                    source={{ uri: sp.photo_url }}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: colors.muted,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: colors.primary + "20",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{ fontSize: 10, fontWeight: "700", color: colors.primary }}
                    >
                      {sp.name[0]?.toUpperCase() ?? "S"}
                    </Text>
                  </View>
                )}
                <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
                  {sp.name}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ─── Agenda tab ───────────────────────────────────────────────────────────────

interface AgendaTabProps {
  days: AgendaDay[];
  allSessions: AgendaSession[];
  onSpeakerPress: (speaker: AgendaSpeaker) => void;
}

function AgendaTab({ days, allSessions, onSpeakerPress }: AgendaTabProps) {
  const colors = useColors();
  const [activeDayId, setActiveDayId] = useState<number>(days[0]?.id ?? -1);
  const activeDay = days.find((d) => d.id === activeDayId) ?? days[0];

  if (!activeDay) {
    return (
      <View style={{ padding: 16, alignItems: "center" }}>
        <Text style={{ color: colors.mutedForeground }}>No agenda yet.</Text>
      </View>
    );
  }

  return (
    <View>
      {/* Day pills */}
      {days.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 16 }}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {days.map((day) => {
            const active = day.id === activeDayId;
            return (
              <Pressable
                key={day.id}
                onPress={() => setActiveDayId(day.id)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 20,
                  backgroundColor: active ? colors.primary : colors.muted,
                  marginRight: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: active ? colors.primaryForeground : colors.mutedForeground,
                  }}
                >
                  Day {day.day_number}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    color: active ? colors.primaryForeground + "cc" : colors.mutedForeground + "99",
                  }}
                >
                  {formatDayDate(day.date)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
          <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
            {formatDayDate(activeDay.date)}
            {activeDay.title ? ` · ${activeDay.title}` : ""}
          </Text>
        </View>
      )}

      {/* Sessions */}
      <View style={{ paddingHorizontal: 16 }}>
        {activeDay.sessions.length === 0 ? (
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
            No sessions scheduled for this day.
          </Text>
        ) : (
          activeDay.sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onSpeakerPress={onSpeakerPress}
            />
          ))
        )}
      </View>
    </View>
  );
}

// ─── Speakers tab ─────────────────────────────────────────────────────────────

interface SpeakersTabProps {
  speakers: AgendaSpeaker[];
  onSpeakerPress: (speaker: AgendaSpeaker) => void;
}

function SpeakersTab({ speakers, onSpeakerPress }: SpeakersTabProps) {
  const colors = useColors();

  if (speakers.length === 0) {
    return (
      <View style={{ padding: 16, alignItems: "center" }}>
        <Text style={{ color: colors.mutedForeground }}>No speakers added yet.</Text>
      </View>
    );
  }

  // 2-column grid
  const rows: AgendaSpeaker[][] = [];
  for (let i = 0; i < speakers.length; i += 2) {
    rows.push(speakers.slice(i, i + 2));
  }

  return (
    <View style={{ paddingHorizontal: 16 }}>
      {rows.map((row, ri) => (
        <View
          key={ri}
          style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}
        >
          {row.map((sp) => (
            <Pressable
              key={sp.id}
              onPress={() => onSpeakerPress(sp)}
              style={{
                flex: 1,
                backgroundColor: colors.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 14,
                alignItems: "center",
              }}
            >
              {sp.photo_url ? (
                <Image
                  source={{ uri: sp.photo_url }}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: colors.muted,
                    marginBottom: 8,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: colors.primary + "20",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 22,
                      fontWeight: "700",
                      color: colors.primary,
                    }}
                  >
                    {sp.name[0]?.toUpperCase() ?? "S"}
                  </Text>
                </View>
              )}
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: colors.foreground,
                  textAlign: "center",
                }}
                numberOfLines={1}
              >
                {sp.name}
              </Text>
              {sp.title ? (
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.mutedForeground,
                    textAlign: "center",
                    marginTop: 2,
                  }}
                  numberOfLines={2}
                >
                  {sp.title}
                  {sp.company ? `\n${sp.company}` : ""}
                </Text>
              ) : null}
            </Pressable>
          ))}
          {/* pad odd row */}
          {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

type ActiveTab = "agenda" | "speakers";

interface EventAgendaSectionProps {
  eventId: number;
}

export function EventAgendaSection({ eventId }: EventAgendaSectionProps) {
  const colors = useColors();
  const { data: agenda, isLoading } = useGetEventAgendaQuery(eventId, {
    skip: !eventId || eventId <= 0,
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>("agenda");
  const [selectedSpeaker, setSelectedSpeaker] = useState<AgendaSpeaker | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const openSpeaker = useCallback((sp: AgendaSpeaker) => {
    setSelectedSpeaker(sp);
    setSheetVisible(true);
  }, []);

  // Don't render anything if no agenda data
  if (isLoading) return null;
  if (!agenda || (agenda.days.length === 0 && agenda.speakers.length === 0)) {
    return null;
  }

  const allSessions: AgendaSession[] = agenda.days.flatMap((d) => d.sessions);
  const hasDays = agenda.days.length > 0;
  const hasSpeakers = agenda.speakers.length > 0;

  const tabs: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
    ...(hasDays
      ? [{ id: "agenda" as ActiveTab, label: "Agenda", icon: <Clock size={14} color={activeTab === "agenda" ? colors.primary : colors.mutedForeground} /> }]
      : []),
    ...(hasSpeakers
      ? [{ id: "speakers" as ActiveTab, label: `Speakers (${agenda.speakers.length})`, icon: <Users size={14} color={activeTab === "speakers" ? colors.primary : colors.mutedForeground} /> }]
      : []),
  ];

  // If only one tab, default to it
  const resolvedTab = tabs.find((t) => t.id === activeTab) ? activeTab : tabs[0]?.id ?? "agenda";

  return (
    <View style={{ marginTop: 16 }}>
      {/* Tab strip */}
      <View
        style={{
          flexDirection: "row",
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          marginHorizontal: 0,
          paddingHorizontal: 16,
          marginBottom: 16,
        }}
      >
        {tabs.map((tab) => {
          const isActive = resolvedTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingBottom: 10,
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

      {/* Tab content */}
      {resolvedTab === "agenda" && hasDays ? (
        <AgendaTab
          days={agenda.days}
          allSessions={allSessions}
          onSpeakerPress={openSpeaker}
        />
      ) : null}
      {resolvedTab === "speakers" && hasSpeakers ? (
        <SpeakersTab speakers={agenda.speakers} onSpeakerPress={openSpeaker} />
      ) : null}

      {/* Speaker sheet */}
      <SpeakerSheet
        speaker={selectedSpeaker}
        sessions={allSessions}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
      />
    </View>
  );
}
