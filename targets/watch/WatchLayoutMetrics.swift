import SwiftUI

/// Single source of truth for watch spacing and component sizing.
///
/// Page titles sit **inline with the system clock** (leading icon + title, trailing
/// clearance for watchOS time). Sizes scale up from the real available space.
struct WatchLayoutMetrics: Equatable {
  /// Full available page size inside the TabView page.
  let size: CGSize
  /// Bezel clearance on each side.
  let horizontal: CGFloat
  /// Top inset — 0 so the inline header shares the status/time row.
  let topInset: CGFloat
  /// Small bottom inset so the last control clears the page-indicator dots.
  let bottomInset: CGFloat

  /// Compact header row height (shares the system clock row).
  static let inlineHeaderHeight: CGFloat = 20
  /// Trailing space reserved for the system clock (upper-right).
  static let clockClearance: CGFloat = 44
  /// Gap between inline header and main content (hero ring, macro row, etc.).
  static let headerToContentSpacing: CGFloat = 5

  static let fallback = WatchLayoutMetrics(
    size: CGSize(width: 184, height: 224),
    horizontal: 5,
    topInset: 0,
    bottomInset: 8
  )

  static func from(_ geo: GeometryProxy) -> WatchLayoutMetrics {
    WatchLayoutMetrics(
      size: geo.size,
      horizontal: 5,
      topInset: 0,
      bottomInset: 8
    )
  }

  var contentWidth: CGFloat { max(0, size.width - horizontal * 2) }
  var contentHeight: CGFloat { max(0, size.height - topInset - bottomInset) }

  var pageSpacing: CGFloat { contentHeight < 200 ? 8 : 10 }

  var showsStreakRow: Bool { contentHeight >= 200 }

  /// Vertical budget below the inline header on hero pages (Calories / Hydration).
  private var heroReserve: CGFloat {
    let statRow: CGFloat = 54
    let spacing = Self.headerToContentSpacing + pageSpacing + 4
    let base = Self.inlineHeaderHeight + statRow + spacing
    return showsStreakRow ? base + 16 + pageSpacing : base
  }

  /// Hero ring (Calories / Hydration): width-driven, capped generously on 45/49mm.
  var heroRingSize: CGFloat {
    let widthBased = contentWidth - 4
    let heightBased = contentHeight - heroReserve
    return max(96, min(widthBased, heightBased, 135))
  }

  var heroRingLineWidth: CGFloat { max(8, heroRingSize * 0.085) }

  var heroCalorieFontSize: CGFloat { min(36, heroRingSize * 0.28) }

  private var macroCellWidth: CGFloat { (contentWidth - 12) / 3 }
  var miniRingSize: CGFloat { min(58, max(46, macroCellWidth * 0.94)) }
  var miniRingLineWidth: CGFloat { max(4.5, miniRingSize * 0.1) }

  var minTouchHeight: CGFloat { 44 }
}
