import * as Calendar from "expo-calendar";
import { Alert, Platform } from "react-native";

export interface CalendarEventInput {
  title: string;
  date: string;       // e.g. "2026-06-15"
  time?: string | null; // e.g. "18:00"
  end_date?: string | null;
  location?: string | null;
  description?: string | null;
}

/**
 * Parses a date string ("YYYY-MM-DD") and an optional time string ("HH:MM")
 * into a Date object.
 */
function parseDateTime(date: string, time?: string | null): Date {
  const [year, month, day] = date.split("-").map(Number);
  if (time) {
    const [hour, minute] = time.split(":").map(Number);
    return new Date(year, month - 1, day, hour, minute ?? 0);
  }
  return new Date(year, month - 1, day, 9, 0); // default 9 AM
}

/**
 * Gets or creates a dedicated "Instantlly" calendar on the device.
 */
async function getOrCreateCalendarId(): Promise<string> {
  const calendars = await Calendar.getCalendarsAsync(
    Calendar.EntityTypes.EVENT,
  );

  const existing = calendars.find((c) => c.title === "Instantlly");
  if (existing) return existing.id;

  // Find the default source (varies by platform)
  let sourceId: string | undefined;
  if (Platform.OS === "ios") {
    const defaultCal = calendars.find(
      (c) => c.source?.name === "Default" || c.allowsModifications,
    );
    sourceId = defaultCal?.source?.id;
  } else {
    // Android — use the first local source available
    const sources = await Calendar.getSourcesAsync();
    const local = sources.find((s) => s.type === Calendar.SourceType.LOCAL);
    sourceId = local?.id;
  }

  const newCalId = await Calendar.createCalendarAsync({
    title: "Instantlly",
    color: "#7C3AED",
    entityType: Calendar.EntityTypes.EVENT,
    sourceId,
    source: sourceId
      ? undefined
      : { isLocalAccount: true, name: "Instantlly", type: Calendar.SourceType.LOCAL },
    name: "instantlly",
    ownerAccount: "personal",
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });

  return newCalId;
}

/**
 * Requests calendar permissions and adds the event to the device calendar.
 * Returns true on success, false on denial / error.
 * Non-blocking — should be called after successful registration.
 */
export async function addEventToCalendar(
  event: CalendarEventInput,
): Promise<boolean> {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== "granted") return false;

    const calendarId = await getOrCreateCalendarId();

    const startDate = parseDateTime(event.date, event.time);
    // Default end = start + 2 hours if no end_date provided
    const endDate = event.end_date
      ? parseDateTime(event.end_date, event.time)
      : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

    await Calendar.createEventAsync(calendarId, {
      title: event.title,
      startDate,
      endDate,
      location: event.location ?? undefined,
      notes: event.description ?? undefined,
      alarms: [{ relativeOffset: -60 }, { relativeOffset: -15 }],
    });

    return true;
  } catch (err) {
    console.warn("[calendar] addEventToCalendar failed:", err);
    return false;
  }
}

/**
 * Automatically adds the event to the device calendar and shows a
 * confirmation alert. No pre-prompt — runs immediately after purchase.
 */
export function promptAddToCalendar(event: CalendarEventInput): void {
  void addEventToCalendar(event).then((added) => {
    if (added) {
      Alert.alert(
        "Added to Calendar 🗓️",
        "The event has been added to your calendar with reminders.",
        [{ text: "OK" }],
      );
    }
  });
}
