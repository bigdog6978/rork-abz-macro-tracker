import { Stack } from "expo-router";
import React from "react";
import Colors from "../../../constants/colors";

export default function HistoryLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: 'transparent' },
        headerTintColor: Colors.text,
        contentStyle: { backgroundColor: 'transparent' },
        headerTitleStyle: { fontWeight: '700' as const },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
