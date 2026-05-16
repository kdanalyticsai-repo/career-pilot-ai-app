import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Radius } from '@/constants/theme';

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
      width: 36, height: 26,
    }}>
      <MaterialCommunityIcons
        name={focused && activeName ? activeName : name}
        size={20}
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
        tabBarInactiveTintColor: '#1a1a1a',
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 1,
        },
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
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'CVPilot',
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
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="account-outline" activeName="account" focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
