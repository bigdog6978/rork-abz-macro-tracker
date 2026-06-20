import SwiftUI

/// Lays out a TabView page inside the safe content band (below time, above page dots).
struct WatchPageContainer<Content: View>: View {
  let scrollable: Bool
  @ViewBuilder let content: (WatchLayoutMetrics) -> Content

  init(
    scrollable: Bool = false,
    @ViewBuilder content: @escaping (WatchLayoutMetrics) -> Content
  ) {
    self.scrollable = scrollable
    self.content = content
  }

  var body: some View {
    GeometryReader { geo in
      let metrics = WatchLayoutMetrics.from(geo)

      Group {
        if scrollable {
          ScrollView(.vertical, showsIndicators: false) {
            pageStack(metrics: metrics)
              .frame(minHeight: metrics.contentHeight, alignment: .top)
          }
        } else {
          VStack(spacing: 0) {
            Spacer(minLength: 0)
            pageStack(metrics: metrics)
            Spacer(minLength: 0)
          }
        }
      }
      .padding(.top, metrics.safeTop)
      .padding(.bottom, metrics.safeBottom)
      .padding(.horizontal, metrics.horizontal)
      .frame(width: geo.size.width, height: geo.size.height, alignment: .center)
      .environment(\.watchLayout, metrics)
    }
  }

  private func pageStack(metrics: WatchLayoutMetrics) -> some View {
    VStack(spacing: metrics.pageSpacing) {
      content(metrics)
    }
    .frame(maxWidth: .infinity)
  }
}
