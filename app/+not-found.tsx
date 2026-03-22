import React, { useMemo } from "react";
import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import Colors from "../constants/colors";
import { useThemeColors, type AppColors } from "../providers/ThemeProvider";

export default function NotFoundScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn&apos;t exist.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home screen</Text>
        </Link>
      </View>
    </>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
  },
  link: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  linkText: {
    fontSize: 14,
    color: colors.onPrimary,
    fontWeight: "600",
  },
});
