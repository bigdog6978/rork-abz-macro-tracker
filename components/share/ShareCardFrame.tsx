import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../../constants/colors';
import { Gradients } from '../../theme/tokens';
import DashBrandSvg from '../ui/DashBrandSvg';
import {
  SHARE_CARD_HEIGHT,
  SHARE_CARD_WIDTH,
  SHARE_CONTENT_PADDING_BOTTOM,
  SHARE_CONTENT_PADDING_H,
  SHARE_CONTENT_PADDING_TOP,
  SHARE_LOGO_LEFT,
  SHARE_LOGO_TOP,
  shareLogoWidth,
} from '../../utils/share/shareConstants';

const LOGO_ASPECT = 26.14 / 506.66;

interface ShareCardFrameProps {
  primaryColor: string;
  children: React.ReactNode;
}

export default function ShareCardFrame({ primaryColor, children }: ShareCardFrameProps) {
  const logoWidth = shareLogoWidth();
  const styles = useMemo(() => createStyles(), []);

  return (
    <View style={styles.root} collapsable={false}>
      <LinearGradient colors={Gradients.screen} style={StyleSheet.absoluteFill} />
      <View style={[styles.logoWrap, { top: SHARE_LOGO_TOP, left: SHARE_LOGO_LEFT }]}>
        <DashBrandSvg width={logoWidth} height={logoWidth * LOGO_ASPECT} color={primaryColor} />
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const createStyles = () =>
  StyleSheet.create({
    root: {
      width: SHARE_CARD_WIDTH,
      height: SHARE_CARD_HEIGHT,
      backgroundColor: Colors.background,
      overflow: 'hidden',
    },
    logoWrap: {
      position: 'absolute',
      zIndex: 2,
    },
    content: {
      flex: 1,
      paddingTop: SHARE_CONTENT_PADDING_TOP,
      paddingBottom: SHARE_CONTENT_PADDING_BOTTOM,
      paddingHorizontal: SHARE_CONTENT_PADDING_H,
    },
  });
