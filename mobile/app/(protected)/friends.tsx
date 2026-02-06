import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, Pressable, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../lib/api';
import Button from '../../components/ui/Button';
import { hapticSuccess, hapticSelection, hapticError } from '../../lib/haptics';
import { GoodVibe, FriendFeel, FriendRequest, VIBE_EMOJIS, VibeType, getColorForScore } from '../../types/feel';

export default function FriendsScreen() {
  const [friends, setFriends] = useState<FriendFeel[]>([]);
  const [vibes, setVibes] = useState<GoodVibe[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showVibeModal, setShowVibeModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<FriendFeel | null>(null);
  const [selectedVibe, setSelectedVibe] = useState<VibeType>('heart');
  const [vibeMessage, setVibeMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [friendsRes, vibesRes, requestsRes] = await Promise.all([
        api.get('/feels/friends'),
        api.get('/feels/vibes?limit=20'),
        api.get('/feels/friends/requests'),
      ]);
      setFriends(friendsRes.data?.data || []);
      setVibes(vibesRes.data?.data || []);
      setRequests(requestsRes.data?.data || []);
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

  const addFriend = async () => {
    if (!friendEmail.trim()) return;
    setIsAdding(true);
    try {
      await api.post('/feels/friends', { friend_email: friendEmail.trim() });
      hapticSuccess();
      setFriendEmail('');
      loadData();
    } catch (error: any) {
      hapticError();
      Alert.alert('Error', error.response?.data?.message || 'Could not send friend request');
    } finally {
      setIsAdding(false);
    }
  };

  const acceptRequest = async (id: string) => {
    try {
      await api.put(`/feels/friends/${id}/accept`);
      hapticSuccess();
      loadData();
    } catch (error: any) {
      hapticError();
      Alert.alert('Error', error.response?.data?.message || 'Could not accept request');
    }
  };

  const declineRequest = async (id: string) => {
    try {
      await api.delete(`/feels/friends/${id}/reject`);
      hapticSelection();
      loadData();
    } catch (error: any) {
      hapticError();
      Alert.alert('Error', error.response?.data?.message || 'Could not decline request');
    }
  };

  const removeFriend = (friend: FriendFeel) => {
    Alert.alert(
      'Remove Friend',
      `Remove ${friend.name} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/feels/friends/${friend.user_id}`);
              hapticSuccess();
              loadData();
            } catch (error: any) {
              hapticError();
              Alert.alert('Error', error.response?.data?.message || 'Could not remove friend');
            }
          },
        },
      ]
    );
  };

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
        onLongPress={() => removeFriend(item)}
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

  const renderRequest = ({ item }: { item: FriendRequest }) => (
    <View className="mx-4 mb-3 rounded-2xl bg-white p-4 shadow-sm">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 mr-3">
          <Text className="text-base font-medium text-gray-900">{item.friend_email}</Text>
          <Text className="text-xs text-gray-400 mt-1">
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        <View className="flex-row">
          <Pressable
            onPress={() => declineRequest(item.id)}
            className="rounded-lg bg-gray-200 px-4 py-2 mr-2"
          >
            <Text className="text-sm font-medium text-gray-700">Decline</Text>
          </Pressable>
          <Pressable
            onPress={() => acceptRequest(item.id)}
            className="rounded-lg bg-green-500 px-4 py-2"
          >
            <Text className="text-sm font-medium text-white">Accept</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-6 pt-8 pb-4">
        <Text className="text-3xl font-bold text-gray-900">Friends</Text>
        <Text className="mt-1 text-base text-gray-500">
          Share good vibes with your circle
        </Text>
      </View>

      <FlatList
        data={vibes}
        renderItem={renderVibe}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <>
            {/* Add Friend Section */}
            <View className="mx-4 mb-6">
              <View className="flex-row items-center">
                <TextInput
                  value={friendEmail}
                  onChangeText={setFriendEmail}
                  placeholder="Friend's email address"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="flex-1 rounded-xl bg-gray-100 px-4 py-3 text-base mr-3"
                />
                <Button
                  title="Add Friend"
                  variant="primary"
                  size="sm"
                  isLoading={isAdding}
                  onPress={addFriend}
                />
              </View>
            </View>

            {/* Friend Requests Section */}
            {requests.length > 0 && (
              <View className="mb-4">
                <View className="flex-row items-center px-6 mb-3">
                  <Text className="text-lg font-semibold text-gray-900">Friend Requests</Text>
                  <View className="ml-2 rounded-full bg-primary-100 px-2 py-0.5">
                    <Text className="text-xs font-semibold text-primary-700">{requests.length}</Text>
                  </View>
                </View>
                <FlatList
                  data={requests}
                  renderItem={renderRequest}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              </View>
            )}

            {/* Friends List Section */}
            {friends.length > 0 && (
              <View className="mb-4">
                <Text className="px-6 text-lg font-semibold text-gray-900 mb-3">Today's Feels</Text>
                <FlatList
                  data={friends}
                  renderItem={renderFriend}
                  keyExtractor={(item) => item.user_id}
                  scrollEnabled={false}
                />
              </View>
            )}

            {/* Empty State */}
            {friends.length === 0 && requests.length === 0 && (
              <View className="items-center justify-center py-10">
                <Text className="text-5xl mb-3">👋</Text>
                <Text className="text-lg font-medium text-gray-500">No friends yet</Text>
                <Text className="text-sm text-gray-400 mt-1">Add friends by email to share vibes!</Text>
              </View>
            )}

            {/* Vibes Section Header */}
            {vibes.length > 0 && (
              <Text className="px-6 text-lg font-semibold text-gray-900 mb-3">Received Vibes</Text>
            )}
          </>
        }
        ListEmptyComponent={
          friends.length > 0 || requests.length > 0 ? (
            <View className="items-center justify-center py-10">
              <Text className="text-5xl mb-3">💜</Text>
              <Text className="text-gray-500">No vibes yet</Text>
              <Text className="text-sm text-gray-400">Send some to friends!</Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      {/* Send Vibe Modal — UNCHANGED */}
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
