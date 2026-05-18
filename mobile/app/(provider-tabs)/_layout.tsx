import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Radius } from '@/constants/theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function TabIcon({ name, activeName, focused, color }: {
  name: IconName; activeName?: IconName; focused: boolean; color: string;
}) {
  return (
    <View style={{
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: focused ? Colors.primary + '18' : 'transparent',
      borderRadius: Radius.full, width: 36, height: 26,
    }}>
      <MaterialCommunityIcons name={focused && activeName ? activeName : name} size={20} color={color} />
    </View>
  );
}

export default function ProviderTabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: '#1a1a1a',
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 1 },
        tabBarItemStyle: { paddingHorizontal: 0, paddingVertical: 0 },
        headerStyle: {
          backgroundColor: Colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        },
        headerTintColor: Colors.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontSize: 18, fontWeight: '700', color: Colors.text },
      }}
    >
      <Tabs.Screen
        name="listings"
        options={{
          title: 'My Jobs',
          headerTitle: 'My Listings',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="briefcase-outline" activeName="briefcase" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: 'Post Job',
          headerTitle: 'Post a Job',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="plus-circle-outline" activeName="plus-circle" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="account-outline" activeName="account" focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
