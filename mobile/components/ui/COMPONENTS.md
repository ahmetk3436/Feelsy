# Feelsy Mobile UI Components

## Overview

This directory contains all reusable UI components for the Feelsy mobile app, designed according to 2025-2026 design trends and iOS App Store guidelines.

## Component Library

### Button (`Button.tsx`)

Enhanced button component with modern styling and haptic feedback.

**Features:**
- 5 variants: `primary`, `secondary`, `outline`, `destructive`, `gradient`
- 4 sizes: `sm`, `md`, `lg`, `xl`
- Gradient variant with AI Gradient Haze (purple→pink→rose)
- Left/right icon support
- Loading state with shimmer
- Press animation with haptic feedback
- Full width option

**Usage:**
```tsx
import { Button } from '@/components/ui';

<Button
  title="Continue"
  variant="gradient"
  size="lg"
  fullWidth
  onPress={handlePress}
  leftIcon={<Icon />}
/>
```

### Input (`Input.tsx`)

Enhanced text input with validation states.

**Features:**
- Password visibility toggle
- Character count with warning threshold
- Required field indicator
- Focus and error states
- Custom error messages with icons
- Haptic feedback on focus

**Usage:**
```tsx
import { Input } from '@/components/ui';

<Input
  label="Password"
  isPassword
  showCharCount
  maxLength={50}
  error={errorMessage}
  value={password}
  onChangeText={setPassword}
/>
```

### Modal (`Modal.tsx`)

Modern modal with backdrop blur and animations.

**Features:**
- 4 sizes: `sm`, `md`, `lg`, `full`
- Backdrop blur effect (Glassmorphism)
- Smooth fade animations
- Scrollable content
- Custom close button
- Haptic feedback

**Usage:**
```tsx
import { Modal } from '@/components/ui';

<Modal
  visible={showModal}
  onClose={() => setShowModal(false)}
  title="Settings"
  size="lg"
  enableBackdropBlur
>
  <Content />
</Modal>
```

### AppleSignInButton (`AppleSignInButton.tsx`)

Apple Sign In integration with Android fallback.

**Features:**
- Native iOS Apple Authentication
- Android fallback with info message
- Loading state
- Error handling
- Haptic feedback

**Usage:**
```tsx
import { AppleSignInButton } from '@/components/ui';

<AppleSignInButton
  onError={(error) => setError(error)}
/>
```

### ReportButton (`ReportButton.tsx`)

Content reporting with quick category selection (Apple Guideline 1.2 compliance).

**Features:**
- 7 report categories with icons
- Horizontal scrolling chips
- Custom reason input for "Other"
- Character limit indicator
- Fade animations
- Success confirmation

**Usage:**
```tsx
import { ReportButton } from '@/components/ui';

<ReportButton
  contentType="post"
  contentId={postId}
/>
```

### BlockButton (`BlockButton.tsx`)

User blocking with custom confirmation and undo toast.

**Features:**
- Custom block confirmation modal
- Undo action (5-second window)
- Blocked state display
- Haptic feedback
- Success animations

**Usage:**
```tsx
import { BlockButton } from '@/components/ui';

<BlockButton
  userId={userId}
  userName={userName}
  isBlocked={blocked}
  onBlocked={() => refreshData()}
  onUnblocked={() => refreshData()}
/>
```

### ShareableResult (`ShareableResult.tsx`)

**NEW:** Viral share card component (Spotify Wrapped pattern).

**Features:**
- Instagram Story dimensions (9:16)
- Gradient backgrounds
- Glassmorphism overlay
- Custom watermark
- Stats display
- User attribution
- Direct sharing to apps

**Usage:**
```tsx
import { ShareableResult } from '@/components/ui';

<ShareableResult
  title="Your aura is"
  result="VIOLET"
  subtitle="Creative & Intuitive"
  emoji="🔮"
  userName="@username"
  gradientColors={['#6366f1', '#ec4899', '#8b5cf6']}
  onShare={() => analytics.track('share')}
/>
```

### CTABanner (`CTABanner.tsx`)

**NEW:** Contextual paywall/CTA banner (2025-2026 trend).

**Features:**
- 3 variants: `primary`, `gradient`, `glass`
- Icon support
- Dismissible with callback
- Value-gated upgrade prompts
- Haptic feedback

**Usage:**
```tsx
import { CTABanner } from '@/components/ui';

<CTABanner
  title="Unlock Premium"
  description="Get unlimited access and advanced insights"
  icon="diamond-outline"
  ctaText="Upgrade Now"
  onPress={() => navigation.push('paywall')}
  onDismiss={() => setDismissed(true)}
/>
```

