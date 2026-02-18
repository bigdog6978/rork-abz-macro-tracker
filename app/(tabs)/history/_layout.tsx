import { Stack } from "expo-router";
import React from "react";
import Colors from "../../../constants/colors";

export default function HistoryLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontWeight: '700' as const },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: "Progress" }}
      />
    </Stack>
  );
}
