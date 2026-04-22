import { Platform, Alert, Share as RNShare } from "react-native";

// Lazy imports to prevent crash if native modules not available
let captureRef: any = null;
let FileSystem: any = null;
let Sharing: any = null;
let Share: any = null;

// Track which modules failed to load
export const missingModules: string[] = [];

try {
  const viewShot = require("react-native-view-shot");
  captureRef = viewShot.captureRef;
  console.log("✅ [cardImageGen] react-native-view-shot loaded");
} catch (error) {
  console.warn("⚠️ react-native-view-shot not available:", error);
  missingModules.push("react-native-view-shot");
}

try {
  FileSystem = require("expo-file-system/legacy");
  console.log("✅ [cardImageGen] expo-file-system loaded");
} catch (error) {
  console.warn("⚠️ expo-file-system not available:", error);
  missingModules.push("expo-file-system");
}

try {
  Sharing = require("expo-sharing");
  console.log("✅ [cardImageGen] expo-sharing loaded");
} catch (error) {
  console.warn("⚠️ expo-sharing not available:", error);
  missingModules.push("expo-sharing");
}

try {
  Share = require("react-native-share").default;
  console.log("✅ [cardImageGen] react-native-share loaded");
} catch (error) {
  console.warn("⚠️ react-native-share not available:", error);
  missingModules.push("react-native-share");
}

