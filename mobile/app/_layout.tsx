import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configure } from '@votr/shared';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

configure({ apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000' });

const queryClient = new QueryClient();

/**
 * Root layout — sets up the QueryClient and configures the shared API base URL.
 * All screens are rendered inside a full-screen Stack navigator.
 */
export default function RootLayout(): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </QueryClientProvider>
  );
}
