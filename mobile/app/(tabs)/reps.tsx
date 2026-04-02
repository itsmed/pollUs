import { useMyReps, type Member } from '@votr/shared';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function RepCard({ member }: { member: Member }): JSX.Element {
  return (
    <View style={styles.card}>
      {member.photo_url ? (
        <Image source={{ uri: member.photo_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarInitial}>{member.name.charAt(0)}</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.name}>{member.name}</Text>
        <Text style={styles.role}>{member.role}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{member.state}</Text>
          {member.district && <Text style={styles.meta}> · District {member.district}</Text>}
          <Text style={styles.meta}> · {member.party}</Text>
        </View>
      </View>
    </View>
  );
}

function Section({ title, members }: { title: string; members: Member[] }): JSX.Element | null {
  if (members.length === 0) return null;
  return (
    <>
      <Text style={styles.sectionTitle}>{title}</Text>
      {members.map((m) => (
        <RepCard key={m.id} member={m} />
      ))}
    </>
  );
}

/**
 * Reps tab — shows the current user's senators and representatives.
 * Data is fetched via the shared useMyReps hook which calls /api/auth/me/reps.
 */
export default function RepsScreen(): JSX.Element {
  const { data, isLoading } = useMyReps(true);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.mutedText}>Loading your representatives...</Text>
      </View>
    );
  }

  const hasReps = data && (data.senators.length > 0 || data.representatives.length > 0);

  if (!hasReps) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>No representatives found</Text>
        <Text style={styles.emptySubtext}>
          Add your address in the Profile tab to find your reps.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Section title="Senators" members={data.senators} />
        <Section title="Representatives" members={data.representatives} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  mutedText: { fontSize: 14, color: '#6b7280' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151', textAlign: 'center' },
  emptySubtext: { marginTop: 8, fontSize: 14, color: '#6b7280', textAlign: 'center' },
  scroll: { padding: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarFallback: {
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { fontSize: 20, fontWeight: '700', color: '#374151' },
  cardBody: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#111827' },
  role: { fontSize: 13, color: '#2563eb', marginTop: 2 },
  metaRow: { flexDirection: 'row', marginTop: 4, flexWrap: 'wrap' },
  meta: { fontSize: 13, color: '#6b7280' },
});
