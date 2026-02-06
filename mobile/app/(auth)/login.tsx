import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, Pressable, Alert } from 'react-native';
import { Link, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import AppleSignInButton from '../../components/ui/AppleSignInButton';
import { hapticLight } from '../../lib/haptics';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setError('');
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Login failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    hapticLight();
    await SecureStore.setItemAsync('onboarding_complete', 'true');
    await SecureStore.setItemAsync('guest_uses', '0');
    router.replace('/(protected)/home');
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 justify-center px-8">
        <View className="items-center mb-6">
          <Text className="text-6xl">💜</Text>
          <Text className="text-2xl font-bold text-primary-600">Feelsy</Text>
        </View>
        <Text className="mb-2 text-3xl font-bold text-gray-900">
          Welcome back
        </Text>
        <Text className="mb-8 text-base text-gray-500">
          Check in with your feelings
        </Text>

        {error ? (
          <View className="mb-4 rounded-lg bg-red-50 p-3">
            <Text className="text-sm text-red-600">{error}</Text>
          </View>
        ) : null}

        <View className="mb-4">
          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
        </View>

        <View className="mb-6">
          <Input
            label="Password"
            placeholder="Your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
          />
        </View>

        <Pressable
          onPress={() => {
            hapticLight();
            Alert.alert(
              'Reset Password',
              'Contact support@feelsy.app to reset your password.'
            );
          }}
        >
          <Text className="text-right text-sm text-primary-600 mb-4">
            Forgot Password?
          </Text>
        </Pressable>

        <Button
          title="Sign In"
          onPress={handleLogin}
          isLoading={isLoading}
          size="lg"
        />

        {/* Sign in with Apple — equal visual prominence (Guideline 4.8) */}
        <AppleSignInButton onError={(msg) => setError(msg)} />

        <View className="mt-6 flex-row items-center justify-center">
          <Text className="text-gray-500">Don't have an account? </Text>
          <Link href="/(auth)/register" asChild>
            <Text className="font-semibold text-primary-600">Sign Up</Text>
          </Link>
        </View>

        <Pressable onPress={handleSkip} className="mt-4">
          <Text className="text-sm text-gray-400 text-center">
            Skip for now
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
