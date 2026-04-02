import { useBills, type Bill } from '@votr/shared';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function BillCard({ bill, onPress }: { bill: Bill; onPress: () => void }): JSX.Element {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardRow}>
        <Text style={styles.badge}>
          {bill.bill_type?.toUpperCase()} {bill.bill_number}
        </Text>
        {bill.latest_action_date && (
          <Text style={styles.date}>{bill.latest_action_date}</Text>
        )}
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {bill.title}
      </Text>
      {bill.latest_action_text && (
        <Text style={styles.action} numberOfLines={1}>
          {bill.latest_action_text}
        </Text>
      )}
    </TouchableOpacity>
  );
}

/**
 * Bills tab — lists all bills from the Congress.gov API via the shared hook.
 * Tapping a bill navigates to its detail screen.
 */
export default function BillsScreen(): JSX.Element {
  const router = useRouter();
  const { data, isLoading, error } = useBills();

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load bills.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={data?.bills ?? []}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <BillCard
            bill={item}
            onPress={() =>
              router.push(
                `/bill/${item.congress_number}/${item.bill_type}/${item.bill_number}` as never
              )
            }
          />
        )}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#dc2626', fontSize: 14 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  date: { fontSize: 12, color: '#6b7280' },
  title: { fontSize: 15, fontWeight: '500', color: '#111827', lineHeight: 22 },
  action: { marginTop: 6, fontSize: 13, color: '#6b7280' },
});
