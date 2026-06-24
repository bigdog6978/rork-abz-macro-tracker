import SwiftUI

/// Edge-to-edge watch face geometry (v6.1). Three rows: header, body, bottom bar.
/// faceHeight = geo.height; bottom bars bleed under TabView dots via pageIndicatorOverlap.
struct WatchLayoutMetrics: Equatable {
  let size: CGSize

  static let headerRowHeight: CGFloat = 22
  static let leadingInset: CGFloat = 8
  /// Trailing space reserved for system clock — no content in this column.
  static let clockReserve: CGFloat = 52
  static let bottomBarHeight: CGFloat = 44
  static let caloriesBottomBarHeight: CGFloat = 36
  static let macroLabelHeight: CGFloat = 10
  static let macroRowGap: CGFloat = 2
  static let todayTileGap: CGFloat = 2
  /// Footer background extends under page dots — not added to shell height.
  static let pageIndicatorOverlap: CGFloat = 14

  static let fallback = WatchLayoutMetrics(
    size: CGSize(width: 184, height: 224)
  )

  static func from(_ geo: GeometryProxy) -> WatchLayoutMetrics {
    let metrics = WatchLayoutMetrics(size: geo.size)
    #if DEBUG
    let body = metrics.bodyHeight(bottomBar: Self.bottomBarHeight)
    print(
      "[WatchLayout] geo=\(Int(geo.size.width))×\(Int(geo.size.height)) "
        + "faceH=\(Int(metrics.faceHeight)) bodyH=\(Int(body)) "
        + "dial=\(Int(metrics.heroDialSize(bottomBar: Self.bottomBarHeight))) "
        + "footerBottom=\(Int(metrics.faceHeight))"
    )
    #endif
    return metrics
  }

  var faceHeight: CGFloat { size.height }
  var faceWidth: CGFloat { size.width }

  func bodyHeight(bottomBar: CGFloat) -> CGFloat {
    max(0, faceHeight - Self.headerRowHeight - bottomBar)
  }

  func heroDialSize(bottomBar: CGFloat) -> CGFloat {
    let body = bodyHeight(bottomBar: bottomBar)
    return max(72, min(faceWidth, body))
  }

  func macroDialSize(bottomBar: CGFloat = bottomBarHeight) -> CGFloat {
    let body = bodyHeight(bottomBar: bottomBar)
    let cellWidth = (faceWidth - Self.macroRowGap * 2) / 3
    let heightBased = body - Self.macroLabelHeight - Self.macroRowGap
    return max(40, min(cellWidth, heightBased))
  }

  func heroRingLineWidth(for ringSize: CGFloat) -> CGFloat { max(7, ringSize * 0.088) }
  func heroCalorieFontSize(for ringSize: CGFloat) -> CGFloat { min(44, ringSize * 0.32) }
  func miniRingLineWidth(for ringSize: CGFloat) -> CGFloat { max(4, ringSize * 0.11) }

  /// Square tile side for 2×2 Today grid inside body region.
  func todayTileSide() -> CGFloat {
    let body = bodyHeight(bottomBar: 0)
    let gap = Self.todayTileGap
    let byWidth = (faceWidth - gap) / 2
    let byHeight = (body - gap) / 2
    return max(44, min(byWidth, byHeight))
  }

  func todayGridHeight() -> CGFloat {
    todayTileSide() * 2 + Self.todayTileGap
  }
}
