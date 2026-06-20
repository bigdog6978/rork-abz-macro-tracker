import SwiftUI

/// Single source of truth for watch safe zones, spacing, and scaled component sizes.
/// Keeps content below the system time and above TabView page-indicator dots.
struct WatchLayoutMetrics: Equatable {
  let size: CGSize
  let safeTop: CGFloat
  let safeBottom: CGFloat
  let horizontal: CGFloat

  /// Used by previews when GeometryReader is unavailable.
  static let fallback = WatchLayoutMetrics(
    size: CGSize(width: 176, height: 215),
    safeTop: 30,
    safeBottom: 26,
    horizontal: 8
  )

  static func from(_ geo: GeometryProxy) -> WatchLayoutMetrics {
    let insets = geo.safeAreaInsets
    let h = geo.size.height

    // Status time sits in the top safe area; TabView dots sit below the layout safe area.
    let statusReserve = max(insets.top, h < 210 ? 30 : 28)
    let pageDotReserve: CGFloat = h < 210 ? 26 : (h < 240 ? 24 : 22)
    let bottomReserve = max(insets.bottom, 0) + pageDotReserve

    return WatchLayoutMetrics(
      size: geo.size,
      safeTop: statusReserve,
      safeBottom: bottomReserve,
      horizontal: 8
    )
  }

  var contentWidth: CGFloat {
    max(0, size.width - horizontal * 2)
  }

  var contentHeight: CGFloat {
    max(0, size.height - safeTop - safeBottom)
  }

  var pageSpacing: CGFloat {
    contentHeight < 190 ? 6 : 8
  }

  /// Hero ring (Calories / Hydration).
  var heroRingSize: CGFloat {
    min(112, contentWidth * 0.62, contentHeight * 0.36)
  }

  var heroRingLineWidth: CGFloat {
    max(7, heroRingSize * 0.08)
  }

  /// Macro mini-rings on the Macros page.
  var miniRingSize: CGFloat {
    min(48, contentWidth * 0.21)
  }

  var miniRingLineWidth: CGFloat {
    max(4, miniRingSize * 0.1)
  }

  /// Hide streak on the smallest watches when vertical space is tight.
  var showsStreakRow: Bool {
    contentHeight >= 198
  }

  var heroCalorieFontSize: CGFloat {
    min(30, heroRingSize * 0.27)
  }

  var minTouchHeight: CGFloat { 44 }
}

private struct WatchLayoutMetricsKey: EnvironmentKey {
  static let defaultValue = WatchLayoutMetrics.fallback
}

extension EnvironmentValues {
  var watchLayout: WatchLayoutMetrics {
    get { self[WatchLayoutMetricsKey.self] }
    set { self[WatchLayoutMetricsKey.self] = newValue }
  }
}
