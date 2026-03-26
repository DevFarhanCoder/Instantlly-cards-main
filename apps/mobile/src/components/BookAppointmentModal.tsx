import { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { format } from "date-fns";

const timeSlots = [
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
  "05:00 PM",
  "05:30 PM",
];

type BookingMode = "instant" | "scheduled";

export interface BookingPayload {
  business_id: string;
  business_name: string;
  mode: BookingMode;
  booking_date?: string;
  booking_time?: string;
  customer_name: string;
  customer_phone: string;
  notes?: string;
}

interface BookAppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessName: string;
  businessLogo?: string;
  businessId?: string;
  isSignedIn?: boolean;
  onRequireAuth?: () => void;
  onSubmit?: (payload: BookingPayload) => Promise<void>;
}

const COLORS = {
  background: "#0F172A",
  overlay: "rgba(15, 23, 42, 0.6)",
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#0F172A",
  muted: "#6B7280",
  primary: "#2563EB",
  primaryLight: "#EFF6FF",
};

const BookAppointmentModal = ({
  open,
  onOpenChange,
  businessName,
  businessLogo = "",
  businessId = "",
  isSignedIn = true,
  onRequireAuth,
  onSubmit,
}: BookAppointmentModalProps) => {
  const [mode, setMode] = useState<BookingMode>("instant");
  const [date, setDate] = useState<string | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setDate(undefined);
    setSelectedTime(undefined);
    setName("");
    setPhone("");
    setNotes("");
  };

  const handleSubmit = async () => {
    if (mode === "scheduled" && (!date || !selectedTime)) {
      Alert.alert("Select date and time", "Please pick both a date and a time.");
      return;
    }
    if (!name || !phone) {
      Alert.alert("Missing details", "Please enter your name and phone.");
      return;
    }

    if (!isSignedIn) {
      Alert.alert("Sign in required", "Please sign in to book.");
      if (onRequireAuth) onRequireAuth();
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: BookingPayload = {
        business_id: businessId,
        business_name: businessName,
        mode,
        booking_date: date,
        booking_time: selectedTime,
        customer_name: name,
        customer_phone: phone,
        notes: notes || undefined,
      };

      if (onSubmit) {
        await onSubmit(payload);
      }

      const successTitle =
        mode === "instant" ? "Instant Booking Confirmed" : "Appointment Booked";
      const successMessage =
        mode === "instant"
          ? `${businessName} - Estimated arrival: 30-45 minutes`
          : `${businessName} on ${
              date ? format(new Date(`${date}T00:00:00`), "PPP") : ""
            } at ${selectedTime}`;
      Alert.alert(successTitle, successMessage);

      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      Alert.alert("Booking failed", err?.message || "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={() => onOpenChange(false)}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <View style={styles.logo}>
                <Text style={styles.logoText}>{businessLogo || "B"}</Text>
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title}>Book Appointment</Text>
                <Text style={styles.subtitle}>{businessName}</Text>
              </View>
            </View>

            <View style={styles.modeToggle}>
              <Pressable
                onPress={() => setMode("instant")}
                style={[
                  styles.modeButton,
                  mode === "instant" && styles.modeButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    mode === "instant" && styles.modeButtonTextActive,
                  ]}
                >
                  Book Now
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setMode("scheduled")}
                style={[
                  styles.modeButton,
                  mode === "scheduled" && styles.modeButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    mode === "scheduled" && styles.modeButtonTextActive,
                  ]}
                >
                  Schedule Later
                </Text>
              </Pressable>
            </View>

            {mode === "instant" ? (
              <View style={styles.instantCard}>
                <Text style={styles.instantTitle}>Instant Service</Text>
                <Text style={styles.instantText}>
                  A professional will be assigned and arrive shortly.
                </Text>
                <Text style={styles.instantEta}>
                  Estimated arrival: 30-45 minutes
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.section}>
                  <Text style={styles.label}>Select Date *</Text>
                  <View style={styles.calendarCard}>
                    <Calendar
                      onDayPress={(day) => setDate(day.dateString)}
                      markedDates={
                        date
                          ? {
                              [date]: {
                                selected: true,
                                selectedColor: COLORS.primary,
                              },
                            }
                          : undefined
                      }
                      theme={{
                        calendarBackground: COLORS.card,
                        textSectionTitleColor: COLORS.muted,
                        dayTextColor: COLORS.text,
                        monthTextColor: COLORS.text,
                        arrowColor: COLORS.primary,
                        todayTextColor: COLORS.primary,
                      }}
                    />
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.label}>Select Time *</Text>
                  <View style={styles.timeGrid}>
                    {timeSlots.map((t) => {
                      const isActive = selectedTime === t;
                      return (
                        <Pressable
                          key={t}
                          onPress={() => setSelectedTime(t)}
                          style={[
                            styles.timeSlot,
                            isActive && styles.timeSlotActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.timeSlotText,
                              isActive && styles.timeSlotTextActive,
                            ]}
                          >
                            {t}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </>
            )}

            <View style={styles.row}>
              <View style={styles.flex}>
                <Text style={styles.label}>Your Name *</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Full name"
                  style={styles.input}
                />
              </View>
              <View style={styles.flex}>
                <Text style={styles.label}>Phone *</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+1 555..."
                  keyboardType="phone-pad"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Any special requests..."
                style={[styles.input, styles.textarea]}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={[styles.submit, isSubmitting && styles.submitDisabled]}
            >
              <Text style={styles.submitText}>
                {isSubmitting
                  ? "Booking..."
                  : mode === "instant"
                  ? "Confirm Instant Booking"
                  : "Confirm Appointment"}
              </Text>
            </Pressable>

            <Pressable onPress={() => onOpenChange(false)}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  content: {
    padding: 20,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    height: 40,
    width: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.muted,
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    padding: 4,
    gap: 6,
  },
  modeButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
  },
  modeButtonActive: {
    backgroundColor: COLORS.primary,
  },
  modeButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.muted,
  },
  modeButtonTextActive: {
    color: "#FFFFFF",
  },
  instantCard: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    padding: 14,
    borderRadius: 16,
    gap: 6,
  },
  instantTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  instantText: {
    fontSize: 12,
    color: COLORS.muted,
  },
  instantEta: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
  section: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
  },
  calendarCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    overflow: "hidden",
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeSlot: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timeSlotActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  timeSlotText: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: "600",
  },
  timeSlotTextActive: {
    color: "#FFFFFF",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  flex: {
    flex: 1,
    gap: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: COLORS.text,
  },
  textarea: {
    minHeight: 80,
  },
  submit: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  closeText: {
    textAlign: "center",
    fontSize: 12,
    color: COLORS.muted,
  },
});

export default BookAppointmentModal;
