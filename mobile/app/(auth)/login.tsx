import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, Pressable, Alert } from 'react-native';
import { Link, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import AppleSignInButton from '../../components/ui/AppleSignInButton';
import { hapticLight } from '../../lib/haptics';

export default function LoginScreen() {
  const { login, continueAsGuest } = useAuth();
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

  const handleTryWithoutAccount = async () => {
    hapticLight();
    await AsyncStorage.setItem('onboarding_complete', 'true');
    await continueAsGuest();
    router.replace('/(protected)/home');
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-950"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 justify-center px-8">
        <View className="items-center mb-6">
          <Text className="text-6xl">💗</Text>
          <Text className="text-2xl font-bold text-rose-500">Feelsy</Text>
        </View>
        <Text className="mb-2 text-3xl font-bold text-white">
          Welcome back
        </Text>
        <Text className="mb-8 text-base text-gray-400">
          Check in with your feelings
        </Text>

        {error ? (
          <View className="mb-4 rounded-lg bg-red-900/40 p-3 border border-red-800">
            <Text className="text-sm text-red-400">{error}</Text>
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
          <Text className="text-right text-sm text-rose-500 mb-4">
            Forgot Password?
          </Text>
        </Pressable>

        <Button
          title="Sign In"
          onPress={handleLogin}
          isLoading={isLoading}
          size="lg"
        />

        {/* Sign in with Apple -- equal visual prominence (Guideline 4.8) */}
        <AppleSignInButton onError={(msg) => setError(msg)} />

        <View className="mt-6 flex-row items-center justify-center">
          <Text className="text-gray-400">Don't have an account? </Text>
          <Link href="/(auth)/register" asChild>
            <Text className="font-semibold text-rose-500">Sign Up</Text>
          </Link>
        </View>

        <Pressable onPress={handleTryWithoutAccount} className="mt-4">
          <Text className="text-sm text-gray-500 text-center">
            Try Without Account
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
