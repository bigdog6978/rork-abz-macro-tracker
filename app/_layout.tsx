import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { UserProvider } from "../providers/UserProvider";
import { DailyLogProvider } from "../providers/DailyLogProvider";
import { MeasurementsProvider } from "../providers/MeasurementsProvider";
import Colors from "../constants/colors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="onboarding"
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="add-measurement"
        options={{
          presentation: "modal",
          title: "Add Measurement",
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }}
      />
      <Stack.Screen
        name="add-food"
        options={{
          presentation: "modal",
          title: "Add Food",
          headerStyle: { backgroundColor: Colors.card },
          headerTintColor: Colors.text,
        }}
      />
      <Stack.Screen
        name="legal-document"
        options={{
          title: "",
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <UserProvider>
          <DailyLogProvider>
            <MeasurementsProvider>
              <StatusBar style="light" />
              <RootLayoutNav />
            </MeasurementsProvider>
          </DailyLogProvider>
        </UserProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
