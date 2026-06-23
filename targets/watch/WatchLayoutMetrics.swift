import SwiftUI

/// Single source of truth for immersive watch spacing and component sizing.
///
/// TabView + PageTabViewStyle reports a **content** height that stops above page dots.
/// `layoutHeight` extends into that band so footers pin to the physical bottom.
struct WatchLayoutMetrics: Equatable {
  let size: CGSize
  let safeAreaInsets: EdgeInsets
  let horizontal: CGFloat
  let pageIndicatorReserve: CGFloat

  static let inlineHeaderHeight: CGFloat = 20
  /// Minimal trailing gap; system clock cannot be hidden on third-party watch apps.
  static let clockTrailingGap: CGFloat = 8
  static let heroContentGap: CGFloat = 2
  static let statRowHeight: CGFloat = 44
  static let streakRowHeight: CGFloat = 12
  static let actionButtonHeight: CGFloat = 44
  static let macroLabelBlockHeight: CGFloat = 12
  static let todayHeadlineHeight: CGFloat = 42

  static let fallback = WatchLayoutMetrics(
    size: CGSize(width: 184, height: 224),
    safeAreaInsets: EdgeInsets(top: 10, leading: 0, bottom: 0, trailing: 0),
    horizontal: 2,
    pageIndicatorReserve: 16
  )

  static func from(_ geo: GeometryProxy) -> WatchLayoutMetrics {
    let reserve = Self.estimatedPageIndicatorReserve(for: geo.size)
    let metrics = WatchLayoutMetrics(
      size: geo.size,
      safeAreaInsets: geo.safeAreaInsets,
      horizontal: 2,
      pageIndicatorReserve: reserve
    )
    #if DEBUG
    print(
      "[WatchLayout] geo=\(Int(geo.size.width))×\(Int(geo.size.height)) "
        + "layoutH=\(Int(metrics.layoutHeight)) reserve=\(Int(reserve)) "
        + "safeTop=\(Int(metrics.safeTop)) safeLead=\(Int(metrics.safeLeading))"
    )
    #endif
    return metrics
  }

  /// TabView page dots sit in a band below reported `geo.size.height`.
  static func estimatedPageIndicatorReserve(for size: CGSize) -> CGFloat {
    switch size.height {
    case 250...: return 14
    case 230..<250: return 16
    case 210..<230: return 18
    default: return 16
    }
  }

  /// Full face height including the page-indicator band (for bottom pin + hero sizing).
  var layoutHeight: CGFloat { size.height + pageIndicatorReserve }

  var safeTop: CGFloat {
    max(safeAreaInsets.top, Self.estimatedSafeTop(for: size))
  }

  var safeLeading: CGFloat { max(safeAreaInsets.leading, 6) }

  var safeTrailing: CGFloat { max(safeAreaInsets.trailing, 6) }

  static func estimatedSafeTop(for size: CGSize) -> CGFloat {
    switch size.height {
    case 250...: return 14
    case 230..<250: return 12
    case 210..<230: return 11
    default: return 10
    }
  }

  /// Horizontal inset for footer controls — follows bottom corner radius.
  var footerHorizontalInset: CGFloat { max(horizontal, 8) }

  var contentWidth: CGFloat { max(0, size.width - horizontal * 2) }

  var contentBandTop: CGFloat {
    safeTop + Self.inlineHeaderHeight + Self.heroContentGap
  }

  var pageSpacing: CGFloat { size.height < 210 ? 3 : 5 }

  var showsStreakRow: Bool { layoutHeight >= 210 }

  func contentBandHeight(footerHeight: CGFloat) -> CGFloat {
    max(0, layoutHeight - contentBandTop - footerHeight)
  }

  func caloriesFooterHeight(showStreak: Bool) -> CGFloat {
    var height = Self.statRowHeight
    if showStreak, showsStreakRow {
      height += pageSpacing + Self.streakRowHeight
    }
    return height
  }

  var hydrationFooterHeight: CGFloat { Self.actionButtonHeight }

  func macrosFooterHeight(hasFeedback: Bool) -> CGFloat {
    hasFeedback ? Self.actionButtonHeight + pageSpacing + 20 : Self.actionButtonHeight
  }

  func heroRingSize(footerHeight: CGFloat) -> CGFloat {
    let band = contentBandHeight(footerHeight: footerHeight)
    let widthBased = contentWidth
    return max(90, min(widthBased, band))
  }

  func heroRingLineWidth(for ringSize: CGFloat) -> CGFloat { max(7, ringSize * 0.088) }

  func heroCalorieFontSize(for ringSize: CGFloat) -> CGFloat { min(44, ringSize * 0.32) }

  func macroRingSize(footerHeight: CGFloat) -> CGFloat {
    let band = contentBandHeight(footerHeight: footerHeight)
    let cellWidth = (contentWidth - 6) / 3
    let heightBased = band - Self.macroLabelBlockHeight - 4
    return max(50, min(cellWidth, heightBased))
  }

  func miniRingLineWidth(for ringSize: CGFloat) -> CGFloat { max(4, ringSize * 0.11) }

  func dayTypeTouchHeight() -> CGFloat {
    let overhead = contentBandTop + Self.todayHeadlineHeight + pageSpacing + 10
    let gridHeight = layoutHeight - overhead
    return max(44, (gridHeight - 6) / 2)
  }

  var minTouchHeight: CGFloat { 44 }
}
