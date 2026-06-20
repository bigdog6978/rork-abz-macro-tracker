/** 9:16 vertical export canvas for Instagram Stories / Reels / TikTok. */
export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1920;
export const SHARE_ASPECT_RATIO = SHARE_CARD_WIDTH / SHARE_CARD_HEIGHT;

export const SHARE_LOGO_WIDTH_RATIO = 0.14;
export const SHARE_LOGO_TOP = 72;
export const SHARE_LOGO_LEFT = 72;
export const SHARE_CONTENT_PADDING_H = 72;
export const SHARE_CONTENT_PADDING_TOP = 220;
export const SHARE_CONTENT_PADDING_BOTTOM = 320;

export function shareLogoWidth(): number {
  return Math.floor(SHARE_CARD_WIDTH * SHARE_LOGO_WIDTH_RATIO);
}

export type ShareTemplateId = 'daily_macros' | 'progress_photo' | 'body_progress';

export type ShareDestination =
  | 'instagram'
  | 'tiktok'
  | 'facebook'
  | 'messages'
  | 'more'
  | 'save_photos'
  | 'facebook_group';