### FeatureCard (`FeatureCard.tsx`)

**NEW:** Bento box grid component (2025-2026 trend).

**Features:**
- 3 variants: `default`, `premium`, `new`
- 3 sizes: `sm`, `md`, `lg`
- Premium lock badge
- NEW badge
- Custom gradients
- Press animations
- Disabled state

**Usage:**
```tsx
import { FeatureCard } from '@/components/ui';

<View className="flex-row flex-wrap">
  <FeatureCard
    title="Journal"
    description="Track your thoughts"
    icon="book-outline"
    onPress={() => navigation.push('journal')}
  />
  <FeatureCard
    title="Insights"
    description="AI-powered analysis"
    icon="bulb-outline"
    variant="premium"
    onPress={() => showPaywall()}
  />
</View>
```

### UsageBadge (`UsageBadge.tsx`)

**NEW:** Gamified usage counter for retention.

**Features:**
- Visual progress indicator
- Warning state (80%+)
- Critical state (100%)
- Color-coded dots
- Custom labels
- 3 sizes: `sm`, `md`, `lg`

**Usage:**
```tsx
import { UsageBadge } from '@/components/ui';

<UsageBadge
  current={2}
  max={3}
  label="daily uses left"
  showWarning
  size="md"
/>
```

### GradientCard (`GradientCard.tsx`)

**NEW:** Glassmorphism card with gradient backgrounds.

**Features:**
- 3 variants: `default`, `glass`, `neon`
- 6 preset gradients
- BlurView integration
- Pressable support
- Custom intensity

**Usage:**
```tsx
import { GradientCard } from '@/components/ui';

<GradientCard
  variant="glass"
  intensity={40}
  onPress={handlePress}
>
  <Text>Your content here</Text>
</GradientCard>
```

## Design System

### Colors

| Color | Hex | Usage |
|--------|-----|-------|
| Primary (Rose) | #f43f5e | Main CTAs, highlights |
| Gradient Start | #6366f1 | AI Gradient Haze |
| Gradient Middle | #ec4899 | Gradient midpoint |
| Gradient End | #f43f5e | Gradient end |
| Success | #22c55e | Positive states |
| Warning | #f59e0b | Cautionary states |
| Error | #ef4444 | Error states |
| Background | #030712 | OLED-optimized black |

### Typography

| Scale | Size | Usage |
|-------|------|-------|
| Display | 40-56px | Hero text, results |
| Heading 1 | 32-40px | Screen titles |
| Heading 2 | 24-28px | Section titles |
| Heading 3 | 20-22px | Card titles |
| Body | 16-17px | Readable content |
| Caption | 13-14px | Secondary info |
| Overline | 11-12px | Uppercase labels |

### Border Radius

- Cards: 24px (large, friendly)
- Buttons: 12-16px (or fully rounded)
- Inputs: 12px
- Modals: 24px
- Bottom Sheets: 24px

### Spacing

- xs: 4px
- sm: 8px
- md: 12px
- lg: 16px
- xl: 24px
- 2xl: 32px

## 2025-2026 Trends Applied

1. **AI Gradient Haze:** Purple→Pink gradients throughout
2. **Glassmorphism:** BlurView overlays on modals and cards
3. **Gamification:** UsageBadge, streak counters, achievements
4. **Micro-Interactions:** Haptic feedback on all taps
5. **Bento Box Grids:** Modular FeatureCard layout
6. **Contextual Paywalls:** Value-gated CTAs
7. **Dark Mode First:** OLED-friendly background colors
8. **Shareable Outputs:** Instagram Story-optimized cards
9. **Quick Actions:** Chip-based category selection
10. **Undo Toasts:** 5-second undo window for actions

## iOS Compliance

| Guideline | Implementation |
|------------|----------------|
| 4.8 - Sign in with Apple | AppleSignInButton.tsx |
| 5.1.1 - Account Deletion | Settings screen with password confirmation |
| 1.2 - UGC Reporting | ReportButton.tsx with categories |
| 1.2 - Content Blocking | BlockButton.tsx with undo |
| 4.2 - Haptic Feedback | All components use expo-haptics |
| 3.1 - IAP Required | Paywall with restore purchases |

## Dependencies

Required for all components:
- `expo-linear-gradient` - Gradient backgrounds
- `expo-blur` - BlurView for glassmorphism
- `expo-haptics` - Haptic feedback
- `@expo/vector-icons` - Ionicons
- `react-native-view-shot` - Share card capture

## Contributing

When adding new components:
1. Follow existing naming conventions
2. Support dark mode (OLED-friendly)
3. Include haptic feedback
4. Add accessibility labels
5. Support 3-4 size variants
6. Document in this file
