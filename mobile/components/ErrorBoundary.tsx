import React, { Component } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App Error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView className="flex-1 bg-gray-950 items-center justify-center px-8">
          <Text className="text-6xl">😰</Text>
          <Text className="text-2xl font-bold text-white mt-6 text-center">
            Something went wrong
          </Text>
          <Text className="text-sm text-gray-400 mt-2 text-center">
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <Pressable
            onPress={() => this.setState({ hasError: false, error: null })}
            className="rounded-2xl px-8 py-4 mt-8"
            style={{ backgroundColor: '#f43f5e' }}
          >
            <Text className="text-white text-lg font-semibold">Try Again</Text>
          </Pressable>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}
