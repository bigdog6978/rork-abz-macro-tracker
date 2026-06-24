import SwiftUI

/// Edge-to-edge watch face geometry (v6.3). VStack shell; footer column includes dot-band bleed.
struct WatchLayoutMetrics: Equatable {
  let size: CGSize
  let safeAreaInsets: EdgeInsets

  static let headerRowHeight: CGFloat = 22
  static let leadingInset: CGFloat = 8
  /// Upper-right — keep macro/hero ticks out of system clock.
  static let clockExclusionWidth: CGFloat = 48
  static let bottomBarHeight: CGFloat = 44
  static let caloriesBottomBarHeight: CGFloat = 36
  static let macroLabelHeight: CGFloat = 10
  static let macroRowGap: CGFloat = 2
  static let todayTileGap: CGFloat = 4
  static let macroClockTrailingInset: CGFloat = 12

  static let fallback = WatchLayoutMetrics(
    size: CGSize(width: 184, height: 224),
    safeAreaInsets: EdgeInsets()
  )

  static func from(_ geo: GeometryProxy) -> WatchLayoutMetrics {
    let metrics = WatchLayoutMetrics(size: geo.size, safeAreaInsets: geo.safeAreaInsets)
    #if DEBUG
    let body = metrics.bodyHeight(bottomBar: Self.bottomBarHeight)
    print(
      "[WatchLayout] geo=\(Int(geo.size.width))×\(Int(geo.size.height)) "
        + "safeT=\(Int(geo.safeAreaInsets.top)) safeB=\(Int(geo.safeAreaInsets.bottom)) "
        + "dotBand=\(Int(metrics.pageDotBandHeight)) faceH=\(Int(metrics.faceHeight)) "
        + "bodyH=\(Int(body)) footerH=\(Int(metrics.footerStackHeight(bar: Self.bottomBarHeight)))"
    )
    #endif
    return metrics
  }

  var faceHeight: CGFloat { size.height }
  var faceWidth: CGFloat { size.width }

  /// TabView page-indicator strip (tune from DEBUG logs on target sims).
  var pageDotBandHeight: CGFloat {
    let sizeBand: CGFloat
    switch size.height {
    case 250...: sizeBand = 22
    case 230..<250: sizeBand = 26
    case 210..<230: sizeBand = 28
    default: sizeBand = 26
    }
    return max(sizeBand, safeAreaInsets.bottom + 10)
  }

  func footerStackHeight(bar: CGFloat) -> CGFloat {
    bar > 0 ? bar + pageDotBandHeight : pageDotBandHeight
  }

  /// Flex body between header and footer column (bar + dot band).
  func bodyHeight(bottomBar: CGFloat) -> CGFloat {
    max(0, faceHeight - Self.headerRowHeight - footerStackHeight(bar: bottomBar))
  }

  func todayBodyHeight() -> CGFloat {
    bodyHeight(bottomBar: 0)
  }

  func heroDialSize(bottomBar: CGFloat) -> CGFloat {
    let body = bodyHeight(bottomBar: bottomBar)
    return max(72, min(faceWidth - 4, body))
  }

  func macroDialSize(bottomBar: CGFloat = bottomBarHeight) -> CGFloat {
    let body = bodyHeight(bottomBar: bottomBar)
    let rowWidth = faceWidth - Self.macroClockTrailingInset
    let cellWidth = (rowWidth - Self.macroRowGap * 2) / 3
    let heightBased = body - Self.macroLabelHeight - Self.macroRowGap
    return max(36, min(cellWidth, heightBased))
  }

  func heroRingLineWidth(for ringSize: CGFloat) -> CGFloat { max(7, ringSize * 0.088) }
  func heroCalorieFontSize(for ringSize: CGFloat) -> CGFloat { min(44, ringSize * 0.32) }
  func miniRingLineWidth(for ringSize: CGFloat) -> CGFloat { max(4, ringSize * 0.11) }

  func todayTileSide() -> CGFloat {
    let body = todayBodyHeight()
    let gap = Self.todayTileGap
    let byHeight = (body - gap) / 2
    let byWidth = (faceWidth - gap) / 2
    return max(40, min(byWidth, byHeight))
  }
}
