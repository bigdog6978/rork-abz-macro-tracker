import { Stack } from "expo-router";
import React from "react";
import Colors from "../../../constants/colors";

export default function HomeLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
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
