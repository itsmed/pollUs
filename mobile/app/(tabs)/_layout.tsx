import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  name: string;
  title: string;
  icon: IoniconsName;
  activeIcon: IoniconsName;
}

const TABS: TabConfig[] = [
  { name: 'index', title: 'Bills', icon: 'document-text-outline', activeIcon: 'document-text' },
  { name: 'reps', title: 'Reps', icon: 'people-outline', activeIcon: 'people' },
  { name: 'profile', title: 'Profile', icon: 'person-outline', activeIcon: 'person' },
];

/**
 * Tab navigator with three primary sections: Bills, Reps, and Profile.
 */
export default function TabLayout(): JSX.Element {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: { borderTopWidth: 1, borderTopColor: '#e5e7eb' },
        headerStyle: { backgroundColor: '#ffffff' },
        headerTitleStyle: { fontWeight: '600', color: '#111827' },
      }}
    >
      {TABS.map(({ name, title, icon, activeIcon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? activeIcon : icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
