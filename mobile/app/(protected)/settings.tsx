import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Alert, Switch, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useRouter } from 'expo-router';
import { isBiometricAvailable, getBiometricType } from '../../lib/biometrics';
import { hapticWarning, hapticMedium, hapticSuccess, hapticError, hapticLight } from '../../lib/haptics';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';

const BIOMETRIC_KEY = 'biometric_enabled';

export default function SettingsScreen() {
  const { user, isGuest, isAuthenticated, logout, deleteAccount } = useAuth();
  const { isSubscribed, handleRestore } = useSubscription();
  const router = useRouter();
  const [biometricType, setBiometricType] = useState<string | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const checkBiometrics = async () => {
      const available = await isBiometricAvailable();
      if (available) {
        const type = await getBiometricType();
        setBiometricType(type);
        const saved = await SecureStore.getItemAsync(BIOMETRIC_KEY);
        if (saved === 'true') {
          setBiometricEnabled(true);
        }
      }
    };
    checkBiometrics();
  }, []);

  const toggleBiometric = async (val: boolean) => {
    setBiometricEnabled(val);
    await SecureStore.setItemAsync(BIOMETRIC_KEY, val ? 'true' : 'false');
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount(deletePassword);
      setShowDeleteModal(false);
    } catch (err: any) {
      Alert.alert(
        'Error',
        err.response?.data?.message || 'Failed to delete account'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDelete = () => {
    hapticWarning();
    Alert.alert(
      'Delete Account',
      'This action is permanent. All your data will be erased and cannot be recovered. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => setShowDeleteModal(true),
        },
      ]
    );
  };

  // Restore Purchases (Guideline 3.1 -- required on every paywall)
  const handleRestorePurchases = async () => {
    hapticMedium();
    try {
      const success = await handleRestore();
      if (success) {
        hapticSuccess();
        Alert.alert('Restored', 'Your purchases have been restored!');
      } else {
        Alert.alert('Not Found', 'No previous purchases found.');
      }
    } catch {
      hapticError();
      Alert.alert('Error', 'Failed to restore purchases.');
    }
  };

  const handleOpenPrivacyPolicy = () => {
    hapticLight();
    Linking.openURL('https://feelsy.app/privacy');
  };

  const handleOpenTerms = () => {
    hapticLight();
    Linking.openURL('https://feelsy.app/terms');
  };

  const handleNotificationPreferences = () => {
    hapticLight();
    Alert.alert('Coming Soon', 'Notification preferences will be available in the next update.');
  };

  const handleUpgradePremium = () => {
    hapticMedium();
    router.push('/(protected)/paywall');
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <ScrollView className="flex-1 px-6 pt-8" showsVerticalScrollIndicator={false}>
        <Text className="mb-8 text-3xl font-bold text-white">Settings</Text>

        {/* Guest CTA Card */}
        {isGuest && !isAuthenticated && (
          <Pressable
            onPress={() => { hapticMedium(); router.push('/(auth)/login'); }}
            className="mb-6 rounded-2xl bg-rose-900/30 p-5 border border-rose-800"
          >
            <View className="flex-row items-center">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-rose-500/20 mr-4">
                <Ionicons name="person-add" size={24} color="#f43f5e" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-semibold text-white">Create an Account</Text>
                <Text className="text-sm text-gray-300 mt-0.5">
                  Sign up to sync your data and unlock all features
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#f43f5e" />
            </View>
          </Pressable>
        )}

        {/* Account Section */}
        {isAuthenticated && (
          <>
            <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Account
            </Text>
            <View className="mb-6 rounded-xl bg-gray-900 p-4 border border-gray-800">
              <Text className="text-sm text-gray-400">Email</Text>
              <Text className="mt-0.5 text-base font-medium text-white">
                {user?.email}
              </Text>
            </View>
          </>
        )}

        {/* Security Section */}
        <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Security
        </Text>
        <View className="mb-6 rounded-xl bg-gray-900 border border-gray-800">
          {biometricType && (
            <View className="flex-row items-center justify-between border-b border-gray-800 p-4">
              <View>
                <Text className="text-base font-medium text-white">
                  {biometricType}
                </Text>
                <Text className="text-sm text-gray-400">
                  Use {biometricType} to unlock the app
                </Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={toggleBiometric}
                trackColor={{ true: '#f43f5e' }}
              />
            </View>
          )}
          <Pressable className="p-4" onPress={logout}>
            <Text className="text-base font-medium text-white">
              {isGuest ? 'Exit Guest Mode' : 'Sign Out'}
            </Text>
          </Pressable>
        </View>

        {/* Notifications Section */}
        <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Notifications
        </Text>
        <View className="mb-6 rounded-xl bg-gray-900 border border-gray-800">
          <Pressable className="p-4" onPress={handleNotificationPreferences}>
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-medium text-white">
                Notification Preferences
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#6b7280" />
            </View>
          </Pressable>
        </View>

        {/* Purchases Section (Guideline 3.1) */}
        <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Purchases
        </Text>
        <View className="mb-6 rounded-xl bg-gray-900 border border-gray-800">
          {isSubscribed ? (
            <View className="flex-row items-center justify-between border-b border-gray-800 p-4">
              <Text className="text-base font-medium text-white">
                Subscription
              </Text>
              <Text className="text-base font-medium text-green-400">
                Premium Active
              </Text>
            </View>
          ) : (
            <Pressable className="border-b border-gray-800 p-4" onPress={handleUpgradePremium}>
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-medium text-white">
                  Subscription
                </Text>
                <View className="flex-row items-center">
                  <Text className="text-base font-medium text-rose-500 mr-1">
                    Upgrade to Premium
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#f43f5e" />
                </View>
              </View>
            </Pressable>
          )}
          <Pressable className="p-4" onPress={handleRestorePurchases}>
            <Text className="text-base font-medium text-rose-500">
              Restore Purchases
            </Text>
          </Pressable>
        </View>

        {/* About Section (Guideline 5.1 -- Privacy Policy) */}
        <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
          About
        </Text>
        <View className="mb-6 rounded-xl bg-gray-900 border border-gray-800">
          <Pressable className="border-b border-gray-800 p-4" onPress={handleOpenPrivacyPolicy}>
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-medium text-white">
                Privacy Policy
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#6b7280" />
            </View>
          </Pressable>
          <Pressable className="border-b border-gray-800 p-4" onPress={handleOpenTerms}>
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-medium text-white">
                Terms of Service
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#6b7280" />
            </View>
          </Pressable>
          <View className="flex-row items-center justify-between p-4">
            <Text className="text-base font-medium text-white">
              Version
            </Text>
            <Text className="text-base text-gray-400">
              {Constants.expoConfig?.version || '1.0.0'}
            </Text>
          </View>
        </View>

        {/* Danger Zone -- Account Deletion (Guideline 5.1.1) */}
        {isAuthenticated && (
          <>
            <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Danger Zone
            </Text>
            <View className="mb-8 rounded-xl bg-red-950/50 border border-red-900">
              <Pressable className="p-4" onPress={confirmDelete}>
                <Text className="text-base font-medium text-red-500">
                  Delete Account
                </Text>
                <Text className="mt-0.5 text-sm text-red-400/70">
                  Permanently remove all your data
                </Text>
              </Pressable>
            </View>
          </>
        )}

        {/* Bottom spacer */}
        <View className="h-8" />
      </ScrollView>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Deletion"
      >
        <Text className="mb-4 text-sm text-gray-400">
          Enter your password to confirm account deletion. This cannot be undone.
        </Text>
        <View className="mb-4">
          <Input
            placeholder="Your password"
            value={deletePassword}
            onChangeText={setDeletePassword}
            secureTextEntry
          />
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setShowDeleteModal(false)}
            />
          </View>
          <View className="flex-1">
            <Button
              title="Delete"
              variant="destructive"
              onPress={handleDeleteAccount}
              isLoading={isDeleting}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
