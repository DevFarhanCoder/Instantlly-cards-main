import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useListActiveCampaignsQuery } from "../../store/api/adsApi";

const AdDebugScreen = () => {
  const { data: ads = [], isLoading, error, refetch } = useListActiveCampaignsQuery();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading ads...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Error: {JSON.stringify(error, null, 2)}</Text>
        <Pressable onPress={() => refetch()}>
          <Text style={styles.button}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔍 AD DEBUG INFO</Text>
        <Text style={styles.subtitle}>Total Ads: {ads.length}</Text>
      </View>

      {ads.length === 0 ? (
        <Text style={styles.notice}>No ads found</Text>
      ) : (
        ads.map((ad: any, idx: number) => (
          <View key={ad.id || idx} style={styles.adCard}>
            <Text style={styles.adTitle}>
              Ad #{idx + 1}: {ad.title}
            </Text>

            {/* Key fields */}
            <View style={styles.field}>
              <Text style={styles.label}>ID:</Text>
              <Text style={styles.value}>{ad.id}</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Business Card ID:</Text>
              <Text style={styles.value}>
                {ad.business_card_id || "❌ MISSING"}
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Phone Number:</Text>
              <Text style={styles.value}>{ad.phone_number || "❌ MISSING"}</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Creative URL:</Text>
              <Text style={styles.value}>
                {ad.creative_url ? ad.creative_url.substring(0, 60) + "..." : "❌ MISSING"}
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Creative URLs Array:</Text>
              {ad.creative_urls && ad.creative_urls.length > 0 ? (
                <View>
                  <Text style={styles.value}>✅ Count: {ad.creative_urls.length}</Text>
                  {ad.creative_urls.map((url: string, i: number) => (
                    <Text key={i} style={styles.arrayItem}>
                      [{i}] {url.substring(0, 70)}...
                    </Text>
                  ))}
                </View>
              ) : (
                <Text style={styles.value}>❌ EMPTY ARRAY</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Business Object:</Text>
              {ad.business ? (
                <View>
                  <Text style={styles.value}>ID: {ad.business.id}</Text>
                  <Text style={styles.value}>Name: {ad.business.company_name}</Text>
                  <Text style={styles.value}>Phone: {ad.business.phone || "N/A"}</Text>
                </View>
              ) : (
                <Text style={styles.value}>❌ MISSING</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Full Raw Data:</Text>
              <Text style={styles.value}>
                {JSON.stringify(ad, null, 2).substring(0, 300)}...
              </Text>
            </View>
          </View>
        ))
      )}

      <View style={styles.footer}>
        <Pressable onPress={() => refetch()}>
          <Text style={styles.refreshButton}>🔄 Refresh</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  header: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#ddd",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  notice: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginTop: 20,
  },
  adCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#3B82F6",
  },
  adTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#000",
  },
  field: {
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#555",
  },
  value: {
    fontSize: 12,
    color: "#333",
    marginTop: 4,
    paddingLeft: 8,
    fontFamily: "monospace",
  },
  arrayItem: {
    fontSize: 11,
    color: "#666",
    marginTop: 4,
    paddingLeft: 16,
    fontFamily: "monospace",
  },
  error: {
    color: "red",
    fontSize: 12,
  },
  button: {
    color: "blue",
    fontSize: 14,
    marginTop: 10,
    padding: 10,
    textAlign: "center",
  },
  footer: {
    alignItems: "center",
    marginTop: 20,
    paddingBottom: 20,
  },
  refreshButton: {
    backgroundColor: "#3B82F6",
    color: "white",
    padding: 12,
    borderRadius: 6,
    overflow: "hidden",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default AdDebugScreen;
