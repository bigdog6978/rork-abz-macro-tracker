import SwiftUI

/// Lays a TabView page out across the **full** watch face.
///
/// Top padding is zero so the inline page header shares the system clock row.
/// Only small bottom/horizontal insets remain for page dots and bezels.
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

      if scrollable {
        ScrollView(.vertical, showsIndicators: false) {
          content(metrics)
            .frame(maxWidth: .infinity, alignment: .top)
            .padding(.horizontal, metrics.horizontal)
            .padding(.bottom, metrics.bottomInset)
        }
        .ignoresSafeArea(.container, edges: .top)
      } else {
        content(metrics)
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
          .padding(.horizontal, metrics.horizontal)
          .padding(.bottom, metrics.bottomInset)
          .ignoresSafeArea(.container, edges: .top)
      }
    }
  }
}
