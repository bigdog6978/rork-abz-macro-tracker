import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import Colors from '../constants/colors';
import { PRIVACY_POLICY } from '../legal/privacyPolicy';
import { TERMS_OF_USE } from '../legal/termsOfUse';

const DOCUMENTS: Record<string, { title: string; content: string }> = {
  privacy: { title: 'Privacy Policy', content: PRIVACY_POLICY },
  terms: { title: 'Terms of Use', content: TERMS_OF_USE },
  contact: {
    title: 'Contact & Support',
    content: `CONTACT & SUPPORT

Need help or have questions? We're here for you.

Email Support
support@abzapp.com

Response Time
We aim to respond to all inquiries within 48 hours during business days.

What We Can Help With
• Account issues and access
• Subscription questions
• Bug reports and technical issues
• Feature requests and feedback
• Privacy and data questions
• General inquiries

Bug Reports
When reporting a bug, please include:
• A description of the issue
• Steps to reproduce the problem
• Your device model and OS version
• Screenshots if applicable

We appreciate your feedback and are committed to making Abz the best fitness tracking experience possible.`,
  },
};

export default function LegalDocumentScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const doc = DOCUMENTS[type ?? ''] ?? DOCUMENTS.privacy;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: doc.title }} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.documentText}>{doc.content}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  documentText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400' as const,
  },
});
