import React, { useState } from 'react';
import { Alert, Pressable, Text, View, Modal as RNModal, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';
import { hapticSuccess, hapticError, hapticWarning, hapticLight } from '../../lib/haptics';

interface BlockButtonProps {
  userId: string;
  userName?: string;
  onBlocked?: () => void;
  onUnblocked?: () => void;
  isBlocked?: boolean;
}

// Block confirmation with custom modal (2025-2026 trend)
export default function BlockButton({
  userId,
  userName = 'this user',
  onBlocked,
  onUnblocked,
  isBlocked = false,
}: BlockButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const [undoTimeout, setUndoTimeout] = React.useState<NodeJS.Timeout | null>(null);

  const openModal = () => {
    hapticWarning();
    setShowModal(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleBlock = async () => {
    setIsBlocking(true);
    try {
      await api.post('/blocks', { blocked_id: userId });
      hapticSuccess();
      closeModal();
      onBlocked?.();

      // Show undo toast (2025-2026 trend)
      setShowUndo(true);
      const timeout = setTimeout(() => {
        setShowUndo(false);
      }, 5000);
      setUndoTimeout(timeout);
    } catch {
      hapticError();
      Alert.alert('Error', 'Failed to block user. Please try again.');
    } finally {
      setIsBlocking(false);
    }
  };

  const handleUnblock = async () => {
    if (undoTimeout) clearTimeout(undoTimeout);
    try {
      await api.delete(`/blocks/${userId}`);
      hapticSuccess();
      setShowUndo(false);
      onUnblocked?.();
      Alert.alert(
        'Unblocked',
        `${userName} has been unblocked. Their content is now visible.`
      );
    } catch {
      hapticError();
    }
  };

  const closeModal = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setShowModal(false);
    });
  };

  return (
    <>
      <Pressable
        className="flex-row items-center gap-1 p-2 rounded-lg active:bg-gray-800"
        onPress={isBlocked ? undefined : openModal}
      >
        <Ionicons
          name={isBlocked ? 'checkmark-done' : 'ban-outline'}
          size={16}
          color={isBlocked ? '#22c55e' : '#ef4444'}
        />
        <Text className={`text-sm ${isBlocked ? 'text-green-500' : 'text-red-500'}`}>
          {isBlocked ? 'Blocked' : 'Block'}
        </Text>
      </Pressable>

      {/* Block Confirmation Modal */}
      <RNModal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/70"
          onPress={closeModal}
        >
          <Animated.View
            className="mx-6 w-full max-w-sm rounded-2xl bg-gray-900 p-6 border border-gray-800"
            style={{ opacity: fadeAnim }}
            onStartShouldSetResponder={() => true}
          >
            <View className="items-center mb-4">
              <View className="mb-3 h-16 w-16 items-center justify-center rounded-full bg-red-900/30">
                <Ionicons name="ban-outline" size={32} color="#ef4444" />
              </View>
              <Text className="text-xl font-bold text-white">
                Block {userName}?
              </Text>
            </View>

            <Text className="mb-6 text-center text-sm text-gray-400">
              Their content will be immediately hidden from your view. You can unblock them
              anytime from Settings.
            </Text>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Pressable
                  className="rounded-xl border-2 border-gray-700 bg-gray-800 px-4 py-3 items-center"
                  onPress={closeModal}
                >
                  <Text className="font-semibold text-white">Cancel</Text>
                </Pressable>
              </View>
              <View className="flex-1">
                <Pressable
                  className="rounded-xl bg-red-600 px-4 py-3 items-center"
                  onPress={handleBlock}
                  disabled={isBlocking}
                >
                  {isBlocking ? (
                    <Text className="font-semibold text-white">Blocking...</Text>
                  ) : (
                    <Text className="font-semibold text-white">Block</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </Pressable>
      </RNModal>

      {/* Undo Toast (2025-2026 trend) */}
      {showUndo && (
        <View className="absolute bottom-8 left-4 right-4 flex-row items-center justify-between rounded-2xl bg-gray-800 px-4 py-3 border border-gray-700 shadow-lg">
          <View className="flex-row items-center">
            <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
            <Text className="ml-2 text-sm text-white">
              User blocked successfully
            </Text>
          </View>
          <Pressable
            className="ml-4 rounded-lg bg-rose-500 px-3 py-1.5"
            onPress={handleUnblock}
          >
            <Text className="text-sm font-semibold text-white">Undo</Text>
          </Pressable>
        </View>
      )}
    </>
  );
}
