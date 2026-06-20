import { useEffect } from 'react';
import {
  initReduceMotionListener,
  preloadInteractionSounds,
} from '../utils/interactionFeedback';

/** Preloads UI click sound and reduce-motion listener once at app start. */
export default function InteractionFeedbackInit() {
  useEffect(() => {
    void initReduceMotionListener();
    void preloadInteractionSounds();
  }, []);

  return null;
}
