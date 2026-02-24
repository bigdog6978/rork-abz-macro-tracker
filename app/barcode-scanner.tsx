import React from 'react';
import { Stack } from 'expo-router';
import BarcodeScannerScreen from '../src/screens/BarcodeScannerScreen';
import Colors from '../constants/colors';

export default function BarcodeScannerRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Scan Barcode',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }}
      />
      <BarcodeScannerScreen />
    </>
  );
}
