import React, { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Eye,
  TrendingUp,
  Users,
} from "lucide-react-native";

import { Card, CardContent } from "../components/ui/card";
import { ErrorState } from "../components/ui/error-state";
import { PageLoader } from "../components/ui/page-loader";
import {
  useGetEventAnalyticsQuery,
  useGetEventQuery,
} from "../store/api/eventsApi";
import { useColors } from "../theme/colors";

const EventAnalytics = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const colors = useColors();
  const rawId = route?.params?.id;
  const numericId = typeof rawId === "string" ? parseInt(rawId, 10) : rawId;
  const idValid = typeof numericId === "number" && !Number.isNaN(numericId);

  const {
    data: event,
  } = useGetEventQuery(numericId as number, { skip: !idValid });
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useGetEventAnalyticsQuery(numericId as number, { skip: !idValid });

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const conversionPct =
    typeof data?.conversion_rate === "number"
      ? `${(data.conversion_rate * 100).toFixed(1)}%`
      : "—";

  return (
    <View className="flex-1 bg-background">
      <View className="bg-primary px-4 py-4 flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <ArrowLeft size={20} color={colors.primaryForeground} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-lg font-bold text-primary-foreground">
            Analytics
          </Text>
          {event ? (
            <Text
              className="text-xs text-primary-foreground/70"
              numberOfLines={1}
            >
              {event.title}
            </Text>
          ) : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 12 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {!idValid ? (
          <ErrorState
            compact
            title="Invalid event"
            message="No event id was provided."
          />
        ) : isLoading ? (
          <PageLoader fullScreen={false} />
        ) : isError || !data ? (
          <ErrorState
            compact
            title="Couldn't load analytics"
            onRetry={() => refetch()}
          />
        ) : (
          <>
            <View className="flex-row gap-3">
              <StatTile
                label="Views"
                value={data.views}
                icon={<Eye size={20} color={colors.primary} />}
              />
              <StatTile
                label="Registrations"
                value={data.registrations}
                icon={<Users size={20} color={colors.primary} />}
              />
            </View>
            <View className="flex-row gap-3">
              <StatTile
                label="Check-ins"
                value={data.check_ins}
                icon={<CheckCircle2 size={20} color={colors.success} />}
              />
              <StatTile
                label="Conversion"
                value={conversionPct}
                icon={<TrendingUp size={20} color={colors.primary} />}
              />
            </View>

            <Card className="mt-2">
              <CardContent className="p-4 gap-2">
                <View className="flex-row items-center gap-2">
                  <BarChart3 size={16} color={colors.primary} />
                  <Text className="text-sm font-semibold text-foreground">
                    Funnel
                  </Text>
                </View>
                <FunnelRow
                  label="Viewed"
                  value={data.views}
                  total={Math.max(data.views, 1)}
                  color={colors.primary}
                />
                <FunnelRow
                  label="Registered"
                  value={data.registrations}
                  total={Math.max(data.views, data.registrations, 1)}
                  color={colors.primary}
                />
                <FunnelRow
                  label="Checked in"
                  value={data.check_ins}
                  total={Math.max(data.registrations, data.check_ins, 1)}
                  color={colors.success}
                />
                <Text className="text-[11px] text-muted-foreground mt-1">
                  Conversion rate: views → registrations = {conversionPct}
                </Text>
              </CardContent>
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
};

interface StatTileProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}

function StatTile({ label, value, icon }: StatTileProps) {
  return (
    <Card className="flex-1">
      <CardContent className="p-4 gap-2 items-start">
        <View className="h-9 w-9 rounded-xl bg-primary/10 items-center justify-center">
          {icon}
        </View>
        <Text className="text-2xl font-bold text-foreground">{value}</Text>
        <Text className="text-xs text-muted-foreground">{label}</Text>
      </CardContent>
    </Card>
  );
}

function FunnelRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <View>
      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-foreground">{label}</Text>
        <Text className="text-xs font-medium text-muted-foreground">
          {value}
        </Text>
      </View>
      <View className="h-2 bg-muted rounded-full overflow-hidden mt-1">
        <View
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            height: "100%",
          }}
        />
      </View>
    </View>
  );
}

export default EventAnalytics;
