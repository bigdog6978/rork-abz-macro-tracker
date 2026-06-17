const memoryStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => memoryStore.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      memoryStore.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      memoryStore.delete(key);
    }),
    clear: jest.fn(async () => {
      memoryStore.clear();
    }),
  },
}));

import { addPhoto, clearAllPhotos, getBaselinePhoto, getPhotos } from '../storage/photosRepo';

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///mock/',
  getInfoAsync: jest.fn(async () => ({ exists: true })),
  makeDirectoryAsync: jest.fn(async () => undefined),
  copyAsync: jest.fn(async () => undefined),
  deleteAsync: jest.fn(async () => undefined),
}));

describe('photosRepo', () => {
  beforeEach(async () => {
    memoryStore.clear();
    await clearAllPhotos();
  });

  it('marks the first photo as baseline', async () => {
    const photo = await addPhoto('local_user', 'file:///tmp/a.jpg');
    expect(photo.isBaseline).toBe(true);
    const baseline = await getBaselinePhoto('local_user');
    expect(baseline?.id).toBe(photo.id);
  });

  it('stores photos per user', async () => {
    await addPhoto('local_user', 'file:///tmp/a.jpg');
    expect((await getPhotos('local_user')).length).toBe(1);
    expect((await getPhotos('other')).length).toBe(0);
  });
});
