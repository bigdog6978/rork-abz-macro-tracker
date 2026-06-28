import SwiftUI

/// Mirrors RN `constants/colors` + accent themes (`theme/accentThemes.ts`) for watchOS UI.
enum PhysiqTheme {
  static let background = Color(red: 0.051, green: 0.051, blue: 0.051) // #0D0D0D
  static let card = Color(red: 0.102, green: 0.102, blue: 0.102) // #1A1A1A
  static let cardBorder = Color(red: 0.165, green: 0.165, blue: 0.165) // #2A2A2A
  static let textPrimary = Color(red: 0.96, green: 0.96, blue: 0.96)
  static let textSecondary = Color(red: 0.451, green: 0.451, blue: 0.451) // #737373
  static let textTertiary = Color(red: 0.32, green: 0.32, blue: 0.32)
  static let track = Color.white.opacity(0.14)
  /// Default accent (chartreuse) when `primaryHex` is missing.
  static let defaultAccent = Color(red: 0.871, green: 1.0, blue: 0.0) // #DEFF00
  static let protein = Color(red: 0.231, green: 0.510, blue: 0.965) // #3B82F6
  static let carbs = Color(red: 0.518, green: 0.800, blue: 0.086) // #84CC16
  static let fat = Color(red: 0.984, green: 0.749, blue: 0.141) // #FBBF24
  /// Dedicated water accent — distinct from protein blue and brand chartreuse.
  static let hydration = Color(red: 0.0, green: 0.831, blue: 1.0) // #00D4FF
  /// Semi-transparent accent for overlays only — do not `.fill()` on black (invisible on OLED).
  static let hydrationMuted = Color(red: 0.0, green: 0.831, blue: 1.0, opacity: 0.15)
  /// `rgba(0,212,255,0.15)` composited over `card` (#16363C) — use for hydration add-button rest fills.
  static let hydrationMutedFill = blendMuted(
    accentRed: 0.0,
    accentGreen: 0.831,
    accentBlue: 1.0
  )

  /// Blends accent onto `card` at `fraction` (mirrors RN `Colors.*Muted` over card).
  static func blendMuted(
    accentRed: Double,
    accentGreen: Double,
    accentBlue: Double,
    baseRed: Double = 26.0 / 255.0,
    baseGreen: Double = 26.0 / 255.0,
    baseBlue: Double = 26.0 / 255.0,
    fraction: Double = 0.15
  ) -> Color {
    let inv = 1.0 - fraction
    return Color(
      red: accentRed * fraction + baseRed * inv,
      green: accentGreen * fraction + baseGreen * inv,
      blue: accentBlue * fraction + baseBlue * inv
    )
  }

  static func color(hex: String?, fallback: Color) -> Color {
    guard var s = hex?.trimmingCharacters(in: .whitespacesAndNewlines), !s.isEmpty else {
      return fallback
    }
    if s.hasPrefix("#") { s.removeFirst() }
    guard s.count == 6, let n = UInt64(s, radix: 16) else { return fallback }
    let r = Double((n >> 16) & 0xFF) / 255
    let g = Double((n >> 8) & 0xFF) / 255
    let b = Double(n & 0xFF) / 255
    return Color(red: r, green: g, blue: b)
  }
}
