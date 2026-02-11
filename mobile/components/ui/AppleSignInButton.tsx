import React, { useState } from 'react';
import { Platform, View, Text, Pressable, ActivityIndicator } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { hapticError, hapticLight } from '../../lib/haptics';

interface AppleSignInButtonProps {
  onError?: (error: string) => void;
}

export default function AppleSignInButton({ onError }: AppleSignInButtonProps) {
  const { loginWithApple } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleAppleSignIn = async () => {
    if (isLoading) return;

    setIsLoading(true);
    hapticLight();

    try {
      if (Platform.OS === 'ios') {
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });

        if (!credential.identityToken) {
          throw new Error('No identity token received from Apple');
        }

        const fullName = credential.fullName
          ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
          : undefined;

        await loginWithApple(
          credential.identityToken,
          credential.authorizationCode || '',
          fullName,
          credential.email || undefined
        );
      } else {
        // Android fallback - show info about iOS requirement
        // In production, you might implement Google Sign In here
        onError?.('Sign in with Apple is only available on iOS devices. Please use email/password or Google Sign In.');
      }
    } catch (err: any) {
      if (err.code === 'ERR_REQUEST_CANCELED') {
        // User cancelled - not an error
        return;
      }
      hapticError();
      onError?.(err.message || 'Apple Sign In failed');
    } finally {
      setIsLoading(false);
    }
  };

  const isIOS = Platform.OS === 'ios';

  return (
    <View className="mt-4">
      <View className="mb-4 flex-row items-center">
        <View className="h-px flex-1 bg-gray-700" />
        <Text className="mx-4 text-sm text-gray-500">or</Text>
        <View className="h-px flex-1 bg-gray-700" />
      </View>

      {/* iOS: Native Apple Sign In */}
      {isIOS && (
        <Pressable
          className="flex-row items-center justify-center rounded-xl bg-black py-3.5 active:opacity-80"
          onPress={handleAppleSignIn}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <Text className="mr-2 text-lg text-white">{'\uF8FF'}</Text>
              <Text className="text-base font-semibold text-white">
                Sign in with Apple
              </Text>
            </>
          )}
        </Pressable>
      )}

      {/* Android: Fallback button (shows as disabled/info) */}
      {!isIOS && (
        <Pressable
          className="flex-row items-center justify-center rounded-xl bg-gray-800 py-3.5 border border-gray-700"
          onPress={() => {
            hapticLight();
            onError?.('Sign in with Apple is only available on iOS devices. Please use email/password to continue.');
          }}
        >
          <View className="mr-3 h-5 w-5 items-center justify-center rounded-full bg-gray-700">
            <Text className="text-xs text-gray-400">?</Text>
          </View>
          <Text className="text-base font-semibold text-gray-400">
            Sign in with Apple (iOS only)
          </Text>
          <Ionicons name="information-circle-outline" size={18} color="#6b7280" style={{ marginLeft: 8 }} />
        </Pressable>
      )}

      {/* Optional: Add Google Sign In for Android here */}
    </View>
  );
}
