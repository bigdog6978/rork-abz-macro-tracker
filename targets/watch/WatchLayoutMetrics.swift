import SwiftUI

/// Single source of truth for immersive watch spacing and component sizing.
///
/// Pages use the **full** watch face. Header sits in the safe top band; hero content
/// may extend behind TabView page dots at the bottom.
struct WatchLayoutMetrics: Equatable {
  let size: CGSize
  let safeAreaInsets: EdgeInsets
  let horizontal: CGFloat
  /// Footer sits at physical bottom; TabView page dots overlay on top.
  let footerBottomPadding: CGFloat

  static let inlineHeaderHeight: CGFloat = 20
  static let clockClearance: CGFloat = 44
  static let heroContentGap: CGFloat = 2
  static let statRowHeight: CGFloat = 50
  static let streakRowHeight: CGFloat = 14
  static let actionButtonHeight: CGFloat = 44
  static let macroLabelBlockHeight: CGFloat = 14
  static let todayHeadlineHeight: CGFloat = 46

  static let fallback = WatchLayoutMetrics(
    size: CGSize(width: 184, height: 224),
    safeAreaInsets: EdgeInsets(top: 8, leading: 0, bottom: 0, trailing: 0),
    horizontal: 3,
    footerBottomPadding: 0
  )

  static func from(_ geo: GeometryProxy) -> WatchLayoutMetrics {
    let metrics = WatchLayoutMetrics(
      size: geo.size,
      safeAreaInsets: geo.safeAreaInsets,
      horizontal: 3,
      footerBottomPadding: 0
    )
    #if DEBUG
    print(
      "[WatchLayout] size=\(Int(geo.size.width))×\(Int(geo.size.height)) "
        + "safeTop=\(Int(metrics.safeTop)) bandTop=\(Int(metrics.contentBandTop))"
    )
    #endif
    return metrics
  }

  /// Clears curved top-left corner; TabView often reports 0 until safe area is read.
  var safeTop: CGFloat {
    max(safeAreaInsets.top, Self.estimatedSafeTop(for: size))
  }

  static func estimatedSafeTop(for size: CGSize) -> CGFloat {
    switch size.height {
    case 240...: return 12
    case 220..<240: return 10
    default: return 9
    }
  }

  var contentWidth: CGFloat { max(0, size.width - horizontal * 2) }

  /// Top of the hero band (below overlaid inline header).
  var contentBandTop: CGFloat {
    safeTop + Self.inlineHeaderHeight + Self.heroContentGap
  }

  var pageSpacing: CGFloat { size.height < 200 ? 4 : 6 }

  var showsStreakRow: Bool { size.height >= 200 }

  func contentBandHeight(footerHeight: CGFloat) -> CGFloat {
    max(0, size.height - contentBandTop - footerHeight - footerBottomPadding)
  }

  /// Bottom-anchored footer on Calories (stat cards + optional streak).
  func caloriesFooterHeight(showStreak: Bool) -> CGFloat {
    var height = Self.statRowHeight
    if showStreak, showsStreakRow {
      height += pageSpacing + Self.streakRowHeight
    }
    return height
  }

  var hydrationFooterHeight: CGFloat { Self.actionButtonHeight }

  func macrosFooterHeight(hasFeedback: Bool) -> CGFloat {
    hasFeedback ? Self.actionButtonHeight + pageSpacing + 22 : Self.actionButtonHeight
  }

  /// Hero ring fills the band between header overlay and bottom footer overlay.
  func heroRingSize(footerHeight: CGFloat) -> CGFloat {
    let band = contentBandHeight(footerHeight: footerHeight)
    let widthBased = contentWidth - 2
    return max(88, min(widthBased, band))
  }

  func heroRingLineWidth(for size: CGFloat) -> CGFloat { max(8, size * 0.085) }

  func heroCalorieFontSize(for size: CGFloat) -> CGFloat { min(42, size * 0.3) }

  /// Macro mini-rings scale to fill width and band height above the action button.
  func macroRingSize(footerHeight: CGFloat) -> CGFloat {
    let band = contentBandHeight(footerHeight: footerHeight)
    let cellWidth = (contentWidth - 8) / 3
    let heightBased = band - Self.macroLabelBlockHeight - 8
    return max(48, min(cellWidth * 0.98, heightBased))
  }

  func miniRingLineWidth(for size: CGFloat) -> CGFloat { max(4.5, size * 0.1) }

  /// Day-type grid cells expand to fill the lower overlay zone.
  func dayTypeTouchHeight() -> CGFloat {
    let overhead =
      contentBandTop + Self.todayHeadlineHeight + pageSpacing + 12 + pageSpacing
    let gridHeight = size.height - overhead - footerBottomPadding
    return max(44, (gridHeight - 6) / 2)
  }

  var minTouchHeight: CGFloat { 44 }
}
