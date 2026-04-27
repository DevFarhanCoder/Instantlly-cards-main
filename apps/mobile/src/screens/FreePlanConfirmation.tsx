import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ArrowLeft, ArrowRight, Check, CreditCard, LayoutList, Gift } from "lucide-react-native";
import { useAuth } from "../hooks/useAuth";
import { toast } from "../lib/toast";
import { useIconColor } from "../theme/colors";

const freeFeatures = [
  {
    icon: CreditCard,
    name: "Digital Visiting Card",
    desc: "Create a professional digital business card to share with customers instantly",
    included: true,
  },
  {
    icon: LayoutList,
    name: "Category Listing",
    desc: "Get listed under your business category so customers can discover you easily",
    included: true,
  },
];

const FreePlanConfirmation = () => {
  const iconColor = useIconColor();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();

  const handleContinue = () => {
    if (!user) {
      toast.info("Please sign in to create your business listing");
      navigation.navigate("Auth", {
        redirect: "BusinessPromotionForm",
        redirectParams: { plan: "free" },
      });
      return;
    }
    navigation.navigate("BusinessPromotionForm", { plan: "free" });
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: "#e5e7eb", backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={iconColor} />
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827" }}>Free Plan</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        {/* What's Included */}
        <Text style={{ fontSize: 13, fontWeight: "700", color: "#6b7280", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14 }}>
          What's Included
        </Text>

        {freeFeatures.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <View
              key={idx}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 14,
                backgroundColor: "#f9fafb",
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: "#e5e7eb",
              }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "#dcfce7", alignItems: "center", justifyContent: "center" }}>
                <Icon size={22} color="#16a34a" strokeWidth={2.5} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>{feature.name}</Text>
                  <View style={{ backgroundColor: "#dcfce7", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: "#16a34a" }}>FREE</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 13, color: "#6b7280", lineHeight: 18 }}>{feature.desc}</Text>
              </View>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#16a34a", alignItems: "center", justifyContent: "center", marginTop: 10 }}>
                <Check size={14} color="#fff" strokeWidth={3} />
              </View>
            </View>
          );
        })}

        {/* Upgrade hint */}
        <View style={{ backgroundColor: "#fef3c7", borderRadius: 14, padding: 14, marginTop: 16, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ fontSize: 20 }}>💡</Text>
          <Text style={{ fontSize: 12, color: "#92400e", flex: 1, lineHeight: 18 }}>
            You can upgrade to a Premium plan anytime to unlock higher visibility, direct leads, and analytics.
          </Text>
        </View>
      </ScrollView>

      {/* Footer CTA */}
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingHorizontal: 16, paddingVertical: 14, paddingBottom: 24 }}>
        <Pressable
          onPress={handleContinue}
          style={{
            width: "100%",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            borderRadius: 14,
            paddingVertical: 16,
            backgroundColor: "#16a34a",
            shadowColor: "#16a34a",
            shadowOpacity: 0.3,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 12,
            elevation: 4,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>Continue with Free Plan</Text>
          <ArrowRight size={18} color="#fff" strokeWidth={2.5} />
        </Pressable>
      </View>
    </View>
  );
};

export default FreePlanConfirmation;
