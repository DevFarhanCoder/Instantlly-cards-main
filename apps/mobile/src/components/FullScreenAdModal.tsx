import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Image,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch } from '../store';
import { closeAdModal } from '../store/adsCarouselSlice';
import { CarouselAd } from '../store/adsCarouselSlice';
import { toast } from '../lib/toast';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface FullScreenAdModalProps {
  visible: boolean;
  ad: CarouselAd | null;
  onClose: () => void;
}

const FullScreenAdModal: React.FC<FullScreenAdModalProps> = ({ visible, ad, onClose }) => {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);

  if (!ad) return null;

  const getImageUrl = (): string => {
    return ad.creative_url || ad.image_url || '';
  };

  const getCTAUrl = (): string => {
    return ad.cta_url || '';
  };

  const handleClose = () => {
    console.log('[FullScreenAdModal] Closing modal');
    dispatch(closeAdModal());
    onClose();
  };

  const handleContactClick = async () => {
    console.log('[FullScreenAdModal] Contact button clicked for ad:', ad.id);
    setLoading(true);
    try {
      // Attempt to send message if user available
      if (ad.user?.phone) {
        // In a real app, you'd route to chat screen with pre-filled message
        toast.info('Opening contact...');
        // router.push(`/chat/${ad.user.id}?preFill=I%20am%20interested`);
      }
    } catch (error) {
      console.error('[FullScreenAdModal] Error:', error);
      toast.error('Failed to open contact');
    } finally {
      setLoading(false);
    }
  };

  const handleKnowMoreClick = async () => {
    console.log('[FullScreenAdModal] Know More button clicked');
    const url = getCTAUrl();
    if (url) {
      try {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
          console.log('[FullScreenAdModal] ✅ Opened URL:', url);
        } else {
          toast.error('Cannot open this link');
        }
      } catch (error) {
        console.error('[FullScreenAdModal] Error opening URL:', error);
        toast.error('Failed to open link');
      }
    } else {
      Alert.alert('Info', 'No link available for this ad');
    }
  };

  const imageUrl = getImageUrl();

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {/* Background Image */}
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{
              width: screenWidth,
              height: screenHeight,
              position: 'absolute',
            }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              flex: 1,
              backgroundColor: '#1a1a1a',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff' }}>No image available</Text>
          </View>
        )}

        {/* Dark Overlay */}
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
          }}
        />

        {/* Close Button */}
        <TouchableOpacity
          onPress={handleClose}
          style={{
            position: 'absolute',
            top: 50,
            right: 20,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: 25,
            padding: 10,
            zIndex: 10,
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>

        {/* Ad Info Card (Top) */}
        <View
          style={{
            position: 'absolute',
            top: 80,
            left: 16,
            right: 16,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 12,
            padding: 16,
            zIndex: 5,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: '700',
              color: '#111827',
              marginBottom: 8,
            }}
            numberOfLines={2}
          >
            {ad.title}
          </Text>
          {ad.description && (
            <Text
              style={{
                fontSize: 13,
                color: '#6a7181',
                marginBottom: 8,
                lineHeight: 18,
              }}
              numberOfLines={2}
            >
              {ad.description}
            </Text>
          )}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <View
              style={{
                backgroundColor: '#e0e7ff',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 6,
              }}
            >
              <Text style={{ fontSize: 11, color: '#4f46e5', fontWeight: '600' }}>
                {ad.ad_type}
              </Text>
            </View>
            {ad.daily_budget && (
              <View
                style={{
                  backgroundColor: '#dbeafe',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 6,
                }}
              >
                <Text style={{ fontSize: 11, color: '#0369a1', fontWeight: '600' }}>
                  ₹{ad.daily_budget}/day
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Bottom Action Buttons */}
        <View
          style={{
            position: 'absolute',
            bottom: 40,
            left: 0,
            right: 0,
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 20,
            zIndex: 5,
          }}
        >
          {/* Know More / CTA Button */}
          <TouchableOpacity
            onPress={handleKnowMoreClick}
            activeOpacity={0.8}
            disabled={loading}
            style={{
              width: '100%',
              backgroundColor: '#10b981',
              paddingHorizontal: 28,
              paddingVertical: 16,
              borderRadius: 30,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="link-outline" size={18} color="#fff" />
            )}
            <Text
              style={{
                color: '#fff',
                fontSize: 16,
                fontWeight: '600',
              }}
            >
              Know More
            </Text>
          </TouchableOpacity>

          {/* Contact Button */}
          {ad.user?.phone && (
            <TouchableOpacity
              onPress={handleContactClick}
              activeOpacity={0.8}
              disabled={loading}
              style={{
                width: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                paddingHorizontal: 28,
                paddingVertical: 16,
                borderRadius: 30,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#10b981" />
              <Text
                style={{
                  color: '#10b981',
                  fontSize: 16,
                  fontWeight: '600',
                }}
              >
                Contact
              </Text>
            </TouchableOpacity>
          )}

          {/* Business Info */}
          {ad.business && (
            <Text
              style={{
                color: '#fff',
                fontSize: 13,
                marginTop: 8,
              }}
            >
              By <Text style={{ fontWeight: '600' }}>{ad.business.company_name}</Text>
            </Text>
          )}
        </View>

        {/* Stats Bar (if available) */}
        {(ad.impressions || ad.clicks) && (
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              paddingHorizontal: 20,
              paddingVertical: 12,
              flexDirection: 'row',
              justifyContent: 'space-around',
            }}
          >
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
                {ad.impressions ?? 0}
              </Text>
              <Text style={{ color: '#9ca3af', fontSize: 11 }}>Views</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
                {ad.clicks ?? 0}
              </Text>
              <Text style={{ color: '#9ca3af', fontSize: 11 }}>Clicks</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
                {ad.duration_days ?? 'N/A'}
              </Text>
              <Text style={{ color: '#9ca3af', fontSize: 11 }}>Days</Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

import { StyleSheet } from 'react-native';

export default FullScreenAdModal;
