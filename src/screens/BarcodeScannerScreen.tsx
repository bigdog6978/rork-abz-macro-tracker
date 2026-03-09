import React from 'react';
import BarcodeScannerPanel from '../../components/ui/BarcodeScannerPanel';

interface BarcodeScannerScreenProps {
  onCancel?: () => void;
  onSaved?: (foodId: string) => void;
}

export default function BarcodeScannerScreen({
  onCancel,
  onSaved,
}: BarcodeScannerScreenProps) {
  return <BarcodeScannerPanel variant="fullscreen" onCancel={onCancel} onSaved={onSaved} />;
}
