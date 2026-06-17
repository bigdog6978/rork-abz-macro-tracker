export interface ProgressPhoto {
  id: string;
  userId: string;
  dateKey: string;
  recordedAt: string;
  fileUri: string;
  isBaseline: boolean;
  note?: string;
  linkedMeasurementId?: string;
}
