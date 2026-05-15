import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 4,
        },
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.text,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} />,
          headerTitle: 'CVPilot',
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color }) => <TabIcon emoji="💼" color={color} />,
        }}
      />
      <Tabs.Screen
        name="resume"
        options={{
          title: 'Resume',
          tabBarIcon: ({ color }) => <TabIcon emoji="📄" color={color} />,
        }}
      />
      <Tabs.Screen
        name="applications"
        options={{
          title: 'Applied',
          tabBarIcon: ({ color }) => <TabIcon emoji="📋" color={color} />,
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: 'Coach',
          tabBarIcon: ({ color }) => <TabIcon emoji="🤖" color={color} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color }) => <TabIcon emoji="📊" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return <TabIconText emoji={emoji} />;
}

import { Text } from 'react-native';
function TabIconText({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}
