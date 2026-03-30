import { Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ArrowLeft, CheckCircle, Mail, Phone, Ticket, User, Users } from "lucide-react-native";
import { format } from "date-fns";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { useGetEventQuery, useGetEventRegistrationsQuery } from "../store/api/eventsApi";

const EventRegistrations = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id = route?.params?.id;
  const numericId = typeof id === "string" ? parseInt(id, 10) : id;
  const { data: event } = useGetEventQuery(numericId, { skip: !numericId });
  const { data: registrations = [], isLoading } = useGetEventRegistrationsQuery(numericId, { skip: !numericId });

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card px-4 py-4 flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#111827" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-lg font-bold text-foreground">Registrations</Text>
          {event && (
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>{event.title}</Text>
          )}
        </View>
      </View>

      <View className="px-4 py-3 flex-row gap-3">
        <View className="flex-1 rounded-xl border border-border bg-card p-3 items-center">
          <Users size={18} color="#2563eb" />
          <Text className="text-lg font-bold text-foreground mt-1">{registrations.length}</Text>
          <Text className="text-[10px] text-muted-foreground">Total Registered</Text>
        </View>
        <View className="flex-1 rounded-xl border border-border bg-card p-3 items-center">
          <Ticket size={18} color="#2563eb" />
          <Text className="text-lg font-bold text-foreground mt-1">
            {registrations.reduce((sum: number, r: any) => sum + (r.ticket_count || 1), 0)}
          </Text>
          <Text className="text-[10px] text-muted-foreground">Total Tickets</Text>
        </View>
        {event?.max_attendees && (
          <View className="flex-1 rounded-xl border border-border bg-card p-3 items-center">
            <Text className="text-lg font-bold text-foreground">{event.max_attendees}</Text>
            <Text className="text-[10px] text-muted-foreground">Max Capacity</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} className="px-4 gap-3">
        {isLoading ? (
          <View className="items-center py-10">
            <Text className="text-sm text-muted-foreground">Loading registrations...</Text>
          </View>
        ) : registrations.length === 0 ? (
          <View className="items-center py-10 gap-3">
            <Users size={48} color="#c0c4cc" />
            <Text className="text-sm text-muted-foreground">No registrations yet</Text>
          </View>
        ) : (
          registrations.map((reg: any) => (
            <Card key={reg.id} className="overflow-hidden">
              <CardContent className="p-4 gap-2">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View className="h-9 w-9 rounded-full bg-primary/10 items-center justify-center">
                      <User size={16} color="#2563eb" />
                    </View>
                    <View>
                      <Text className="text-sm font-semibold text-foreground">
                        {reg.user?.name || `User #${reg.user_id}`}
                      </Text>
                      {reg.user?.phone && (
                        <Text className="text-[11px] text-muted-foreground">{reg.user.phone}</Text>
                      )}
                    </View>
                  </View>
                  <Badge className="bg-primary/10 text-primary border-none text-[10px]">
                    {reg.ticket_count || 1} ticket{(reg.ticket_count || 1) > 1 ? "s" : ""}
                  </Badge>
                </View>

                <View className="flex-row items-center justify-between mt-1">
                  <Text className="text-[11px] text-muted-foreground">
                    Registered {format(new Date(reg.registered_at), "MMM d, yyyy 'at' p")}
                  </Text>
                </View>
              </CardContent>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
};

export default EventRegistrations;
