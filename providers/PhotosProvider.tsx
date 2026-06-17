import createContextHook from '@nkzw/create-context-hook';
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

export const [PhotosProvider, usePhotos] = createContextHook(() => {
  const queryClient = useQueryClient();

  const photosQuery = useQuery({
    queryKey: ['progress_photos', USER_ID],
    queryFn: () => repoGetPhotos(USER_ID),
  });

  const photos = photosQuery.data ?? [];

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

  return {
    photos,
    baseline,
    latest,
    isLoading: photosQuery.isLoading,
    isSaving: addFromSourceMutation.isPending || addFromUriMutation.isPending,
    captureAndAdd,
    saveFromUri,
    setBaseline: (photoId: string) => setBaselineMutation.mutateAsync(photoId),
    deletePhoto: (photoId: string) => deleteMutation.mutateAsync(photoId),
    userId: USER_ID,
  };
});

export type { ProgressPhoto };
