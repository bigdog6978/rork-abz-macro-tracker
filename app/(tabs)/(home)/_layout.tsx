import { Stack } from "expo-router";
import React from "react";
import Colors from "../../../constants/colors";

export default function HomeLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: 'transparent' },
        headerTintColor: Colors.text,
        contentStyle: { backgroundColor: 'transparent' },
        headerTitleStyle: { fontWeight: '700' as const },
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: "Physiq" }}
      />
    </Stack>
  );
}
