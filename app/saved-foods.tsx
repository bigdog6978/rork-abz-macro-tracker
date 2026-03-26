import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import DismissKeyboard from '../components/ui/DismissKeyboard';
import { Search, ChevronRight, Trash2, Scan, UtensilsCrossed } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '../constants/colors';
import { formatNumber } from '../utils/formatNumber';
import * as foodsRepo from '../src/data/foodsRepo';
import type { LocalFood } from '../src/types/Food';
import { useThemeColors, type AppColors } from '../providers/ThemeProvider';

export default function SavedFoodsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [foods, setFoods] = useState<LocalFood[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const loadFoods = useCallback(async () => {
    setLoading(true);
    try {
      const all = await foodsRepo.getUserSavedFoods();
      setFoods(all);
    } catch (err) {
      console.log('[SavedFoods] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFoods();
  }, [loadFoods]);

  const filteredFoods = searchQuery.trim()
    ? foods.filter(
        (f) =>
          f.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          (f.brand?.toLowerCase().includes(searchQuery.toLowerCase().trim()) ?? false)
      )
    : foods;

  const handleSelectFood = useCallback(
    (food: LocalFood) => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const norm = foodsRepo.localFoodToNormalizedFood(food);
      router.replace({
        pathname: '/add-food',
        params: { fromBarcode: norm.id, sourceContext: 'saved-foods' },
      });
    },
    []
  );

  const handleDeleteFood = useCallback(
    (food: LocalFood) => {
      Alert.alert(
        'Delete saved food?',
        "This removes it from your Saved Foods list. It won't affect today's logged foods.",
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await foodsRepo.deleteSavedFood(food.id);
                setFoods((prev) => prev.filter((f) => f.id !== food.id));
                if (Platform.OS !== 'web') {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
              } catch (err) {
                console.log('[SavedFoods] Delete error:', err);
                Alert.alert('Error', 'Failed to delete. Please try again.');
              }
            },
          },
        ]
      );
    },
    []
  );

  const handleScanBarcode = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/barcode-scanner');
  }, []);

  const handleManualEntry = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.replace('/add-food');
  }, []);

  return (
    <DismissKeyboard>
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Saved Foods',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }}
      />
      <View style={styles.searchContainer}>
        <Search size={18} color={Colors.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search saved foods"
          placeholderTextColor={Colors.textTertiary}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredFoods.length === 0 ? (
        <View style={styles.emptyState}>
          <UtensilsCrossed size={48} color={Colors.textTertiary} strokeWidth={1} />
          <Text style={styles.emptyTitle}>
            {searchQuery.trim() ? 'No matches' : 'Nothing saved yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery.trim()
              ? 'Try a different search term'
              : 'Add foods from manual entry or barcode scan'}
          </Text>
          {!searchQuery.trim() && (
            <View style={styles.emptyActions}>
              <TouchableOpacity style={styles.emptyBtn} onPress={handleManualEntry}>
                <Text style={styles.emptyBtnText}>Enter manually</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.emptyBtnSecondary} onPress={handleScanBarcode}>
                <Scan size={18} color={colors.primary} />
                <Text style={styles.emptyBtnTextSecondary}>Scan barcode</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredFoods.map((food) => (
            <View key={food.id} style={styles.card}>
              <TouchableOpacity
                style={styles.cardMain}
                onPress={() => handleSelectFood(food)}
                activeOpacity={0.7}
              >
                <View style={styles.cardInfo}>
                  <Text style={styles.foodName} numberOfLines={1}>
                    {food.name}
                  </Text>
                  <Text style={styles.foodMacros}>
                    {formatNumber(food.calories)} cal · {formatNumber(food.protein)}p ·{' '}
                    {formatNumber(food.carbs)}c · {formatNumber(food.fat)}f per 100g
                  </Text>
                </View>
                <ChevronRight size={18} color={Colors.textTertiary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeleteFood(food)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Trash2 size={18} color={Colors.textTertiary} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
    </DismissKeyboard>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    color: Colors.text,
    fontSize: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyActions: {
    marginTop: 24,
    gap: 12,
    alignItems: 'center',
  },
  emptyBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyBtnText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyBtnTextSecondary: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  cardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  cardInfo: {
    flex: 1,
  },
  foodName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  foodMacros: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 14,
  },
});
