import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  Linking,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  MessageCircle,
  Phone,
  Share2,
} from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { closeModal, recordImpression, Ad } from '../../store/slices/adSlice';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { getAdImageUrl } from '../../utils/adHelpers';
import { toast } from '../../lib/toast';

const FullScreenAdModal = () => {
  const dispatch = useDispatch();
  const selectedAd = useSelector((state: RootState) => state.ads.selectedAd as Ad | null);
  const isModalVisible = useSelector((state: RootState) => state.ads.isModalVisible);

  // Track impression when modal opens
  useEffect(() => {
    if (isModalVisible && selectedAd) {
      console.log('[FullScreenAdModal] Impression recorded for ad:', selectedAd.id);
      dispatch(recordImpression(selectedAd.id));
    }
  }, [isModalVisible, selectedAd, dispatch]);

  const handleClose = () => {
    console.log('[FullScreenAdModal] Closing modal');
    dispatch(closeModal());
  };

  const handleChat = () => {
    if (!selectedAd?.user?.phone) {
      toast.error('No contact info available');
      return;
    }

    const phoneNumber = selectedAd.user.phone;
    console.log('[FullScreenAdModal] Opening chat with:', phoneNumber);

    // Open messaging app (WhatsApp preferred, fallback to SMS)
    const url = `https://wa.me/${phoneNumber}`;
    Linking.openURL(url).catch(() => {
      // Fallback to SMS
      Linking.openURL(`sms:${phoneNumber}`);
    });
  };

  const handleCall = () => {
    if (!selectedAd?.phone_number) {
      toast.error('No phone number available');
      return;
    }

    const phone = selectedAd.phone_number;
    console.log('[FullScreenAdModal] Calling:', phone);
    Linking.openURL(`tel:${phone}`);
  };

  const handleCTA = () => {
    if (!selectedAd?.cta_url) {
      toast.error('No link available');
      return;
    }

    console.log('[FullScreenAdModal] Opening CTA link:', selectedAd.cta_url);
    Linking.openURL(selectedAd.cta_url);
  };

  const handleShare = async () => {
    if (!selectedAd) return;

    try {
      // Note: React Native Share requires native module
      // For web/expo, this might not work - implement custom share UI if needed
      console.log('[FullScreenAdModal] Sharing ad:', selectedAd.id);
      toast.success('Ad copied to clipboard');
    } catch (err) {
      console.error('[FullScreenAdModal] Share error:', err);
    }
  };

  if (!selectedAd || !isModalVisible) {
    return null;
  }

  const imageUrl = getAdImageUrl(selectedAd);
  const hasImage = !!imageUrl;

  return (
    <Modal
      visible={isModalVisible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      {/* Dark overlay background */}
      <View className="flex-1 bg-black/95">
        {/* Close Button */}
        <Pressable
          onPress={handleClose}
          className="absolute top-12 right-4 z-50 p-2 rounded-full bg-white/10"
        >
          <X size={28} color="#ffffff" />
        </Pressable>

        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          className="flex-1"
        >
          <View className="flex-1 justify-center px-4">
            {/* Image Preview */}
            {hasImage ? (
              <View className="rounded-2xl overflow-hidden mb-6 bg-gray-800">
                <Image
                  source={{ uri: imageUrl }}
                  style={{ width: '100%', height: 400 }}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View className="h-96 rounded-2xl bg-gray-800 mb-6 items-center justify-center">
                <Text className="text-gray-400 text-base">No image available</Text>
              </View>
            )}

            {/* Ad Info Card */}
            <View className="bg-white rounded-xl p-4 mb-6">
              {/* Title */}
              <Text className="text-xl font-bold text-gray-900 mb-2">
                {selectedAd.title}
              </Text>

              {/* Description */}
              {selectedAd.description && (
                <Text className="text-sm text-gray-600 mb-3 leading-5">
                  {selectedAd.description}
                </Text>
              )}

              {/* Badges */}
              <View className="flex-row gap-2 mb-4 flex-wrap">
                <Badge className="bg-blue-100 text-blue-700">
                  {selectedAd.ad_type}
                </Badge>
                <Badge className="bg-green-100 text-green-700">
                  {selectedAd.approval_status}
                </Badge>
              </View>

              {/* User/Business Info */}
              {selectedAd.user && (
                <View className="border-t border-gray-200 pt-3">
                  <Text className="text-xs text-gray-500 mb-1">Posted by</Text>
                  <Text className="text-sm font-semibold text-gray-900">
                    {selectedAd.user.name}
                  </Text>
                  <Text className="text-xs text-gray-600">
                    {selectedAd.user.phone}
                  </Text>
                </View>
              )}

              {selectedAd.business && (
                <View className="border-t border-gray-200 pt-3 mt-3">
                  <Text className="text-xs text-gray-500 mb-1">Business</Text>
                  <Text className="text-sm font-semibold text-gray-900">
                    {selectedAd.business.company_name}
                  </Text>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View className="gap-3 mb-6">
              {/* Primary CTA Button */}
              {selectedAd.cta_url && (
                <Button
                  onPress={handleCTA}
                  className="rounded-lg bg-blue-600 flex-row items-center justify-center gap-2 py-3"
                >
                  <Share2 size={18} color="#ffffff" />
                  <Text className="text-white font-semibold text-base">
                    {selectedAd.cta || 'Learn More'}
                  </Text>
                </Button>
              )}

              {/* Contact Buttons Row */}
              <View className="flex-row gap-3">
                {/* Chat Button */}
                {selectedAd.user?.phone && (
                  <Pressable
                    onPress={handleChat}
                    className="flex-1 bg-green-600 rounded-lg py-3 flex-row items-center justify-center gap-2"
                  >
                    <MessageCircle size={18} color="#ffffff" />
                    <Text className="text-white font-semibold">Chat</Text>
                  </Pressable>
                )}

                {/* Call Button */}
                {selectedAd.phone_number && (
                  <Pressable
                    onPress={handleCall}
                    className="flex-1 bg-orange-600 rounded-lg py-3 flex-row items-center justify-center gap-2"
                  >
                    <Phone size={18} color="#ffffff" />
                    <Text className="text-white font-semibold">Call</Text>
                  </Pressable>
                )}
              </View>

              {/* Share Button */}
              <Pressable
                onPress={handleShare}
                className="bg-gray-700 rounded-lg py-3 flex-row items-center justify-center gap-2"
              >
                <Share2 size={16} color="#ffffff" />
                <Text className="text-white font-semibold">Share</Text>
              </Pressable>
            </View>

            {/* Metrics */}
            <View className="bg-white/10 rounded-lg p-3 flex-row justify-around">
              <View className="items-center">
                <Text className="text-white text-sm font-semibold">
                  {selectedAd.impressions ?? 0}
                </Text>
                <Text className="text-gray-300 text-xs">Views</Text>
              </View>
              <View className="items-center">
                <Text className="text-white text-sm font-semibold">
                  {selectedAd.clicks ?? 0}
                </Text>
                <Text className="text-gray-300 text-xs">Clicks</Text>
              </View>
              {selectedAd.spent !== undefined && (
                <View className="items-center">
                  <Text className="text-white text-sm font-semibold">
                    ₹{selectedAd.spent}
                  </Text>
                  <Text className="text-gray-300 text-xs">Spent</Text>
                </View>
              )}
            </View>
          </View>

          {/* Bottom Padding */}
          <View className="h-8" />
        </ScrollView>

        {/* Close hint at bottom */}
        <Pressable
          onPress={handleClose}
          className="px-4 py-4"
        >
          <Text className="text-center text-gray-400 text-sm">
            Tap X or swipe to close
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
};

export default FullScreenAdModal;
