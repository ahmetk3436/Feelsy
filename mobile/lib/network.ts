import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import api from './api';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  const checkConnectivity = useCallback(async () => {
    setIsChecking(true);
    try {
      await api.get('/health');
      setIsOnline(true);
    } catch {
      setIsOnline(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkConnectivity();

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        checkConnectivity();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Retry every 30 seconds when offline
    const interval = setInterval(() => {
      if (!isOnline) {
        checkConnectivity();
      }
    }, 30000);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [checkConnectivity, isOnline]);

  return { isOnline, isChecking };
}
