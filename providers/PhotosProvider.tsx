import { createSafeContextHook } from '../utils/createSafeContextHook';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { ProgressPhoto } from '../features/progress/photoTypes';
import {
  addPhoto as repoAddPhoto,
  deletePhoto as repoDeletePhoto,
  getBaselinePhoto as repoGetBaseline,
  getLatestPhoto as repoGetLatest,
  getPhotos as repoGetPhotos,
  setBaselinePhoto as repoSetBaseline,
} from '../storage/photosRepo';
import { captureProgressPhoto, PhotoCaptureSource } from '../utils/photos/captureProgressPhoto';

const USER_ID = 'local_user';
const EMPTY_PHOTOS: ProgressPhoto[] = [];

export const [PhotosProvider, usePhotos] = createSafeContextHook(() => {
  const queryClient = useQueryClient();

  const photosQuery = useQuery({
    queryKey: ['progress_photos', USER_ID],
    queryFn: () => repoGetPhotos(USER_ID),
  });

  const photos = photosQuery.data ?? EMPTY_PHOTOS;

  const baseline = useMemo(() => {
    const b = photos.find((p) => p.isBaseline);
    return b ?? (photos.length > 0 ? photos[0] : null);
  }, [photos]);

  const latest = useMemo(() => {
    return photos.length > 0 ? photos[photos.length - 1] : null;
  }, [photos]);

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['progress_photos', USER_ID] });
  }, [queryClient]);

  const addFromSourceMutation = useMutation({
    mutationFn: async (input: { source: PhotoCaptureSource; isBaseline?: boolean; note?: string }) => {
      const uri = await captureProgressPhoto(input.source);
      if (!uri) return null;
      return repoAddPhoto(USER_ID, uri, {
        isBaseline: input.isBaseline,
        note: input.note,
      });
    },
    onSuccess: () => invalidate(),
  });

  const addFromUriMutation = useMutation({
    mutationFn: async (input: { uri: string; isBaseline?: boolean; note?: string }) =>
      repoAddPhoto(USER_ID, input.uri, {
        isBaseline: input.isBaseline,
        note: input.note,
      }),
    onSuccess: () => invalidate(),
  });

  const setBaselineMutation = useMutation({
    mutationFn: async (photoId: string) => {
      await repoSetBaseline(USER_ID, photoId);
    },
    onSuccess: () => invalidate(),
  });

  const deleteMutation = useMutation({
    mutationFn: async (photoId: string) => {
      await repoDeletePhoto(USER_ID, photoId);
    },
    onSuccess: () => invalidate(),
  });

  const captureAndAdd = useCallback(
    async (source: PhotoCaptureSource, options?: { isBaseline?: boolean; note?: string }) => {
      const photo = await addFromSourceMutation.mutateAsync({
        source,
        isBaseline: options?.isBaseline,
        note: options?.note,
      });
      return photo;
    },
    [addFromSourceMutation]
  );

  const saveFromUri = useCallback(
    async (uri: string, options?: { isBaseline?: boolean; note?: string }) => {
      return addFromUriMutation.mutateAsync({ uri, ...options });
    },
    [addFromUriMutation]
  );

  const setBaseline = useCallback(
    (photoId: string) => setBaselineMutation.mutateAsync(photoId),
    [setBaselineMutation.mutateAsync] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const deletePhoto = useCallback(
    (photoId: string) => deleteMutation.mutateAsync(photoId),
    [deleteMutation.mutateAsync] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const isSaving = addFromSourceMutation.isPending || addFromUriMutation.isPending;

  // Stable context value so consumers only re-render on actual data changes.
  return useMemo(
    () => ({
      photos,
      baseline,
      latest,
      isLoading: photosQuery.isLoading,
      isSaving,
      captureAndAdd,
      saveFromUri,
      setBaseline,
      deletePhoto,
      userId: USER_ID,
    }),
    [
      photos,
      baseline,
      latest,
      photosQuery.isLoading,
      isSaving,
      captureAndAdd,
      saveFromUri,
      setBaseline,
      deletePhoto,
    ]
  );
}, 'usePhotos', 'PhotosProvider');

export type { ProgressPhoto };
