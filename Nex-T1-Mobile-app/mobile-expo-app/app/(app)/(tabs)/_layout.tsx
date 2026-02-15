import { View, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MessageSquare,
  Wallet,
  TrendingUp,
  Bot,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react-native';

import { useOnboardingGate } from '@application/hooks/use-onboarding-gate';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TAB_BAR_HEIGHT = 60;
const ACTIVE_COLOR = '#38bdf8';
const INACTIVE_COLOR = '#7C7C7C';

// ---------------------------------------------------------------------------
// Tab bar icon helper
// ---------------------------------------------------------------------------

interface TabIconProps {
  focused: boolean;
  Icon: LucideIcon;
}

function TabIcon({ focused, Icon }: TabIconProps) {
  return (
    <View className="items-center justify-center">
      <Icon size={24} color={focused ? ACTIVE_COLOR : INACTIVE_COLOR} />
      {focused ? (
        <View className="w-1 h-1 rounded-full bg-brand mt-1" />
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Bottom tab navigator
// ---------------------------------------------------------------------------

export default function TabsLayout() {
  const { isChecking, isOnboarded } = useOnboardingGate();
  const insets = useSafeAreaInsets();

  // Show nothing while checking onboarding status
  if (isChecking) {
    return null;
  }

  // If not onboarded, the hook already redirected — render nothing
  if (!isOnboarded) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#1A1A1A',
          borderTopWidth: 1,
          borderTopColor: '#252525',
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          elevation: 0, // Remove Android shadow
          ...Platform.select({
            ios: {
              shadowColor: 'transparent',
            },
          }),
        },
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
      }}
    >
      <Tabs.Screen
        name="chat"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} Icon={MessageSquare} />
          ),
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} Icon={Wallet} />
          ),
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} Icon={TrendingUp} />
          ),
        }}
      />
      <Tabs.Screen
        name="agents"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} Icon={Bot} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} Icon={MoreHorizontal} />
          ),
        }}
      />
    </Tabs>
  );
}
