import React, { useCallback, useState } from "react";
import { Modal, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  ArrowLeft,
  BarChart3,
  Ban,
  CalendarDays,
  CalendarRange,
  Copy,
  Edit3,
  Plus,
  QrCode,
  Ticket,
  Users,
} from "lucide-react-native";
import { format } from "date-fns";

import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { EmptyState } from "../components/ui/empty-state";
import { ErrorState } from "../components/ui/error-state";
import { PageLoader } from "../components/ui/page-loader";
import { Textarea } from "../components/ui/textarea";

import {
  useListMyEventsQuery,
  type AppEvent,
} from "../store/api/eventsApi";
import { useCancelEvent } from "../hooks/useEvents";
import { toast } from "../lib/toast";
import { useColors, useIconColor, useMutedIconColor } from "../theme/colors";

/**
 * MyEvents — organizer dashboard listing events created by the current user.
 * Each row exposes the four organizer actions: View details, Registrations,
 * Analytics, Edit. Only available to authenticated business/admin users
 * (backend enforces this at /events/my).
 */
const MyEvents = () => {
  const navigation = useNavigation<any>();
  const iconColor = useIconColor();
  const mutedIcon = useMutedIconColor();
  const colors = useColors();

  const {
    data: events,
    isLoading,
    isError,
    refetch,
  } = useListMyEventsQuery();

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const cancelMutation = useCancelEvent();
  const [cancelTarget, setCancelTarget] = useState<AppEvent | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const handleConfirmCancel = useCallback(async () => {
    if (!cancelTarget) return;
    try {
      const res = await cancelMutation.mutateAsync({
        event_id: cancelTarget.id,
        reason: cancelReason.trim() || undefined,
      });
      const refundCount = res?.refunds?.length ?? 0;
      toast.success(
        refundCount > 0
          ? `Event cancelled — ${refundCount} refund${refundCount > 1 ? "s" : ""} in progress`
          : "Event cancelled"
      );
      setCancelTarget(null);
      setCancelReason("");
      await refetch();
    } catch (err: any) {
      const msg = err?.data?.error || err?.message || "Failed to cancel event";
      toast.error(msg);
    }
  }, [cancelTarget, cancelReason, cancelMutation, refetch]);

  return (
    <View className="flex-1 bg-background">
      <View className="bg-primary px-4 py-4 flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <ArrowLeft size={20} color={colors.primaryForeground} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-lg font-bold text-primary-foreground">
            My Events
          </Text>
          <Text className="text-xs text-primary-foreground/70">
            Manage your created events
          </Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate("EventCreate")}
          accessibilityLabel="Create new event"
          className="flex-row items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-foreground/10"
        >
          <Plus size={14} color={colors.primaryForeground} />
          <Text className="text-xs font-semibold text-primary-foreground">
            New
          </Text>
        </Pressable>
      </View>

      <ScrollView
        className="px-4"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 24, gap: 12 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {isLoading ? (
          <PageLoader fullScreen={false} />
        ) : isError ? (
          <ErrorState
            compact
            title="Couldn't load your events"
            onRetry={() => refetch()}
          />
        ) : !events || events.length === 0 ? (
          <EmptyState
            compact
            icon={<CalendarDays size={42} color={mutedIcon} />}
            title="No events yet"
            message="Create your first event to start selling tickets."
            actionLabel="Create Event"
            onAction={() => navigation.navigate("EventCreate")}
          />
        ) : (
          events.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              iconColor={iconColor}
              mutedIcon={mutedIcon}
              onView={() =>
                navigation.navigate("EventDetail", { id: String(event.id) })
              }
              onScan={() =>
                navigation.navigate("EventScanner" as never)
              }
              onRegistrations={() =>
                navigation.navigate("EventRegistrations", { id: event.id })
              }
              onAnalytics={() =>
                navigation.navigate("EventAnalytics", { id: event.id })
              }
              onEdit={() =>
                navigation.navigate("EventEdit", { id: event.id })
              }
              onAgendaEdit={() =>
                navigation.navigate("EventAgendaEdit", { id: event.id })
              }
              onTeam={() =>
                navigation.navigate("EventStaffManage" as never, { id: event.id } as never)
              }
              onDuplicate={() =>
                navigation.navigate("EventCreate", { cloneFrom: event })
              }
              onCancel={() => setCancelTarget(event)}
            />
          ))
        )}
      </ScrollView>

      <Modal
        visible={!!cancelTarget}
        transparent
        animationType="slide"
        onRequestClose={() => setCancelTarget(null)}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setCancelTarget(null)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-card border-t border-border rounded-t-2xl p-5 gap-4"
          >
            <Text className="text-base font-bold text-foreground">
              Cancel "{cancelTarget?.title}"?
            </Text>
            <Text className="text-xs text-muted-foreground">
              All paid registrations will be refunded automatically. Attendees
              will be notified. This cannot be undone.
            </Text>
            <View className="gap-2">
              <Text className="text-xs text-muted-foreground">
                Reason (optional, sent to attendees)
              </Text>
              <Textarea
                value={cancelReason}
                onChangeText={setCancelReason}
                placeholder="e.g. venue unavailable"
                rows={3}
                testID="cancel-reason"
              />
            </View>
            <View className="flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onPress={() => setCancelTarget(null)}
                disabled={cancelMutation.isPending}
              >
                Keep Event
              </Button>
              <Button
                className="flex-1 rounded-xl bg-destructive"
                onPress={handleConfirmCancel}
                disabled={cancelMutation.isPending}
                testID="confirm-cancel-event"
              >
                {cancelMutation.isPending ? "Cancelling…" : "Cancel Event"}
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

