import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Radius, HeroColors } from '@/constants/theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function TabIcon({ name, activeName, focused, color }: {
  name: IconName;
  activeName?: IconName;
  focused: boolean;
  color: string;
}) {
  return (
    <View style={{
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: focused ? Colors.primary + '18' : 'transparent',
      borderRadius: Radius.full,
      width: 38, height: 28,
    }}>
      <MaterialCommunityIcons
        name={focused && activeName ? activeName : name}
        size={21}
        color={color}
      />
    </View>
  );
}

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
          borderTopWidth: 1,
          height: 62 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 1,
          letterSpacing: 0.2,
        },
        tabBarItemStyle: { paddingHorizontal: 0, paddingVertical: 0 },
        headerStyle: {
          backgroundColor: HeroColors.base,
          borderBottomWidth: 0,
        },
        headerTintColor: Colors.textInverse,
        headerShadowVisible: false,
        headerTitleStyle: {
          fontSize: 18, fontWeight: '700',
          color: Colors.textInverse,
          letterSpacing: -0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'CVProAI',
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="home-outline" activeName="home" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="briefcase-outline" activeName="briefcase" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="resume"
        options={{
          title: 'CV',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="file-document-outline" activeName="file-document" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="applications"
        options={{
          title: 'Apply',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="clipboard-list-outline" activeName="clipboard-list" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: 'Coach',
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="robot-outline" activeName="robot" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Stats',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="chart-line" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="account-outline" activeName="account" focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
