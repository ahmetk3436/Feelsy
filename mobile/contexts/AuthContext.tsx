import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../lib/api';
import {
  setTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
} from '../lib/storage';
import { hapticSuccess, hapticError } from '../lib/haptics';
import type { User, AuthResponse } from '../types/auth';

const GUEST_MODE_KEY = 'feelsy_guest_mode';
const GUEST_USAGE_KEY = 'feelsy_guest_usage';
const MAX_FREE_USES = 3;

interface AuthContextType {
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  user: User | null;
  guestUsageCount: number;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  loginWithApple: (identityToken: string, authCode: string, fullName?: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (password?: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  canUseFeature: () => boolean;
  incrementGuestUsage: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [guestUsageCount, setGuestUsageCount] = useState(0);

  const isAuthenticated = user !== null;

  // Restore session on mount
  useEffect(() => {
    const restore = async () => {
      try {
        const token = await getAccessToken();
        if (token) {
          const { data } = await api.get('/health');
          if (data.status === 'ok') {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setUser({ id: payload.sub, email: payload.email });
          }
        } else {
          // Check guest state from AsyncStorage
          const guestMode = await AsyncStorage.getItem(GUEST_MODE_KEY);
          if (guestMode === 'true') {
            setIsGuest(true);
            const usageStr = await AsyncStorage.getItem(GUEST_USAGE_KEY);
            setGuestUsageCount(usageStr ? parseInt(usageStr, 10) : 0);
          }
        }
      } catch {
        await clearTokens();
      } finally {
        setIsLoading(false);
      }
    };
    restore();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data } = await api.post<AuthResponse>('/auth/login', {
        email,
        password,
      });
      await setTokens(data.access_token, data.refresh_token);
      setUser(data.user);
      setIsGuest(false);
      await AsyncStorage.removeItem(GUEST_MODE_KEY);
      await AsyncStorage.removeItem(GUEST_USAGE_KEY);
      hapticSuccess();
    } catch (err) {
      hapticError();
      throw err;
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    try {
      const { data } = await api.post<AuthResponse>('/auth/register', {
        email,
        password,
      });
      await setTokens(data.access_token, data.refresh_token);
      setUser(data.user);
      setIsGuest(false);
      await AsyncStorage.removeItem(GUEST_MODE_KEY);
      await AsyncStorage.removeItem(GUEST_USAGE_KEY);
      hapticSuccess();
    } catch (err) {
      hapticError();
      throw err;
    }
  }, []);

  // Sign in with Apple (Guideline 4.8)
  const loginWithApple = useCallback(
    async (identityToken: string, authCode: string, fullName?: string, email?: string) => {
      try {
        const { data } = await api.post<AuthResponse>('/auth/apple', {
          identity_token: identityToken,
          authorization_code: authCode,
          full_name: fullName,
          email,
        });
        await setTokens(data.access_token, data.refresh_token);
        setUser(data.user);
        setIsGuest(false);
        await AsyncStorage.removeItem(GUEST_MODE_KEY);
        await AsyncStorage.removeItem(GUEST_USAGE_KEY);
        hapticSuccess();
      } catch (err) {
        hapticError();
        throw err;
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      }
    } catch {
      // Ignore logout API errors
    } finally {
      await clearTokens();
      setUser(null);
      setIsGuest(false);
      await AsyncStorage.removeItem(GUEST_MODE_KEY);
      await AsyncStorage.removeItem(GUEST_USAGE_KEY);
    }
  }, []);

  // Account deletion (Guideline 5.1.1)
  const deleteAccount = useCallback(
    async (password?: string) => {
      await api.delete('/auth/account', {
        data: { password: password || '' },
      });
      await clearTokens();
      setUser(null);
      setIsGuest(false);
      hapticSuccess();
    },
    []
  );

  const continueAsGuest = useCallback(async () => {
    await AsyncStorage.setItem(GUEST_MODE_KEY, 'true');
    await AsyncStorage.setItem(GUEST_USAGE_KEY, '0');
    setIsGuest(true);
    setGuestUsageCount(0);
    hapticSuccess();
  }, []);

  const canUseFeature = useCallback(() => {
    if (isAuthenticated) return true;
    return guestUsageCount < MAX_FREE_USES;
  }, [isAuthenticated, guestUsageCount]);

  const incrementGuestUsage = useCallback(async () => {
    if (isAuthenticated) return;
    const newCount = guestUsageCount + 1;
    setGuestUsageCount(newCount);
    await AsyncStorage.setItem(GUEST_USAGE_KEY, String(newCount));
  }, [isAuthenticated, guestUsageCount]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isGuest,
        isLoading,
        user,
        guestUsageCount,
        login,
        register,
        loginWithApple,
        logout,
        deleteAccount,
        continueAsGuest,
        canUseFeature,
        incrementGuestUsage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
