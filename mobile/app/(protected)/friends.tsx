import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, Pressable, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../lib/api';
import Button from '../../components/ui/Button';
import { hapticSuccess, hapticSelection } from '../../lib/haptics';
import { GoodVibe, FriendFeel, VIBE_EMOJIS, VibeType, getColorForScore } from '../../types/feel';

export default function FriendsScreen() {
  const [friends, setFriends] = useState<FriendFeel[]>([]);
  const [vibes, setVibes] = useState<GoodVibe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showVibeModal, setShowVibeModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<FriendFeel | null>(null);
  const [selectedVibe, setSelectedVibe] = useState<VibeType>('heart');
  const [vibeMessage, setVibeMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [friendsRes, vibesRes] = await Promise.all([
        api.get('/feels/friends'),
        api.get('/feels/vibes?limit=20'),
      ]);
      setFriends(friendsRes.data?.data || []);
      setVibes(vibesRes.data?.data || []);
    } catch (error) {
      console.log('Error loading data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData();
  }, []);

  const openVibeModal = (friend: FriendFeel) => {
    setSelectedFriend(friend);
    setShowVibeModal(true);
    hapticSelection();
  };

  const sendVibe = async () => {
    if (!selectedFriend) return;
    setIsSending(true);
    try {
      await api.post('/feels/vibe', {
        receiver_id: selectedFriend.user_id,
        message: vibeMessage,
        vibe_type: selectedVibe,
      });
      hapticSuccess();
      setShowVibeModal(false);
      setVibeMessage('');
      setSelectedVibe('heart');
    } catch (error: any) {
      console.log('Send vibe error:', error.response?.data?.message || error.message);
    } finally {
      setIsSending(false);
    }
  };

  const renderFriend = ({ item }: { item: FriendFeel }) => {
    const color = getColorForScore(item.feel_score);
    return (
      <Pressable
        onPress={() => openVibeModal(item)}
        className="mx-4 mb-3 rounded-2xl bg-white p-4 shadow-sm active:opacity-70"
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View
              className="h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: color + '20' }}
            >
              <Text className="text-xl">{item.mood_emoji || '😊'}</Text>
            </View>
            <View className="ml-3">
              <Text className="text-lg font-semibold text-gray-900">{item.name}</Text>
              <Text className="text-sm text-gray-500">Tap to send vibes</Text>
            </View>
          </View>
          <View className="items-center">
            <Text className="text-xl font-bold" style={{ color }}>{item.feel_score}</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderVibe = ({ item }: { item: GoodVibe }) => (
    <View className="mx-4 mb-3 rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 bg-white p-4 shadow-sm">
      <View className="flex-row items-center">
        <Text className="text-3xl mr-3">{VIBE_EMOJIS[item.vibe_type as VibeType] || '💜'}</Text>
        <View className="flex-1">
          <Text className="text-base font-medium text-gray-900">
            {item.sender_name || 'A friend'} sent you good vibes!
          </Text>
          {item.message && (
            <Text className="text-sm text-gray-600 mt-1">"{item.message}"</Text>
          )}
          <Text className="text-xs text-gray-400 mt-1">
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-6 pt-8 pb-4">
        <Text className="text-3xl font-bold text-gray-900">Friends</Text>
        <Text className="mt-1 text-base text-gray-500">
          Share good vibes with your circle
        </Text>
      </View>

      {/* Friends Section */}
      {friends.length > 0 && (
        <View className="mb-4">
          <Text className="px-6 text-lg font-semibold text-gray-900 mb-3">Today's Feels</Text>
          <FlatList
            data={friends}
            renderItem={renderFriend}
            keyExtractor={(item) => item.user_id}
            horizontal={false}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Vibes Section */}
      <Text className="px-6 text-lg font-semibold text-gray-900 mb-3">Received Vibes</Text>
      <FlatList
        data={vibes}
        renderItem={renderVibe}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center justify-center py-10">
              <Text className="text-5xl mb-3">💜</Text>
              <Text className="text-gray-500">No vibes yet</Text>
              <Text className="text-sm text-gray-400">Send some to friends!</Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      {/* Send Vibe Modal */}
      <Modal
        visible={showVibeModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowVibeModal(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="px-6 pt-6">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-2xl font-bold text-gray-900">Send Good Vibes</Text>
              <Pressable onPress={() => setShowVibeModal(false)}>
                <Text className="text-primary-600 text-lg">Cancel</Text>
              </Pressable>
            </View>

            {selectedFriend && (
              <View className="items-center mb-8">
                <View
                  className="h-20 w-20 items-center justify-center rounded-full mb-3"
                  style={{ backgroundColor: getColorForScore(selectedFriend.feel_score) + '20' }}
                >
                  <Text className="text-4xl">{selectedFriend.mood_emoji || '😊'}</Text>
                </View>
                <Text className="text-xl font-semibold text-gray-900">{selectedFriend.name}</Text>
              </View>
            )}

            {/* Vibe Type Selector */}
            <Text className="text-base font-medium text-gray-700 mb-3">Choose a vibe</Text>
            <View className="flex-row justify-around mb-6">
              {(Object.keys(VIBE_EMOJIS) as VibeType[]).map((type) => (
                <Pressable
                  key={type}
                  onPress={() => { setSelectedVibe(type); hapticSelection(); }}
                  className={`w-16 h-16 items-center justify-center rounded-2xl ${
                    selectedVibe === type ? 'bg-primary-100 border-2 border-primary-500' : 'bg-gray-100'
                  }`}
                >
                  <Text className="text-3xl">{VIBE_EMOJIS[type]}</Text>
                </Pressable>
              ))}
            </View>

            {/* Message Input */}
            <Text className="text-base font-medium text-gray-700 mb-2">Add a message (optional)</Text>
            <TextInput
              value={vibeMessage}
              onChangeText={setVibeMessage}
              placeholder="You got this!"
              className="bg-gray-100 rounded-xl px-4 py-3 text-base mb-6"
              multiline
              numberOfLines={2}
            />

            <Button
              title={`Send ${VIBE_EMOJIS[selectedVibe]} to ${selectedFriend?.name || 'Friend'}`}
              onPress={sendVibe}
              isLoading={isSending}
              size="lg"
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
