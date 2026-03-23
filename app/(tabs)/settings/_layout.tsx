import { Stack } from "expo-router";
import React from "react";
import Colors from "../../../constants/colors";

export default function SettingsLayout() {
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
        options={{ title: "Settings" }}
      />
      <Stack.Screen
        name="allergies"
        options={{ title: "Allergies" }}
      />
      <Stack.Screen
        name="food-preferences"
        options={{ title: "Food Preferences" }}
      />
      <Stack.Screen
        name="nutrition-science"
        options={{ title: "Macro Calculation Methodology" }}
      />
    </Stack>
  );
}
