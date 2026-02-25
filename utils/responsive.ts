import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const guidelineBaseWidth = 390; // iPhone 15 baseline

export const scale = (size: number): number => {
  return Math.round((width / guidelineBaseWidth) * size);
};
