import { ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import QRCode from "react-native-qrcode-svg";
import { CalendarDays, Clock, LogOut, MapPin, Ticket, CheckCircle2 } from "lucide-react-native";
import { format } from "date-fns";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../integrations/supabase/client";

const MyPasses = () => {
  const navigation = useNavigation<any>();
  const { user, signOut, loading: authLoading } = useAuth();

  const { data: passes, isLoading } = useQuery({
    queryKey: ["my-passes", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const { data, error } = await supabase
        .from("event_registrations")
        .select("*, events(*)")
        .eq("email", user.email)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user?.email,
  });

  if (authLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-sm text-muted-foreground">Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 mb-4">
          <Ticket size={36} color="#2563eb" />
        </View>
        <Text className="text-xl font-bold text-foreground">Your Event Passes</Text>
        <Text className="text-sm text-muted-foreground mt-2 text-center">
          Sign in to view your registered events and QR passes
        </Text>
        <Button onPress={() => navigation.navigate("Auth")} className="mt-5 px-8 rounded-xl">
          Sign In
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="bg-primary px-4 py-4 flex-row items-center justify-between">
        <View>
          <Text className="text-lg font-bold text-primary-foreground">My Passes</Text>
          <Text className="text-xs text-primary-foreground/70">{user.email}</Text>
        </View>
        <Button
          variant="ghost"
          size="sm"
          onPress={signOut}
          className="text-primary-foreground"
        >
          <LogOut size={14} color="#ffffff" /> Sign Out
        </Button>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 260 }} className="px-4 py-6 space-y-4">
        {isLoading ? (
          <View className="items-center py-10">
            <Text className="text-sm text-muted-foreground">Loading...</Text>
          </View>
        ) : !passes?.length ? (
          <View className="items-center py-10 space-y-3">
            <Ticket size={48} color="#c0c4cc" />
            <Text className="text-muted-foreground">No event passes yet</Text>
            <Button variant="outline" onPress={() => navigation.navigate("Events")}>
              Browse Events
            </Button>
          </View>
        ) : (
          passes.map((pass, i) => (
            <Card key={pass.id} className="overflow-hidden">
              <CardContent className="p-0">
                <View className="p-4 space-y-2">
                  <View className="flex-row items-start justify-between">
                    <Text className="font-bold text-foreground">{pass.events?.title}</Text>
                    {pass.is_verified ? (
                      <Badge className="bg-success/10 text-success border-success/30 flex-row items-center gap-1">
                        <CheckCircle2 size={12} color="#16a34a" /> Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </View>
                  <View className="flex-row flex-wrap gap-3">
                    {pass.events?.date && (
                      <View className="flex-row items-center gap-1">
                        <CalendarDays size={12} color="#6a7181" />
                        <Text className="text-xs text-muted-foreground">
                          {format(new Date(pass.events.date), "MMM d, yyyy")}
                        </Text>
                      </View>
                    )}
                    {pass.events?.time && (
                      <View className="flex-row items-center gap-1">
                        <Clock size={12} color="#6a7181" />
                        <Text className="text-xs text-muted-foreground">{pass.events.time}</Text>
                      </View>
                    )}
                    {pass.events?.venue && (
                      <View className="flex-row items-center gap-1">
                        <MapPin size={12} color="#6a7181" />
                        <Text className="text-xs text-muted-foreground">{pass.events.venue}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View className="border-t border-dashed border-border bg-muted/30 p-4 items-center gap-2">
                  <QRCode value={pass.qr_code} size={140} />
                  <Text className="text-[10px] text-muted-foreground font-mono text-center">
                    {pass.qr_code}
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

export default MyPasses;

