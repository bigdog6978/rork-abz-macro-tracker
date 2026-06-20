import SwiftUI

/// Lays a TabView page out across the **full** watch face.
///
/// The system already keeps content clear of the clock (top) and the page dots
/// (bottom), so this only applies small cosmetic insets and **top-aligns** the
/// content — no double safe-area reservation and no `Spacer()` centering that
/// would float a shrunken cluster in the middle of the screen.
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
            .padding(.top, metrics.topInset)
            .padding(.bottom, metrics.bottomInset)
        }
      } else {
        content(metrics)
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
          .padding(.horizontal, metrics.horizontal)
          .padding(.top, metrics.topInset)
          .padding(.bottom, metrics.bottomInset)
      }
    }
  }
}
