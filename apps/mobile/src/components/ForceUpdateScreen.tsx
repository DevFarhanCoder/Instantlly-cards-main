import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Image,
  Platform,
} from 'react-native';
import { colors } from '../theme/colors';

interface ForceUpdateScreenProps {
  updateUrl: string;
  message?: string;
  /** If true show a "Later" button (soft update). If false the user cannot dismiss. */
  canSkip?: boolean;
  onSkip?: () => void;
}

const ForceUpdateScreen: React.FC<ForceUpdateScreenProps> = ({
  updateUrl,
  message,
  canSkip = false,
  onSkip,
}) => {
  const handleUpdate = () => {
    Linking.openURL(updateUrl).catch(() => {
      // fallback: open Play Store app page via market:// scheme
      if (Platform.OS === 'android') {
        Linking.openURL('market://details?id=com.instantllycards.www.twa').catch(() => {});
      }
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Update icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.iconEmoji}>🔄</Text>
        </View>

        <Text style={styles.title}>Update Required</Text>

        <Text style={styles.description}>
          {message ||
            'A new version of Instantly Cards is available. Please update to continue using the app.'}
        </Text>

        <TouchableOpacity style={styles.updateButton} onPress={handleUpdate} activeOpacity={0.8}>
          <Text style={styles.updateButtonText}>Update Now</Text>
        </TouchableOpacity>

        {canSkip && onSkip && (
          <TouchableOpacity style={styles.skipButton} onPress={onSkip} activeOpacity={0.7}>
            <Text style={styles.skipButtonText}>Later</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  content: {
    alignItems: 'center',
    maxWidth: 340,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconEmoji: {
    fontSize: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: 32,
  },
  updateButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  updateButtonText: {
    color: colors.primaryForeground,
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    marginTop: 16,
    paddingVertical: 10,
  },
  skipButtonText: {
    color: colors.mutedForeground,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ForceUpdateScreen;
