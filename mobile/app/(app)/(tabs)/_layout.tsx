import { Tabs } from 'expo-router'
import { TabBarButton } from '../../../src/components/TabBarButton'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1.5,
          borderTopColor: '#7C6A5B',
          borderStyle: 'dashed',
          height: 56,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ tabBarButton: (props) => <TabBarButton {...props} label="Beranda" /> }}
      />
      <Tabs.Screen
        name="transactions"
        options={{ tabBarButton: (props) => <TabBarButton {...props} label="Transaksi" /> }}
      />
      <Tabs.Screen
        name="budgets"
        options={{ tabBarButton: (props) => <TabBarButton {...props} label="Anggaran" /> }}
      />
      <Tabs.Screen
        name="reports"
        options={{ tabBarButton: (props) => <TabBarButton {...props} label="Laporan" /> }}
      />
      <Tabs.Screen
        name="more"
        options={{ tabBarButton: (props) => <TabBarButton {...props} label="Lainnya" /> }}
      />
    </Tabs>
  )
}
