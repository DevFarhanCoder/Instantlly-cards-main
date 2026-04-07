import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  ArrowLeft,
  Eye,
  Mouse,
  DollarSign,
  Clock,
  User,
  Building,
  Image as ImageIcon,
  Pause,
  Play,
  Trash2,
  CheckCircle,
  XCircle,
  ExternalLink,
} from "lucide-react-native";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { toast } from "../lib/toast";
import {
  useGetAdminAdDetailsQuery,
  useApproveAdCampaignMutation,
  useRejectAdCampaignMutation,
  usePauseAdCampaignMutation,
  useResumeAdCampaignMutation,
  useDeleteAdCampaignMutation,
} from "../store/api/adminApi";

const AdminAdDetail = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = route.params;

  const { data: campaign, isLoading, error, refetch } = useGetAdminAdDetailsQuery(id);
  const [approveAd] = useApproveAdCampaignMutation();
  const [rejectAd] = useRejectAdCampaignMutation();
  const [pauseAd] = usePauseAdCampaignMutation();
  const [resumeAd] = useResumeAdCampaignMutation();
  const [deleteAd] = useDeleteAdCampaignMutation();
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    try {
      setLoading(true);
      await approveAd(id).unwrap();
      toast.success("✅ Ad approved successfully!");
      setTimeout(() => refetch(), 500);
    } catch (err) {
      toast.error("❌ Failed to approve ad");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    Alert.alert("Reject Ad", "Are you sure you want to reject this ad?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            await rejectAd(id).unwrap();
            toast.success("⛔ Ad rejected");
            setTimeout(() => refetch(), 500);
          } catch (err) {
            toast.error("Failed to reject ad");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handlePause = async () => {
    try {
      setLoading(true);
      await pauseAd(id).unwrap();
      toast.success("⏸️ Ad paused");
      setTimeout(() => refetch(), 500);
    } catch (err) {
      toast.error("Failed to pause ad");
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    try {
      setLoading(true);
      await resumeAd(id).unwrap();
      toast.success("▶️ Ad resumed");
      setTimeout(() => refetch(), 500);
    } catch (err) {
      toast.error("Failed to resume ad");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert("Delete Ad", "This action cannot be undone. Delete this ad?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            console.log('[Delete] Attempting to delete ad:', id);
            await deleteAd(id).unwrap();
            console.log('[Delete] ✅ Ad deleted successfully');
            toast.success("🗑️ Ad deleted");
            setTimeout(() => navigation.goBack(), 500);
          } catch (err: any) {
            console.error('[Delete] ❌ Error:', err);
            toast.error("Failed to delete ad: " + (err?.data?.error || err?.message || "Unknown error"));
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-4 text-sm text-muted-foreground">Loading campaign...</Text>
      </View>
    );
  }

  if (error || !campaign) {
    return (
      <View className="flex-1 bg-background">
        <View className="border-b border-border bg-card px-4 py-3 flex-row items-center gap-3">
          <Pressable onPress={() => navigation.goBack()}>
            <ArrowLeft size={20} color="#111827" />
          </Pressable>
          <Text className="text-lg font-bold text-foreground flex-1">Ad Details</Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <Text className="text-red-500 text-center px-4">Failed to load campaign details</Text>
          <Button variant="outline" className="mt-4" onPress={() => refetch()}>
            Retry
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="border-b border-border bg-card px-4 py-3 flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#111827" />
        </Pressable>
        <Text className="text-lg font-bold text-foreground flex-1">Ad Details</Text>
        <Badge
          className={`text-[9px] ${
            campaign.approval_status === "approved"
              ? "bg-green-500/10 text-green-600"
              : campaign.approval_status === "rejected"
              ? "bg-red-500/10 text-red-600"
              : "bg-yellow-500/10 text-yellow-600"
          }`}
        >
          {campaign.approval_status}
        </Badge>
      </View>

      <ScrollView className="px-4 py-4" contentContainerStyle={{ paddingBottom: 16 }}>
        {/* Large Campaign Image Preview */}
        {campaign.creative_url ? (
          <View className="rounded-xl overflow-hidden mb-6 border border-border bg-muted">
            <Image
              source={{ uri: campaign.creative_url }}
              style={{ height: 250, width: "100%" }}
              resizeMode="cover"
            />
          </View>
        ) : (
          <View className="h-64 rounded-xl border-2 border-dashed border-border bg-muted flex items-center justify-center mb-6">
            <ImageIcon size={48} color="#c0c4cc" />
            <Text className="text-sm text-muted-foreground mt-2">No image available</Text>
          </View>
        )}

        {/* Basic Info */}
        <View className="rounded-xl border border-border bg-card p-4 mb-4">
          <Text className="text-xl font-bold text-foreground mb-2">{campaign.title}</Text>
          {campaign.description && (
            <Text className="text-sm text-muted-foreground mb-3 leading-5">{campaign.description}</Text>
          )}

          {/* Badges */}
          <View className="flex-row gap-2 flex-wrap">
            <Badge className="bg-blue-500/10 text-blue-600">{campaign.ad_type}</Badge>
            <Badge className={
              campaign.status === "active"
                ? "bg-green-500/10 text-green-600"
                : campaign.status === "paused"
                ? "bg-orange-500/10 text-orange-600"
                : "bg-gray-500/10 text-gray-600"
            }>
              {campaign.status === "active" ? "🟢 Active" : campaign.status === "paused" ? "⏸️ Paused" : "✅ Completed"}
            </Badge>
            <Badge className={
              campaign.approval_status === "approved"
                ? "bg-green-500/10 text-green-600"
                : campaign.approval_status === "rejected"
                ? "bg-red-500/10 text-red-600"
                : "bg-yellow-500/10 text-yellow-600"
            }>
              {campaign.approval_status}
            </Badge>
          </View>
        </View>

        {/* Budget & Performance Grid */}
        <View className="grid gap-3 mb-4" style={{ flexDirection: "row", flexWrap: "wrap" }}>
          <View className="rounded-lg border border-border bg-card p-3 flex-1 min-w-[48%]">
            <View className="flex-row items-center gap-2 mb-2">
              <DollarSign size={16} color="#2563eb" />
              <Text className="text-xs text-muted-foreground font-semibold">Daily Budget</Text>
            </View>
            <Text className="text-lg font-bold text-foreground">₹{campaign.daily_budget}</Text>
          </View>

          <View className="rounded-lg border border-border bg-card p-3 flex-1 min-w-[48%]">
            <View className="flex-row items-center gap-2 mb-2">
              <Clock size={16} color="#8b5cf6" />
              <Text className="text-xs text-muted-foreground font-semibold">Duration</Text>
            </View>
            <Text className="text-lg font-bold text-foreground">{campaign.duration_days} days</Text>
          </View>

          <View className="rounded-lg border border-border bg-card p-3 flex-1 min-w-[48%]">
            <View className="flex-row items-center gap-2 mb-2">
              <Eye size={16} color="#10b981" />
              <Text className="text-xs text-muted-foreground font-semibold">Impressions</Text>
            </View>
            <Text className="text-lg font-bold text-foreground">{campaign.impressions ?? 0}</Text>
          </View>

          <View className="rounded-lg border border-border bg-card p-3 flex-1 min-w-[48%]">
            <View className="flex-row items-center gap-2 mb-2">
              <Mouse size={16} color="#f59e0b" />
              <Text className="text-xs text-muted-foreground font-semibold">Clicks</Text>
            </View>
            <Text className="text-lg font-bold text-foreground">{campaign.clicks ?? 0}</Text>
          </View>
        </View>

        {/* Dates */}
        <View className="rounded-xl border border-border bg-card p-4 mb-4">
          <Text className="font-semibold text-foreground mb-3">Campaign Timeline</Text>
          <View className="space-y-3">
            <View className="flex-row justify-between items-center py-2">
              <Text className="text-sm text-muted-foreground">📅 Start</Text>
              <Text className="text-sm font-semibold text-foreground">
                {new Date(campaign.start_date).toLocaleDateString('en-IN')}
              </Text>
            </View>
            <View className="h-px bg-border" />
            <View className="flex-row justify-between items-center py-2">
              <Text className="text-sm text-muted-foreground">🏁 End</Text>
              <Text className={`text-sm font-semibold ${new Date(campaign.end_date) > new Date() ? "text-green-600" : "text-red-600"}`}>
                {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString('en-IN') : "No limit"}
              </Text>
            </View>
          </View>
        </View>

        {/* User & Business Info */}
        <View className="rounded-xl border border-border bg-card p-4 mb-4">
          <Text className="font-semibold text-foreground mb-3">Posted By</Text>

          {campaign.user && (
            <View className="mb-4 pb-4 border-b border-border">
              <View className="flex-row items-center gap-2 mb-2">
                <User size={16} color="#6a7181" />
                <Text className="text-sm font-semibold text-foreground">{campaign.user.name}</Text>
              </View>
              <Text className="text-xs text-muted-foreground ml-6">📱 {campaign.user.phone}</Text>
              {campaign.user.email && (
                <Text className="text-xs text-muted-foreground ml-6">✉️  {campaign.user.email}</Text>
              )}
            </View>
          )}

          {campaign.business && (
            <View>
              <View className="flex-row items-center gap-2 mb-2">
                <Building size={16} color="#6a7181" />
                <Text className="text-sm font-semibold text-foreground">{campaign.business.company_name}</Text>
              </View>
              {campaign.business.logo_url && (
                <Image
                  source={{ uri: campaign.business.logo_url }}
                  style={{ height: 40, width: 40, borderRadius: 8, marginLeft: 24 }}
                />
              )}
            </View>
          )}
        </View>

        {/* Variants */}
        {campaign.variants && campaign.variants.length > 0 && (
          <View className="rounded-xl border border-border bg-card p-4 mb-4">
            <Text className="font-semibold text-foreground mb-3">
              📸 Variants ({campaign.variants.length})
            </Text>
            {campaign.variants.map((v: any, idx: number) => (
              <View key={v.id} className={`py-3 ${idx < campaign.variants.length - 1 ? "border-b border-border" : ""}`}>
                <View className="flex-row items-start gap-3">
                  {v.creative_url && (
                    <Image
                      source={{ uri: v.creative_url }}
                      style={{ height: 50, width: 50, borderRadius: 6 }}
                    />
                  )}
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-foreground">{v.label || `Variant ${idx + 1}`}</Text>
                    <Text className="text-xs text-muted-foreground mt-1 break-all">{v.creative_url?.substring(0, 40)}...</Text>
                    <View className="flex-row gap-3 mt-2">
                      <Text className="text-xs text-muted-foreground">👁️ {v.impressions ?? 0}</Text>
                      <Text className="text-xs text-muted-foreground">🖱️ {v.clicks ?? 0}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View className="gap-2">
          {campaign.approval_status === "pending" && (
            <>
              <Button
                className="rounded-lg flex-row items-center justify-center gap-2 bg-green-600"
                onPress={handleApprove}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <CheckCircle size={16} color="#fff" />
                )}
                <Text className="text-white font-semibold">✅ Approve Campaign</Text>
              </Button>
              <Button
                variant="outline"
                className="rounded-lg flex-row items-center justify-center gap-2 border-red-200"
                onPress={handleReject}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <XCircle size={16} color="#ef4444" />
                )}
                <Text className="font-semibold text-red-600">⛔ Reject Campaign</Text>
              </Button>
            </>
          )}

          {campaign.status === "active" && campaign.approval_status !== "rejected" && (
            <Button
              variant="outline"
              className="rounded-lg flex-row items-center justify-center gap-2"
              onPress={handlePause}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#6a7181" />
              ) : (
                <Pause size={16} color="#6a7181" />
              )}
              <Text className="font-semibold">⏸️  Pause Campaign</Text>
            </Button>
          )}

          {campaign.status === "paused" && campaign.approval_status !== "rejected" && (
            <Button
              variant="outline"
              className="rounded-lg flex-row items-center justify-center gap-2 border-blue-200"
              onPress={handleResume}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : (
                <Play size={16} color="#2563eb" />
              )}
              <Text className="font-semibold text-blue-600">▶️ Resume Campaign</Text>
            </Button>
          )}

          <Button
            variant="outline"
            className="rounded-lg flex-row items-center justify-center gap-2 border-red-300"
            onPress={handleDelete}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#dc2626" />
            ) : (
              <Trash2 size={16} color="#dc2626" />
            )}
            <Text className="font-semibold text-red-600">🗑️ Delete Campaign</Text>
          </Button>
        </View>
      </ScrollView>
    </View>
  );
};

export default AdminAdDetail;
