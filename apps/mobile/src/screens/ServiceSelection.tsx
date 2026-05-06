import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/routes';
import { useUpdateServiceTypeMutation } from '../store/api/authApi';
import { useAppDispatch } from '../store';
import { updateUser } from '../store/authSlice';

const { width } = Dimensions.get('window');

type ServiceType = 'home-based' | 'business-visiting';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ServiceSelection'>;

export default function ServiceSelectionScreen() {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [updateServiceType, { isLoading }] = useUpdateServiceTypeMutation();

  const handleSelect = async (serviceType: ServiceType) => {
    if (isLoading) return;
    setSelectedService(serviceType);
    try {
      await updateServiceType({ serviceType }).unwrap();
      dispatch(updateUser({ service_type: serviceType }));
      navigation.navigate('MyCards');
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.data?.error || 'Failed to save. Please try again.',
        [{ text: 'Retry', onPress: () => setSelectedService(null) }],
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.emoji}>💼</Text>
          <Text style={styles.title}>How do you offer your services?</Text>
          <Text style={styles.subtitle}>
            Choose the option that best describes your business
          </Text>
        </View>

        {/* Cards */}
        <View style={styles.options}>
          <TouchableOpacity
            style={[styles.card, selectedService === 'home-based' && styles.cardSelected]}
            onPress={() => handleSelect('home-based')}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.cardEmoji}>🏠</Text>
            <Text style={[styles.cardTitle, selectedService === 'home-based' && styles.cardTitleSelected]}>
              Home Based Services
            </Text>
            <Text style={styles.cardDesc}>
              Remote consultations, online services, or work from home
            </Text>
            {isLoading && selectedService === 'home-based' && (
              <ActivityIndicator style={styles.spinner} color="#10B981" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, selectedService === 'business-visiting' && styles.cardSelected2]}
            onPress={() => handleSelect('business-visiting')}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.cardEmoji}>🚗</Text>
            <Text style={[styles.cardTitle, selectedService === 'business-visiting' && styles.cardTitleSelected2]}>
              Business Visit
            </Text>
            <Text style={styles.cardDesc}>
              You visit clients on-site or at their location
            </Text>
            {isLoading && selectedService === 'business-visiting' && (
              <ActivityIndicator style={styles.spinner} color="#667EEA" />
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>You can change this later in your profile settings</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  options: {
    gap: 16,
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cardSelected: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  cardSelected2: {
    borderColor: '#667EEA',
    backgroundColor: '#EEF2FF',
  },
  cardEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  cardTitleSelected: {
    color: '#059669',
  },
  cardTitleSelected2: {
    color: '#4F46E5',
  },
  cardDesc: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  spinner: {
    marginTop: 12,
  },
  hint: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
