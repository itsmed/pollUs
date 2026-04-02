import { fetchCurrentUser, type User } from '@votr/shared';
import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function ProfileContent({ user }: { user: User }): JSX.Element {
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitial}>{user.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Address</Text>
          <Text style={styles.rowValue} numberOfLines={2}>
            {user.address ?? 'Not set'}
          </Text>
        </View>
        <View style={[styles.row, styles.rowLast]}>
          <Text style={styles.rowLabel}>Senators on file</Text>
          <Text style={styles.rowValue}>{user.senator_ids.length}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

/**
 * Profile tab — shows the authenticated user's name, email, and account details.
 * Falls back to a sign-in prompt when unauthenticated.
 */
export default function ProfileScreen(): JSX.Element {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ['currentUser'],
    queryFn: fetchCurrentUser,
    retry: false,
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.mutedText}>Loading profile...</Text>
      </View>
    );
  }

  if (error || !user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.signInTitle}>Sign in to Votr</Text>
        <Text style={styles.signInSubtext}>
          Track your votes and compare them with your representatives.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ProfileContent user={user} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  mutedText: { fontSize: 14, color: '#6b7280' },
  signInTitle: { fontSize: 22, fontWeight: '700', color: '#111827', textAlign: 'center' },
  signInSubtext: {
    marginTop: 8,
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  scroll: { padding: 16 },
  header: { alignItems: 'center', paddingVertical: 24 },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarInitial: { fontSize: 28, fontWeight: '700', color: '#ffffff' },
  name: { fontSize: 20, fontWeight: '700', color: '#111827' },
  email: { marginTop: 4, fontSize: 14, color: '#6b7280' },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { fontSize: 14, color: '#374151' },
  rowValue: { fontSize: 14, color: '#6b7280', maxWidth: '55%', textAlign: 'right' },
});
