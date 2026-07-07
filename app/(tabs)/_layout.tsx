import { Tabs } from "expo-router";
import { Home, UtensilsCrossed, TrendingUp, Settings } from "lucide-react-native";
import React, { useMemo } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { useThemeColors } from "../../providers/ThemeProvider";
import { Type } from "../../theme/tokens";
import { playFeedback } from "../../utils/interactionFeedback";

const tabPressListener = {
  tabPress: () => {
    playFeedback('select');
  },
};

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
  const tabBarStyle = useMemo(
    () => ({
      backgroundColor: colors.tabBar,
      borderTopColor: colors.border,
      borderTopWidth: 0.5,
      paddingTop: Platform.OS === 'ios' ? 8 : 4,
    }),
    [colors.tabBar, colors.border]
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: 'transparent',
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle,
        tabBarLabelStyle: {
          ...Type.caption,
          lineHeight: undefined,
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        listeners={tabPressListener}
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon icon={Home} color={color} size={size} focused={focused} activeBarColor={colors.primary} />
          ),
        }}
      />
      <Tabs.Screen
        name="plan"
        listeners={tabPressListener}
        options={{
          title: "Meal Plan",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon icon={UtensilsCrossed} color={color} size={size} focused={focused} activeBarColor={colors.primary} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        listeners={tabPressListener}
        options={{
          title: "Progress",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon icon={TrendingUp} color={color} size={size} focused={focused} activeBarColor={colors.primary} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        listeners={tabPressListener}
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
    // backgroundColor supplied per-tab via activeBarColor (themed primary).
    width: 20,
    height: 3,
    borderRadius: 1.5,
    marginTop: 4,
  },
});
