import { Tabs } from "expo-router";
import { router } from "expo-router";
import { Home, UtensilsCrossed, TrendingUp, Settings } from "lucide-react-native";
import React, { useEffect, useMemo } from "react";
import { View, StyleSheet, Platform } from "react-native";
import Colors from "../../constants/colors";
import { useThemeColors, type AppColors } from "../../providers/ThemeProvider";
import { usePro } from "../../providers/ProProvider";

function TabIcon({ icon: Icon, color, size, focused, activeBarColor }: {
  icon: typeof Home;
  color: string;
  size: number;
  focused: boolean;
  activeBarColor: string;
}) {
  return (
    <View style={styles.iconWrap}>
      <Icon size={size} color={color} strokeWidth={focused ? 2.5 : 1.8} />
      {focused && <View style={[styles.activeBar, { backgroundColor: activeBarColor }]} />}
    </View>
  );
}

export default function TabLayout() {
  const colors = useThemeColors();
  const { trialConversionPromptDue, markTrialConversionPromptShown } = usePro();
  const tabBarStyle = useMemo(
    () => ({
      backgroundColor: Colors.tabBar,
      borderTopColor: Colors.border,
      borderTopWidth: 0.5,
      paddingTop: Platform.OS === 'ios' ? 8 : 4,
    }),
    []
  );

  useEffect(() => {
    if (!trialConversionPromptDue) return;
    const run = async () => {
      await markTrialConversionPromptShown();
      router.push('/trial-conversion' as never);
    };
    void run();
  }, [markTrialConversionPromptShown, trialConversionPromptDue]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: 'transparent',
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarStyle,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600' as const,
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon icon={Home} color={color} size={size} focused={focused} activeBarColor={colors.primary} />
          ),
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: "Meal Plan",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon icon={UtensilsCrossed} color={color} size={size} focused={focused} activeBarColor={colors.primary} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Progress",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon icon={TrendingUp} color={color} size={size} focused={focused} activeBarColor={colors.primary} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon icon={Settings} color={color} size={size} focused={focused} activeBarColor={colors.primary} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBar: {
    width: 20,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.primary,
    marginTop: 4,
  },
});