interface EventRowProps {
  event: AppEvent;
  iconColor: string;
  mutedIcon: string;
  onView: () => void;
  onScan: () => void;
  onRegistrations: () => void;
  onAnalytics: () => void;
  onEdit: () => void;
  onAgendaEdit: () => void;
  onTeam: () => void;
  onDuplicate: () => void;
  onCancel: () => void;
}

function EventRow({
  event,
  mutedIcon,
  onView,
  onScan,
  onRegistrations,
  onAnalytics,
  onEdit,
  onAgendaEdit,
  onTeam,
  onDuplicate,
  onCancel,
}: EventRowProps) {
  const cancelled = (event as any).status === "cancelled" || (event as any).cancelled_at;
  const isOwner = (event as any).viewer_role === "owner" || !(event as any).viewer_role;
  const regCount = event._count?.registrations ?? event.attendee_count ?? 0;

  return (
    <Card className={`overflow-hidden ${cancelled ? "opacity-60" : ""}`}>
      <CardContent className="p-4 gap-3">
        <Pressable onPress={onView} accessibilityLabel="View event">
          <View className="flex-row items-start justify-between gap-2">
            <Text
              className="text-base font-bold text-foreground flex-1"
              numberOfLines={1}
            >
              {event.title}
            </Text>
            <View className="flex-row gap-1 items-center">
              {(event as any).recurrence_rule && (
                <Badge className="bg-blue-500/10 text-blue-500 border-none text-[10px]">
                  🔄 Recurring
                </Badge>
              )}
              {!isOwner && (event as any).viewer_role === "co_organizer" && (
                <Badge className="bg-purple-500/10 text-purple-600 border-none text-[10px]">
                  Co-organizer
                </Badge>
              )}
              {!isOwner && (event as any).viewer_role === "scanner" && (
                <Badge className="bg-green-500/10 text-green-600 border-none text-[10px]">
                  Scanner
                </Badge>
              )}
              {cancelled ? (
                <Badge className="bg-destructive/10 text-destructive border-none text-[10px]">
                  Cancelled
                </Badge>
              ) : (
                <Badge className="bg-success/10 text-success border-none text-[10px]">
                  Live
                </Badge>
              )}
            </View>
          </View>
          <View className="flex-row items-center gap-3 mt-1">
            {event.date ? (
              <View className="flex-row items-center gap-1">
                <CalendarDays size={12} color={mutedIcon} />
                <Text className="text-xs text-muted-foreground">
                  {format(new Date(event.date), "MMM d")}
                </Text>
              </View>
            ) : null}
            <View className="flex-row items-center gap-1">
              <Users size={12} color={mutedIcon} />
              <Text className="text-xs text-muted-foreground">
                {regCount} registered
              </Text>
            </View>
            {event.max_attendees ? (
              <View className="flex-row items-center gap-1">
                <Ticket size={12} color={mutedIcon} />
                <Text className="text-xs text-muted-foreground">
                  cap {event.max_attendees}
                </Text>
              </View>
            ) : null}
            {(event as any)._count?.occurrences > 0 && (
              <Text className="text-xs text-blue-500">
                {(event as any)._count.occurrences} occurrences
              </Text>
            )}
          </View>
        </Pressable>

        <View className="flex-row gap-2 flex-wrap">
          {(event as any).viewer_role === "scanner" ? (
            // Scanners only get the check-in scan button
            <Button
              size="sm"
              variant="default"
              className="flex-1"
              onPress={onScan}
            >
              <View className="flex-row items-center gap-1">
                <QrCode size={12} color="#ffffff" />
                <Text className="text-xs font-semibold text-primary-foreground">
                  Scan Check-in
                </Text>
              </View>
            </Button>
          ) : (
            <>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 min-w-[44%]"
            onPress={onRegistrations}
          >
            <View className="flex-row items-center gap-1">
              <Users size={12} color={mutedIcon} />
              <Text className="text-xs font-medium text-foreground">
                Registrations
              </Text>
            </View>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 min-w-[44%]"
            onPress={onAnalytics}
          >
            <View className="flex-row items-center gap-1">
              <BarChart3 size={12} color={mutedIcon} />
              <Text className="text-xs font-medium text-foreground">
                Analytics
              </Text>
            </View>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 min-w-[44%]"
            onPress={onEdit}
          >
            <View className="flex-row items-center gap-1">
              <Edit3 size={12} color={mutedIcon} />
              <Text className="text-xs font-medium text-foreground">Edit</Text>
            </View>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 min-w-[44%]"
            onPress={onAgendaEdit}
          >
            <View className="flex-row items-center gap-1">
              <CalendarRange size={12} color={mutedIcon} />
              <Text className="text-xs font-medium text-foreground">Agenda</Text>
            </View>
          </Button>
          {isOwner && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 min-w-[44%]"
              onPress={onTeam}
            >
              <View className="flex-row items-center gap-1">
                <Users size={12} color={mutedIcon} />
                <Text className="text-xs font-medium text-foreground">Team</Text>
              </View>
            </Button>
          )}
          {isOwner && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 min-w-[44%]"
            onPress={onDuplicate}
          >
            <View className="flex-row items-center gap-1">
              <Copy size={12} color={mutedIcon} />
              <Text className="text-xs font-medium text-foreground">Duplicate</Text>
            </View>
          </Button>
          )}
          <Button
            size="sm"
            variant="default"
            className="flex-1 min-w-[44%]"
            onPress={onView}
          >
            <View className="flex-row items-center gap-1">
              <QrCode size={12} color="#ffffff" />
              <Text className="text-xs font-semibold text-primary-foreground">
                View
              </Text>
            </View>
          </Button>
          {!cancelled && isOwner ? (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 min-w-[44%] border-destructive/40"
              onPress={onCancel}
              testID={`cancel-event-${event.id}`}
            >
              <View className="flex-row items-center gap-1">
                <Ban size={12} color="#ef4343" />
                <Text className="text-xs font-semibold text-destructive">
                  Cancel
                </Text>
              </View>
            </Button>
          ) : null}
            </>
          )}
        </View>
      </CardContent>
    </Card>
  );
}

export default MyEvents;