// Helper: convert 24h time string to 12h format
function convertTo12Hour(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

// Helper: format business hours object/string into human-readable string
function formatBusinessHours(hoursObj: any): string {
  if (!hoursObj) return "";

  let hours: any = hoursObj;
  if (typeof hoursObj === "string") {
    try {
      hours = JSON.parse(hoursObj);
    } catch {
      return hoursObj;
    }
  }

  if (typeof hours !== "object") return String(hoursObj);

  const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const dayShort: Record<string, string> = {
    Monday: "Mon",
    Tuesday: "Tue",
    Wednesday: "Wed",
    Thursday: "Thu",
    Friday: "Fri",
    Saturday: "Sat",
    Sunday: "Sun",
  };

  let formatted = "";
  let previousRange = "";
  let startDay = "";

  dayOrder.forEach((day, index) => {
    const dayData = hours[day];
    if (!dayData) return;

    const isOpen = dayData.open !== false;
    const currentRange = isOpen
      ? `${convertTo12Hour(dayData.openTime)} - ${convertTo12Hour(dayData.closeTime)}`
      : "Closed";

    if (currentRange === previousRange && previousRange !== "") {
      // same as previous, keep grouping
    } else {
      if (previousRange !== "") {
        const prevDay = dayShort[dayOrder[index - 1]];
        if (startDay === prevDay) {
          formatted += `${startDay}: ${previousRange}\n`;
        } else {
          formatted += `${startDay} - ${prevDay}: ${previousRange}\n`;
        }
      }
      startDay = dayShort[day];
      previousRange = currentRange;
    }

    if (index === dayOrder.length - 1 && previousRange !== "") {
      const lastDay = dayShort[day];
      if (startDay === lastDay) {
        formatted += `${startDay}: ${previousRange}`;
      } else {
        formatted += `${startDay} - ${lastDay}: ${previousRange}`;
      }
    }
  });

  return formatted.trim();
}

// Helper: build WhatsApp-style card details message
// Accepts both BusinessCardRow (snake_case) and ShareCardData (camelCase)
function buildCardDetails(cardData: any): string {
  // Normalize to snake_case — support both naming conventions
  const d = {
    full_name: cardData.full_name ?? cardData.fullName,
    phone: cardData.phone,
    personal_phone: cardData.personal_phone ?? cardData.personalPhone,
    personal_country_code: cardData.personal_country_code ?? cardData.personalCountryCode,
    email: cardData.email,
    location: cardData.location,
    maps_link: cardData.maps_link ?? cardData.mapsLink,
    company_name: cardData.company_name ?? cardData.companyName,
    company_phone: cardData.company_phone ?? cardData.companyPhone,
    company_country_code: cardData.company_country_code ?? cardData.companyCountryCode,
    company_phones: cardData.company_phones ?? cardData.companyPhones,
    whatsapp: cardData.whatsapp,
    job_title: cardData.job_title ?? cardData.jobTitle,
    about_business: cardData.about_business ?? cardData.aboutBusiness ?? cardData.businessDescription,
    services_offered: cardData.services_offered ?? cardData.servicesOffered,
    keywords: cardData.keywords,
    company_website: cardData.company_website ?? cardData.companyWebsite,
    website: cardData.website,
    company_email: cardData.company_email ?? cardData.companyEmail,
    company_address: cardData.company_address ?? cardData.companyAddress,
    company_maps_link: cardData.company_maps_link ?? cardData.companyMapsLink,
    business_hours: cardData.business_hours ?? cardData.businessHours,
    facebook: cardData.facebook,
    instagram: cardData.instagram,
    youtube: cardData.youtube,
    linkedin: cardData.linkedin,
    twitter: cardData.twitter,
    telegram: cardData.telegram,
  };

  let details = "*This is My Instantlly Digital Visiting Card*\n\n";

  // === Personal Information ===
  if (d.full_name) details += `*👤 Name:* ${d.full_name}\n`;

  const personalPhone = d.personal_phone || d.phone;
  if (personalPhone) {
    const fullPersonalPhone = d.personal_country_code
      ? `+${d.personal_country_code}${personalPhone}`
      : personalPhone;
    details += `*📱 Personal Phone:* ${fullPersonalPhone}\n`;
    details += `*💬 Personal WhatsApp:* ${fullPersonalPhone}\n`;
  }

  if (d.email) details += `*📧 Personal Email:* ${d.email}\n`;
  if (d.location) details += `*🏭 Address:* ${d.location}\n`;
  if (d.maps_link) details += `*📍 Google Maps Link:* ${d.maps_link}\n`;

  // === Company / Business Information ===
  details += "\n";
  if (d.company_name) details += `▪️ *🏢 Company Name:* ${d.company_name}\n`;

  const companyPhone = d.company_phone;
  if (companyPhone) {
    const fullCompanyPhone = d.company_country_code
      ? `+${d.company_country_code}${companyPhone}`
      : companyPhone;
    details += `▪️ *📱 Company Mob:* ${fullCompanyPhone}\n`;

    if (d.company_phones && Array.isArray(d.company_phones)) {
      const shownPhones = new Set([companyPhone]);
      let counter = 2;
      d.company_phones.forEach((p: any) => {
        if (p.phone && !shownPhones.has(p.phone)) {
          details += `▪️ *📱 Company Mob ${counter}:* ${p.phone}\n`;
          shownPhones.add(p.phone);
          counter++;
        }
      });
    }

    const companyWA = d.whatsapp || fullCompanyPhone;
    if (companyWA) details += `▪️ *💬 Company WhatsApp:* ${companyWA}\n`;
  }

  if (d.job_title) details += `▪️ *💼 Designation:* ${d.job_title}\n`;
  if (d.about_business) details += `▪️ *🏭 Company Business:* ${d.about_business}\n`;
  if (d.services_offered) details += `▪️ *🛠️ Business Category:* ${d.services_offered}\n`;
  if (d.keywords) details += `▪️ *🔎 Search Key Word:* ${d.keywords}\n`;

  const website = d.company_website || d.website;
  if (website) details += `▪️ *🌍 Company Website:* ${website}\n`;

  if (d.company_email) details += `▪️ *📧 Company Email:* ${d.company_email}\n`;
  if (d.company_address) details += `▪️ *🏭 Company Address:* ${d.company_address}\n`;
  if (d.company_maps_link) details += `▪️ *📍 Company Maps:* ${d.company_maps_link}\n`;

  if (d.business_hours) {
    const formattedHours = formatBusinessHours(d.business_hours);
    if (formattedHours && !formattedHours.match(/^Mon\s*[-–]\s*Sun:\s*Closed$/i)) {
      details += `▪️ *🕐 Business Hours:*\n${formattedHours}\n`;
    }
  }

  // === Social Media ===
  const hasSocial =
    d.facebook || d.instagram || d.youtube || d.linkedin || d.twitter || d.telegram;

  if (hasSocial) {
    details += `\n▪️ *🔗 Social Media:*\n`;
    if (d.facebook) details += `▪️ *👥 Facebook:* ${d.facebook}\n`;
    if (d.instagram) details += `▪️ *📸 Instagram:* ${d.instagram}\n`;
    if (d.youtube) details += `▪️ *▶️ YouTube:* ${d.youtube}\n`;
    if (d.linkedin) details += `▪️ *🟦 LinkedIn:* ${d.linkedin}\n`;
    if (d.twitter) details += `▪️ *𝕏 Twitter/X:* ${d.twitter}\n`;
    if (d.telegram) details += `▪️ *✈️ Telegram:* ${d.telegram}\n`;
  }

  return details;
}

/**
 * Generate and share a business card image.
 * @param viewRef - React ref or view instance to capture
 * @param cardData - BusinessCardRow from useBusinessCards
 * @param shareMethod - 'native' | 'whatsapp' | 'save' (default 'native')
 */
export async function generateAndShareCardImage(
  viewRef: any,
  cardData: any,
  shareMethod: "native" | "whatsapp" | "save" = "native",
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!captureRef) {
      Alert.alert(
        "Feature Not Available",
        "Card image sharing requires app rebuild.\n\nPlease rebuild the app with:\n\nnpx expo run:android",
        [{ text: "OK" }],
      );
      return { success: false, error: "native_module_not_available" };
    }

    const viewToCapture = viewRef?.current !== undefined ? viewRef.current : viewRef;
    if (!viewToCapture) {
      return { success: false, error: "view_ref_not_ready" };
    }

    // Wait for images inside the hidden view to finish loading from network
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const uri = await captureRef(viewToCapture, {
      format: "png",
      quality: 1,
      result: "tmpfile",
    });

    console.log("✅ Card image captured:", uri);

    let shareableUri = uri;
    if (FileSystem) {
      try {
        const destUri = FileSystem.cacheDirectory + "card_share_" + Date.now() + ".png";
        await FileSystem.copyAsync({ from: uri, to: destUri });
        const fileInfo = await FileSystem.getInfoAsync(destUri);
        if (fileInfo.exists && (fileInfo as any).size > 0) {
          shareableUri = destUri;
        }
      } catch (copyErr: any) {
        console.warn("⚠️ Could not copy image to cache:", copyErr?.message);
      }
    }

    const companyName = cardData.company_name ?? cardData.companyName ?? cardData.full_name ?? cardData.fullName ?? "Business";
    const fileName = `${companyName.replace(/[^a-zA-Z0-9]/g, "_")}_Card.png`;

    const referralCode = cardData.referral_code ?? cardData.referralCode ?? "QP8B385Q";
    const referralLink = `https://play.google.com/store/apps/details?id=com.instantllycards.www.twa&referrer=utm_source%3Dreferral%26utm_campaign%3D${referralCode}`;

    switch (shareMethod) {
      case "whatsapp": {
        const whatsappMessage =
          buildCardDetails(cardData) +
          `\nMake your FREE Instantlly Digital Visiting Card Download the *Mobile App* to create and share your own card!\n\n*Referral Link :* ${referralLink}\n\n🌐 *Visit Website :* www.Instantlly.com`;

        const filePrefix = Platform.OS === "android" ? "file://" : "";
        const shareUrl = shareableUri.startsWith("file://") ? shareableUri : filePrefix + shareableUri;
        let shared = false;

        // Method A: shareSingle directly into WhatsApp (image + message, no sheet)
        if (Share && !shared) {
          try {
            await Share.shareSingle({
              title: `${companyName}'s Business Card`,
              message: whatsappMessage,
              url: shareUrl,
              type: "image/png",
              filename: fileName,
              social: Share.Social.WHATSAPP,
            });
            shared = true;
          } catch (shareError: any) {
            if (
              shareError?.message === "User did not share" ||
              shareError?.message === "CANCEL"
            ) {
              shared = true;
            } else {
              console.warn("⚠️ shareSingle failed:", shareError?.message);
              // Fall through to Method B: system sheet WITH image
            }
          }
        }

        // Method B: system share sheet with image (user picks WhatsApp)
        if (Share && !shared) {
          try {
            await Share.open({
              title: `${companyName}'s Business Card`,
              message: whatsappMessage,
              url: shareUrl,
              type: "image/png",
              filename: fileName,
            });
            shared = true;
          } catch (shareError: any) {
            if (
              shareError?.message === "User did not share" ||
              shareError?.message === "CANCEL"
            ) {
              shared = true;
            } else {
              console.warn("⚠️ Share.open failed:", shareError?.message);
            }
          }
        }

        // Method C: expo-sharing (last resort — image only, copies text to clipboard)
        if (Sharing && !shared) {
          try {
            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
              const { Clipboard } = require("react-native");
              Clipboard.setString(whatsappMessage);
              Alert.alert(
                "Message Copied!",
                "Card message copied to clipboard. Paste it after sharing the image.",
                [{ text: "OK" }],
              );
              await Sharing.shareAsync(shareableUri, {
                mimeType: "image/png",
                dialogTitle: `Share ${companyName}'s Business Card`,
              });
              shared = true;
            }
          } catch (expoError: any) {
            console.warn("⚠️ expo-sharing failed:", expoError?.message);
          }
        }

        if (!shared) {
          Alert.alert("Share Failed", "Unable to share card image. Please try again.");
        }
        break;
      }

      case "save": {
        if (Sharing && (await Sharing.isAvailableAsync())) {
          await Sharing.shareAsync(shareableUri, {
            mimeType: "image/png",
            dialogTitle: "Save Business Card",
            UTI: "public.png",
          });
        } else {
          throw new Error("Sharing is not available on this device");
        }
        break;
      }

      case "native":
      default: {
        const shareMessage =
          `${companyName}'s Digital Business Card\n\n` +
          `🎯 Create your FREE Digital Visiting Card with Instantlly Cards!\n` +
          `📱 https://play.google.com/store/apps/details?id=com.instantllycards.www.twa`;

        const filePrefix = Platform.OS === "android" ? "file://" : "";
        const nativeShareUrl = shareableUri.startsWith("file://") ? shareableUri : filePrefix + shareableUri;
        let nativeShared = false;

        if (Share && !nativeShared) {
          try {
            await Share.open({
              title: `${companyName}'s Business Card`,
              message: shareMessage,
              url: nativeShareUrl,
              type: "image/png",
              filename: fileName,
            });
            nativeShared = true;
          } catch (shareError: any) {
            if (shareError?.message === "User did not share") {
              nativeShared = true;
            } else {
              console.warn("⚠️ react-native-share failed for native:", shareError?.message);
            }
          }
        }

        if (Sharing && !nativeShared) {
          try {
            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
              await Sharing.shareAsync(shareableUri, {
                mimeType: "image/png",
                dialogTitle: `Share ${companyName}'s Business Card`,
              });
              nativeShared = true;
            }
          } catch (expoError: any) {
            console.warn("⚠️ expo-sharing failed:", expoError?.message);
          }
        }

        if (!nativeShared) {
          await RNShare.share({
            message: shareMessage,
            title: `${companyName}'s Business Card`,
          });
        }
        break;
      }
    }

    console.log("✅ Card shared successfully");
    return { success: true };
  } catch (error: any) {
    console.error("❌ Error generating/sharing card image:", error);
    if (error.message?.includes("User did not share")) {
      return { success: false, error: "cancelled" };
    }
    return { success: false, error: error.message || "Failed to generate card image" };
  }
}

/**
 * Capture card view and return the file URI without sharing.
 * @param viewRef - React ref or view instance
 * @param cardData - BusinessCardRow (unused but kept for consistent API)
 */
export async function generateCardImageFile(
  viewRef: any,
  cardData: any,
): Promise<{ success: boolean; uri?: string; error?: string }> {
  try {
    if (!captureRef || !FileSystem) {
      return { success: false, error: "native_module_not_available" };
    }

    const viewToCapture = viewRef?.current !== undefined ? viewRef.current : viewRef;
    if (!viewToCapture) {
      return { success: false, error: "view_ref_not_ready" };
    }

    const uri = await captureRef(viewToCapture, {
      format: "png",
      quality: 1,
      result: "tmpfile",
    });

    console.log("✅ Card image file generated:", uri);
    return { success: true, uri };
  } catch (error: any) {
    console.error("❌ Error generating card image file:", error);
    return { success: false, error: error.message || "Failed to generate card image" };
  }
}
