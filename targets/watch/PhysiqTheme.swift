import SwiftUI

/// Mirrors RN `constants/colors` + accent themes (`theme/accentThemes.ts`) for watchOS UI.
enum PhysiqTheme {
  static let background = Color(red: 0.051, green: 0.051, blue: 0.051) // #0D0D0D
  static let card = Color(red: 0.102, green: 0.102, blue: 0.102)
  static let textPrimary = Color(red: 0.96, green: 0.96, blue: 0.96)
  static let textSecondary = Color(red: 0.45, green: 0.45, blue: 0.45)
  static let textTertiary = Color(red: 0.32, green: 0.32, blue: 0.32)
  static let track = Color.white.opacity(0.14)
  /// Default accent (chartreuse) when `primaryHex` is missing.
  static let defaultAccent = Color(red: 0.871, green: 1.0, blue: 0.0) // #DEFF00
  static let protein = Color(red: 0.231, green: 0.510, blue: 0.965) // #3B82F6
  static let carbs = Color(red: 0.518, green: 0.800, blue: 0.086) // #84CC16
  static let fat = Color(red: 0.984, green: 0.749, blue: 0.141) // #FBBF24

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
