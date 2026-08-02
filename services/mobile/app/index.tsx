// Placeholder route so expo-router's <Slot /> (in app/_layout.tsx) has at
// least one registered screen to render. expo-router's navigator throws
// "Couldn't find any screens for the navigator" when app/ has zero route
// files, so a truly empty app/ directory (as originally scaffolded in this
// task) cannot boot. Real route groups and screens land in Task 7+; this
// file intentionally renders nothing.
export default function Index() {
  return null
}
