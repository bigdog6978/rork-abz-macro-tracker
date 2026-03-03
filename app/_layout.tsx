import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { UserProvider, useUser } from "../providers/UserProvider";
import { DailyLogProvider, useDailyLog } from "../providers/DailyLogProvider";
import { MeasurementsProvider } from "../providers/MeasurementsProvider";
import { GoalSettingsProvider } from "../providers/GoalSettingsProvider";
import Colors from "../constants/colors";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: 'index',
};

const queryClient = new QueryClient();

function AppContent() {
  const { isLoading: userLoading } = useUser();
  const { isLoading: logsLoading } = useDailyLog();
  const hydrated = !userLoading && !logsLoading;

  useEffect(() => {
    if (hydrated) {
      SplashScreen.hideAsync();
    }
  }, [hydrated]);

  return (
    <>
      <StatusBar style="light" />
      <RootLayoutNav />
    </>
  );
}

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        contentStyle: { backgroundColor: Colors.background },
      }}
      initialRouteName="index"
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="welcome"
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
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
        name="measurement-history"
        options={{
          presentation: "modal",
          title: "Measurement History",
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }}
      />
      <Stack.Screen
        name="set-target"
        options={{
          presentation: "modal",
          title: "Set Target",
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
        name="barcode-scanner"
        options={{
          presentation: "modal",
          title: "Scan Barcode",
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }}
      />
      <Stack.Screen
        name="saved-foods"
        options={{
          presentation: "modal",
          title: "Saved Foods",
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }}
      />
      <Stack.Screen
        name="edit-log-entry"
        options={{
          presentation: "modal",
          title: "Edit Entry",
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }}
      />
      <Stack.Screen
        name="day-log"
        options={{
          presentation: "modal",
          title: "Day",
          headerStyle: { backgroundColor: Colors.background },
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
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <UserProvider>
          <DailyLogProvider>
            <MeasurementsProvider>
              <GoalSettingsProvider>
                <AppContent />
              </GoalSettingsProvider>
            </MeasurementsProvider>
          </DailyLogProvider>
        </UserProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
