import { Tabs } from 'expo-router'
import { TabBar } from '../../components/TabBar'

/**
 * The 5 tabs. Order is fixed: Beranda, Transaksi, Anggaran, Laporan, Lainnya.
 *
 * The 8 detail screens live OUTSIDE this group (app/accounts.tsx, app/bills.tsx, …) so that
 * pushing one hides the tab bar — which is what the design specifies. Do not nest them here.
 */
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="transactions" />
      <Tabs.Screen name="budgets" />
      <Tabs.Screen name="reports" />
      <Tabs.Screen name="more" />
    </Tabs>
  )
}
