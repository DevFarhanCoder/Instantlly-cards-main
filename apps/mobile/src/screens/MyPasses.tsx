import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { PageLoader } from "../components/ui/page-loader";
import QRCode from "react-native-qrcode-svg";
import { CalendarDays, Clock, LogOut, MapPin, Ticket, CheckCircle2 } from "lucide-react-native";
import { format } from "date-fns";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { useAuth } from "../hooks/useAuth";
import { useMyRegistrations } from "../hooks/useEvents";

const MyPasses = () => {
  const navigation = useNavigation<any>();
  const { user, signOut, loading: authLoading } = useAuth();
  const { registrations: passes, isLoading, refetch: refetchPasses } = useMyRegistrations();

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetchPasses(); } finally { setRefreshing(false); }
  }, [refetchPasses]);

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
          <Text className="text-xs text-primary-foreground/70">{(user as any).email}</Text>
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

      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} className="px-4 py-6 gap-4" refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#2463eb"]} tintColor="#2463eb" />
        }>
        {isLoading ? (
          <PageLoader fullScreen={false} />
        ) : !passes?.length ? (
          <View className="items-center py-10 gap-3">
            <Ticket size={48} color="#c0c4cc" />
            <Text className="text-muted-foreground">No event passes yet</Text>
            <Button variant="outline" onPress={() => navigation.navigate("Events")}>
              Browse Events
            </Button>
          </View>
        ) : (
          passes.map((pass: any) => (
            <Pressable
              key={pass.id}
              onPress={() => navigation.navigate("PassDetail", { passId: pass.id })}
            >
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <View className="p-4 gap-2">
                    <View className="flex-row items-start justify-between">
                      <Text className="font-bold text-foreground flex-1 mr-2">{pass.event?.title}</Text>
                      <View className="flex-row items-center gap-1">
                        {pass.payment_status === 'paid' && (
                          <Badge className="bg-success/10 text-success border-success/30">Paid</Badge>
                        )}
                        <Badge variant="secondary">Registered</Badge>
                      </View>
                    </View>
                    <View className="flex-row flex-wrap gap-3">
                      {pass.event?.date && (
                        <View className="flex-row items-center gap-1">
                          <CalendarDays size={12} color="#6a7181" />
                          <Text className="text-xs text-muted-foreground">
                            {format(new Date(pass.event.date), "MMM d, yyyy")}
                          </Text>
                        </View>
                      )}
                      {pass.event?.time && (
                        <View className="flex-row items-center gap-1">
                          <Clock size={12} color="#6a7181" />
                          <Text className="text-xs text-muted-foreground">{pass.event.time}</Text>
                        </View>
                      )}
                      {(pass.event?.location) && (
                        <View className="flex-row items-center gap-1">
                          <MapPin size={12} color="#6a7181" />
                          <Text className="text-xs text-muted-foreground">{pass.event.location}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {pass.qr_code ? (
                    <View className="border-t border-dashed border-border bg-muted/30 p-4 items-center gap-2">
                      <QRCode value={pass.qr_code} size={100} />
                      <Text className="text-[10px] text-primary font-medium">
                        Tap to view full pass
                      </Text>
                    </View>
                  ) : (
                    <View className="border-t border-dashed border-border bg-muted/30 p-3 items-center">
                      <Text className="text-xs text-muted-foreground">Tap to view details</Text>
                    </View>
                  )}
                </CardContent>
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
};

export default MyPasses;
