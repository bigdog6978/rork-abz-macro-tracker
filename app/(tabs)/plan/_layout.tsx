import { Stack } from "expo-router";
import React from "react";
import Colors from "../../../constants/colors";

export default function PlanLayout() {
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
        options={{ title: "Meal Plan" }}
      />
      <Stack.Screen
        name="saved-plans"
        options={{ title: "Saved Plans" }}
      />
    </Stack>
  );
}
