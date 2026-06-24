#if DEBUG
import SwiftUI

/// DEBUG-only simulator harness so the watch layout can be measured and screenshotted
/// without a paired iPhone. Enabled via launch arguments that `xcrun simctl launch`
/// maps into `UserDefaults` (e.g. `-PhysiqMockData YES -PhysiqInitialPage 2`).
///
/// None of this is compiled into Release builds.
enum WatchDebugHarness {
  /// Seed a realistic snapshot so `hasData` is true and all 4 pages render.
  static var isMockEnabled: Bool { UserDefaults.standard.bool(forKey: "PhysiqMockData") }

  /// Initial TabView page (0 Calories, 1 Macros, 2 Hydration, 3 Today).
  static var initialPage: Int { UserDefaults.standard.integer(forKey: "PhysiqInitialPage") }

  /// Draw a measurement overlay marking the candidate header band + top-right clock box.
  static var isClockProbeEnabled: Bool { UserDefaults.standard.bool(forKey: "PhysiqClockProbe") }

  /// Matches the reference screenshots (Calories 1845/1120, Protein 110%, Fat 214%, etc.).
  static let mockContext: [String: String] = [
    "caloriesTarget": "1845",
    "caloriesConsumed": "1120",
    "caloriesRemaining": "725",
    "proteinConsumed": "165",
    "proteinTarget": "150",
    "carbsConsumed": "4",
    "carbsTarget": "200",
    "fatConsumed": "107",
    "fatTarget": "50",
    "hydrationConsumedMl": "0",
    "hydrationTargetMl": "2400",
    "hydrationUnit": "oz",
    "primaryHex": "#DEFF00",
    "hydrationHex": "#00D4FF",
    "proteinHex": "#3B82F6",
    "carbsHex": "#84CC16",
    "fatHex": "#FBBF24",
    "dayTypeOverride": "rest",
    "dayTypeOverrideLabel": "Rest",
    "dayTypeSource": "override",
    "firstName": "Kris",
    "tier": "pro",
    "syncState": "ready",
  ]
}

/// Translucent overlay marking the candidate header band and top-right clock box,
/// so a screenshot against the live system time turns guesses into measurements.
struct ClockProbeOverlay: View {
  var body: some View {
    ZStack(alignment: .topLeading) {
      Rectangle()
        .fill(Color.red.opacity(0.22))
        .frame(height: WatchLayoutMetrics.headerRowHeight)
      Rectangle()
        .stroke(Color.cyan, lineWidth: 1)
        .frame(width: WatchLayoutMetrics.clockExclusionWidth,
               height: WatchLayoutMetrics.headerRowHeight + 8)
        .frame(maxWidth: .infinity, alignment: .trailing)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    .ignoresSafeArea()
    .allowsHitTesting(false)
  }
}
#endif
