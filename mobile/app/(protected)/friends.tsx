import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, FlatList, ActivityIndicator, Alert, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { hapticSuccess, hapticError } from '../../lib/haptics';

export default function FriendsScreen() {
  const { user } = useAuth();
  const [allFriends, setAllFriends] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [feelsRes, listRes] = await Promise.all([
        api.get('/feels/friends'),
        api.get('/feels/friends/list'),
      ]);
      setFriends(feelsRes.data);
      setAllFriends(listRes.data);
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    if (!friendEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setSendingRequest(true);
    Keyboard.dismiss();
    try {
      await api.post('/feels/friends/add', { friend_email: friendEmail.trim() });
      hapticSuccess();
      Alert.alert('Success', 'Friend request sent!');
      setFriendEmail('');
      loadData();
    } catch (error: any) {
      hapticError();
      Alert.alert('Error', error.response?.data?.message || 'Failed to send request.');
    } finally {
      setSendingRequest(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-lime-500';
    if (score >= 40) return 'text-yellow-500';
    if (score >= 20) return 'text-orange-500';
    return 'text-red-500';
  };

  const renderFriendItem = ({ item }: { item: any }) => {
    const todayFeel = friends.find((f: any) => f.friend_id === item.id);
    const scoreText = todayFeel ? `${todayFeel.score}/100` : 'No check-in today';
    const scoreColor = todayFeel ? getScoreColor(todayFeel.score) : 'text-gray-400';
    const scoreBg = todayFeel ? 'bg-gray-50' : 'bg-gray-100';

    return (
      <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm flex-row items-center justify-between border border-gray-100">
        <View className="flex-row items-center flex-1">
          <View className="w-12 h-12 rounded-full bg-purple-100 items-center justify-center mr-4">
            <Text className="text-xl font-bold text-purple-600">
              {item.name ? item.name.charAt(0).toUpperCase() : item.email.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900">
              {item.name || item.email}
            </Text>
            <Text className="text-sm text-gray-500">
              {item.name ? item.email : 'Friend'}
            </Text>
          </View>
        </View>
        <View className={`px-3 py-1.5 rounded-full ${scoreBg}`}>
          <Text className={`text-sm font-bold ${scoreColor}`}>
            {scoreText}
          </Text>
        </View>
      </View>
    );
  };

  const EmptyState = () => (
    <View className="flex-1 items-center justify-center pt-20">
      <Ionicons name="people-outline" size={64} color="#9CA3AF" />
      <Text className="text-gray-500 text-base mt-4 text-center px-8">
        No friends yet. Add a friend by email to see how they're feeling!
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-6 pt-6 pb-4">
        <Text className="text-3xl font-bold text-gray-900">Friends</Text>
        <Text className="text-base text-gray-500 mt-1">See how your friends are feeling</Text>
      </View>

      <View className="px-6 mb-6">
        <View className="flex-row items-center bg-white rounded-2xl shadow-sm border border-gray-100 p-2">
          <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={{ marginLeft: 12 }} />
          <TextInput
            placeholder="Add friend by email"
            value={friendEmail}
            onChangeText={setFriendEmail}
            className="flex-1 ml-3 text-base text-gray-900 py-2"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Pressable
            onPress={handleAddFriend}
            disabled={sendingRequest}
            className="bg-purple-600 p-2.5 rounded-xl mr-1 disabled:opacity-50"
          >
            {sendingRequest ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="add" size={20} color="white" />
            )}
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#9333EA" />
        </View>
      ) : (
        <FlatList
          data={allFriends}
          renderItem={renderFriendItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<EmptyState />}
          contentContainerClassName="px-6 pb-24"
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}