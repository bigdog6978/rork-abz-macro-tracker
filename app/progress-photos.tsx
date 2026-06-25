import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Image } from 'expo-image';
import { Camera, ImageIcon, Star, Trash2, X } from 'lucide-react-native';
import PhysiqPressable from '../components/ui/PhysiqPressable';
import Colors from '../constants/colors';
import { Radius, Spacing } from '../theme/tokens';
import { usePhotos } from '../providers/PhotosProvider';
import { useMeasurements } from '../providers/MeasurementsProvider';
import { useThemeColors, type AppColors } from '../providers/ThemeProvider';
import { fromDateKey } from '../utils/dateKey';
import { ProgressPhoto } from '../features/progress/photoTypes';

function formatPhotoDate(dateKey: string): string {
  return fromDateKey(dateKey).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function PhotoCompareRow({
  baseline,
  latest,
  trends,
  styles,
}: {
  baseline: ProgressPhoto | null;
  latest: ProgressPhoto | null;
  trends: ReturnType<typeof useMeasurements>['trends'];
  styles: ReturnType<typeof createStyles>;
}) {
  if (!baseline && !latest) return null;
  const topTrends = trends.slice(0, 3);

  return (
    <View style={styles.compareCard}>
      <Text style={styles.compareTitle}>Baseline vs Latest</Text>
      <View style={styles.comparePhotos}>
        <View style={styles.compareCol}>
          <Text style={styles.compareLabel}>Baseline</Text>
          {baseline ? (
            <Image source={{ uri: baseline.fileUri }} style={styles.compareImage} contentFit="cover" />
          ) : (
            <View style={[styles.compareImage, styles.placeholder]} />
          )}
          {baseline && <Text style={styles.compareDate}>{formatPhotoDate(baseline.dateKey)}</Text>}
        </View>
        <View style={styles.compareCol}>
          <Text style={styles.compareLabel}>Latest</Text>
          {latest ? (
            <Image source={{ uri: latest.fileUri }} style={styles.compareImage} contentFit="cover" />
          ) : (
            <View style={[styles.compareImage, styles.placeholder]} />
          )}
          {latest && <Text style={styles.compareDate}>{formatPhotoDate(latest.dateKey)}</Text>}
        </View>
      </View>
      {topTrends.length > 0 && (
        <View style={styles.deltaRow}>
          {topTrends.map((t) => (
            <View key={t.field} style={styles.deltaChip}>
              <Text style={styles.deltaLabel}>{t.label}</Text>
              <Text style={[styles.deltaValue, t.isPositive ? styles.deltaPositive : styles.deltaNegative]}>
                {t.displayValue}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function ProgressPhotosScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const thumbSize = (width - Spacing.lg * 2 - Spacing.sm * 2) / 3;
  const {
    photos,
    baseline,
    latest,
    isLoading,
    isSaving,
    captureAndAdd,
    setBaseline,
    deletePhoto,
  } = usePhotos();
  const { trends } = useMeasurements();
  const [viewerPhoto, setViewerPhoto] = useState<ProgressPhoto | null>(null);

  const handleAdd = useCallback(
    (source: 'camera' | 'library') => {
      void captureAndAdd(source).then((photo) => {
        if (photo) setViewerPhoto(photo);
      });
    },
    [captureAndAdd]
  );

  const handleDelete = useCallback(
    (photo: ProgressPhoto) => {
      Alert.alert('Delete photo?', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deletePhoto(photo.id).then(() => {
              if (viewerPhoto?.id === photo.id) setViewerPhoto(null);
            });
          },
        },
      ]);
    },
    [deletePhoto, viewerPhoto?.id]
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Progress Photos' }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <PhotoCompareRow baseline={baseline} latest={latest} trends={trends} styles={styles} />

        <View style={styles.actionsRow}>
          <PhysiqPressable
            feedback="confirm"
            style={styles.actionBtn}
            disabled={isSaving}
            onPress={() => handleAdd('camera')}
          >
            <Camera size={18} color={colors.primary} />
            <Text style={styles.actionText}>Take Photo</Text>
          </PhysiqPressable>
          <PhysiqPressable
            feedback="confirm"
            style={styles.actionBtn}
            disabled={isSaving}
            onPress={() => handleAdd('library')}
          >
            <ImageIcon size={18} color={colors.primary} />
            <Text style={styles.actionText}>Choose Photo</Text>
          </PhysiqPressable>
        </View>

        {isSaving && <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />}

        {isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : photos.length === 0 ? (
          <Text style={styles.emptyText}>
            Add full-body photos over time to visualize your progress alongside your metrics.
          </Text>
        ) : (
          <View style={styles.grid}>
            {[...photos].reverse().map((photo) => (
              <PhysiqPressable
                key={photo.id}
                feedback="tap"
                style={[styles.thumbWrap, { width: thumbSize, height: thumbSize * 1.33 }]}
                onPress={() => setViewerPhoto(photo)}
                onLongPress={() => handleDelete(photo)}
              >
                <Image source={{ uri: photo.fileUri }} style={styles.thumb} contentFit="cover" />
                {photo.isBaseline && (
                  <View style={styles.baselineBadge}>
                    <Star size={10} color={Colors.white} fill={Colors.white} />
                  </View>
                )}
              </PhysiqPressable>
            ))}
          </View>
        )}

        <PhysiqPressable feedback="tap" style={styles.shareLink} onPress={() => router.push('/share-progress' as never)}>
          <Text style={styles.shareLinkText}>Share your progress</Text>
        </PhysiqPressable>
      </ScrollView>

      <Modal visible={!!viewerPhoto} transparent animationType="fade" onRequestClose={() => setViewerPhoto(null)}>
        <PhysiqPressable feedback="tap" style={styles.viewerBackdrop} onPress={() => setViewerPhoto(null)}>
          <View style={styles.viewerCard}>
            {viewerPhoto && (
              <>
                <Image source={{ uri: viewerPhoto.fileUri }} style={styles.viewerImage} contentFit="contain" />
                <Text style={styles.viewerDate}>{formatPhotoDate(viewerPhoto.dateKey)}</Text>
                <View style={styles.viewerActions}>
                  {!viewerPhoto.isBaseline && (
                    <PhysiqPressable
                      feedback="select"
                      style={styles.viewerBtn}
                      onPress={() => void setBaseline(viewerPhoto.id).then(() => setViewerPhoto(null))}
                    >
                      <Star size={16} color={colors.primary} />
                      <Text style={styles.viewerBtnText}>Set as baseline</Text>
                    </PhysiqPressable>
                  )}
                  <PhysiqPressable feedback="destructive" style={styles.viewerBtn} onPress={() => handleDelete(viewerPhoto)}>
                    <Trash2 size={16} color={Colors.danger} />
                    <Text style={[styles.viewerBtnText, { color: Colors.danger }]}>Delete</Text>
                  </PhysiqPressable>
                  <PhysiqPressable feedback="tap" style={styles.viewerClose} onPress={() => setViewerPhoto(null)}>
                    <X size={20} color={Colors.textSecondary} />
                  </PhysiqPressable>
                </View>
              </>
            )}
          </View>
        </PhysiqPressable>
      </Modal>
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: Spacing.lg, paddingBottom: 40, gap: Spacing.md },
    compareCard: {
      backgroundColor: Colors.card,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: Colors.cardBorder,
      gap: Spacing.sm,
    },
    compareTitle: { color: Colors.text, fontSize: 16, fontWeight: '800' },
    comparePhotos: { flexDirection: 'row', gap: Spacing.sm },
    compareCol: { flex: 1, alignItems: 'center', gap: 6 },
    compareLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700' },
    compareImage: { width: '100%', aspectRatio: 3 / 4, borderRadius: Radius.md, backgroundColor: Colors.cardElevated },
    placeholder: { borderWidth: 1, borderColor: Colors.cardBorder, borderStyle: 'dashed' },
    compareDate: { color: Colors.textTertiary, fontSize: 11 },
    deltaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    deltaChip: {
      backgroundColor: Colors.cardElevated,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: Radius.sm,
    },
    deltaLabel: { color: Colors.textTertiary, fontSize: 10, fontWeight: '600' },
    deltaValue: { color: Colors.text, fontSize: 13, fontWeight: '800' },
    deltaPositive: { color: Colors.success },
    deltaNegative: { color: Colors.warning },
    actionsRow: { flexDirection: 'row', gap: Spacing.sm },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: Radius.md,
      borderWidth: 1.5,
      borderColor: colors.primary,
      backgroundColor: colors.primaryMuted,
    },
    actionText: { color: colors.primary, fontWeight: '800', fontSize: 14 },
    emptyText: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    thumbWrap: { borderRadius: Radius.md, overflow: 'hidden', position: 'relative' },
    thumb: { width: '100%', height: '100%' },
    baselineBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      backgroundColor: colors.primary,
      borderRadius: 10,
      padding: 4,
    },
    shareLink: { alignItems: 'center', paddingVertical: 12 },
    shareLinkText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
    viewerBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.85)',
      justifyContent: 'center',
      padding: Spacing.lg,
    },
    viewerCard: { backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.md, gap: 10 },
    viewerImage: { width: '100%', height: 360, borderRadius: Radius.md },
    viewerDate: { color: Colors.textSecondary, textAlign: 'center', fontSize: 13 },
    viewerActions: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'center' },
    viewerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8 },
    viewerBtnText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
    viewerClose: { position: 'absolute', top: 8, right: 8, padding: 4 },
  });
