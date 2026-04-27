import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { Phone } from "lucide-react-native";

function getImageUrl(imagePath?: string): string {
  if (!imagePath) return "";
  if (
    imagePath.startsWith("http://") ||
    imagePath.startsWith("https://") ||
    imagePath.startsWith("data:")
  ) {
    return imagePath;
  }
  const base = (
    process.env.EXPO_PUBLIC_API_BASE ||
    process.env.EXPO_PUBLIC_API_URL ||
    "https://backend.instantllycards.com"
  ).replace(/\/$/, "");
  const path = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${base}${path}`;
}

interface BusinessCardTemplateProps {
  name: string;
  designation: string;
  companyName: string;
  personalPhone?: string;
  companyPhone?: string;
  email?: string;
  companyEmail?: string;
  website?: string;
  companyWebsite?: string;
  address?: string;
  companyAddress?: string;
  companyPhoto?: string;
  profilePhoto?: string;
  location?: string;
  mapsLink?: string;
  companyMapsLink?: string;
  message?: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
  whatsapp?: string;
  telegram?: string;
  onImageLoad?: () => void;
}

export default function BusinessCardTemplate({
  name,
  designation,
  companyName,
  personalPhone,
  companyPhone,
  email,
  companyEmail,
  website,
  companyWebsite,
  address,
  companyAddress,
  companyPhoto,
  profilePhoto,
  onImageLoad,
}: BusinessCardTemplateProps) {
  const displayName = (name || "Your Name").toUpperCase();
  const displayCompany = [companyName, designation]
    .filter(Boolean)
    .join(" | ")
    .toUpperCase();
  const displayPhone = companyPhone || personalPhone || "";
  const displayEmail = companyEmail || email || "";
  const displayWebsite = (companyWebsite || website || "").replace(/^https?:\/\//, "");
  const displayAddress = companyAddress || address || "";
  const imageUrl = getImageUrl(profilePhoto || companyPhoto);

  return (
    <View style={styles.container}>
      {/* LEFT SECTION */}
      <View style={styles.left}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.profileImage}
            onError={(e) => console.error("BusinessCardTemplate image error:", e.nativeEvent.error)}
            onLoad={() => {
              console.log("BusinessCardTemplate image loaded successfully");
              onImageLoad?.();
            }}
          />
        ) : (
          <View style={styles.profilePlaceholder}>
            <Text style={{ fontSize: 90 }}>🏢</Text>
          </View>
        )}
      </View>

      {/* RIGHT SECTION */}
      <View style={styles.right}>
        {/* Header block */}
        <View style={styles.headerBlock}>
          <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>
            {displayName}
          </Text>
          {!!displayCompany && (
            <Text style={styles.company}>{displayCompany}</Text>
          )}
        </View>

        {/* Contact rows */}
        <View style={styles.contactBlock}>
          {!!displayPhone && (
            <View style={styles.contactRow}>
              <View style={[styles.iconBadge, { backgroundColor: '#6B7280' }]}>
                <Phone size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.contactText} numberOfLines={1}>{displayPhone}</Text>
            </View>
          )}
          {!!displayEmail && (
            <View style={styles.contactRow}>
              <View style={styles.iconBadge}>
                <Text style={styles.iconText}>✉</Text>
              </View>
              <Text style={styles.contactText} numberOfLines={1}>{displayEmail}</Text>
            </View>
          )}
          {!!displayWebsite && (
            <View style={styles.contactRow}>
              <View style={styles.iconBadge}>
                <Text style={styles.iconText}>🌐</Text>
              </View>
              <Text style={styles.contactText} numberOfLines={1}>{displayWebsite}</Text>
            </View>
          )}
          {!!displayAddress && (
            <View style={styles.contactRow}>
              <View style={styles.iconBadge}>
                <Text style={styles.iconText}>📍</Text>
              </View>
              <Text style={styles.contactText} numberOfLines={1}>{displayAddress}</Text>
            </View>
          )}
        </View>
      </View>

      {/* WATERMARK */}
      <View style={styles.watermark}>
        <Image
          source={require('../../assets/logo.png')}
          style={{ width: 28, height: 28 }}
          resizeMode="contain"
        />
        <Text style={styles.watermarkText}>
          <Text style={{ color: "#FF8C00" }}>Instant</Text>
          <Text style={{ color: "#4A6B82" }}>lly</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 1050,
    height: 600,
    flexDirection: "row",
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  left: {
    width: "40%",
    backgroundColor: "#4A6B82",
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  profileImage: {
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 5,
    borderColor: "#FFFFFF",
    backgroundColor: "#FFFFFF",
  },
  profilePlaceholder: {
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 5,
    borderColor: "#FFFFFF",
    backgroundColor: "#5A7B92",
    alignItems: "center",
    justifyContent: "center",
  },
  right: {
    width: "60%",
    backgroundColor: "#E8EAED",
    padding: 50,
    paddingLeft: 60,
    justifyContent: "center",
  },
  headerBlock: {
    marginBottom: 40,
  },
  name: {
    fontSize: 56,
    fontWeight: "800",
    color: "#4A6B82",
    marginBottom: 8,
    letterSpacing: 1,
  },
  company: {
    fontSize: 20,
    fontWeight: "600",
    color: "#7A8A99",
    letterSpacing: 2,
  },
  contactBlock: {
    gap: 22,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#4A6B82",
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 18,
    color: "#FFFFFF",
  },
  contactText: {
    fontSize: 20,
    color: "#4A6B82",
    fontWeight: "500",
    flex: 1,
  },
  watermark: {
    position: "absolute",
    bottom: 12,
    right: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  watermarkText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
