import React, { useState } from 'react';
import { Alert, Pressable, Text, View, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';
import { hapticSuccess, hapticError, hapticSelection } from '../../lib/haptics';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';

interface ReportButtonProps {
  contentType: 'user' | 'post' | 'comment';
  contentId: string;
}

// Report categories (2025-2026 trend: quick selection chips)
const REPORT_CATEGORIES = [
  { id: 'spam', label: 'Spam or misleading', icon: 'warning-outline' },
  { id: 'harassment', label: 'Harassment', icon: 'person-outline' },
  { id: 'hate', label: 'Hate speech', icon: 'alert-circle-outline' },
  { id: 'explicit', label: 'Explicit content', icon: 'eye-off-outline' },
  { id: 'violence', label: 'Violence', icon: 'flash-outline' },
  { id: 'misinfo', label: 'False information', icon: 'information-circle-outline' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

// Report button (Apple Guideline 1.2 — every piece of UGC must have one)
export default function ReportButton({
  contentType,
  contentId,
}: ReportButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomReason, setShowCustomReason] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const openModal = () => {
    hapticSelection();
    setShowModal(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleReport = async () => {
    if (!selectedCategory) {
      hapticError();
      Alert.alert('Select a Category', 'Please select a reason for your report.');
      return;
    }

    setIsSubmitting(true);
    try {
      const reportReason = showCustomReason && reason.trim()
        ? `${REPORT_CATEGORIES.find(c => c.id === selectedCategory)?.label}: ${reason}`
        : REPORT_CATEGORIES.find(c => c.id === selectedCategory)?.label || selectedCategory;

      await api.post('/reports', {
        content_type: contentType,
        content_id: contentId,
        reason: reportReason,
      });
      hapticSuccess();
      closeModal();
      Alert.alert(
        'Report Submitted',
        'Thank you for helping keep our community safe. We will review this within 24 hours.',
      );
    } catch {
      hapticError();
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setShowModal(false);
      setSelectedCategory(null);
      setReason('');
      setShowCustomReason(false);
    });
  };

  const handleCategorySelect = (categoryId: string) => {
    hapticSelection();
    if (categoryId === 'other') {
      setShowCustomReason(true);
    } else {
      setShowCustomReason(false);
    }
    setSelectedCategory(categoryId);
  };

  return (
    <>
      <Pressable
        className="flex-row items-center gap-1 p-2 rounded-lg active:bg-gray-800"
        onPress={openModal}
      >
        <Ionicons name="flag-outline" size={16} color="#ef4444" />
        <Text className="text-sm text-red-500">Report</Text>
      </Pressable>

      <Modal
        visible={showModal}
        onClose={closeModal}
        title="Report Content"
        size="lg"
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text className="mb-4 text-sm text-gray-400">
            Tell us why you are reporting this {contentType}. Our team reviews all
            reports within 24 hours.
          </Text>

          {/* Quick Category Selection (2025-2026 trend) */}
          <Text className="mb-3 text-sm font-medium text-white">
            Select a reason
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4"
            contentContainerStyle={{ gap: 8, paddingRight: 16 }}
          >
            {REPORT_CATEGORIES.map((category) => (
              <Pressable
                key={category.id}
                onPress={() => handleCategorySelect(category.id)}
                className={`flex-row items-center gap-2 rounded-full border px-4 py-2 ${
                  selectedCategory === category.id
                    ? 'border-rose-500 bg-rose-500/20'
                    : 'border-gray-700 bg-gray-800'
                }`}
              >
                <Ionicons
                  name={category.icon as any}
                  size={16}
                  color={selectedCategory === category.id ? '#f43f5e' : '#9ca3af'}
                />
                <Text
                  className={`text-sm font-medium ${
                    selectedCategory === category.id ? 'text-rose-500' : 'text-gray-300'
                  }`}
                >
                  {category.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Custom reason input for "Other" category */}
          {showCustomReason && (
            <View className="mb-4">
              <Input
                label="Additional details (optional)"
                placeholder="Describe the issue..."
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={3}
                showCharCount
                maxLength={500}
              />
            </View>
          )}

          {/* Submit Actions */}
          <View className="flex-row gap-3 mt-6">
            <View className="flex-1">
              <Button
                title="Cancel"
                variant="outline"
                onPress={closeModal}
                size="md"
              />
            </View>
            <View className="flex-1">
              <Button
                title="Submit Report"
                variant="destructive"
                onPress={handleReport}
                isLoading={isSubmitting}
                size="md"
              />
            </View>
          </View>
        </Animated.View>
      </Modal>
    </>
  );
}
