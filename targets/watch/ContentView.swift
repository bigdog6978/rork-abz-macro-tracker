import SwiftUI

/// Paged Physiq watch UI — edge-to-edge v6 layout. Phone-driven via WatchConnectivity.
struct ContentView: View {
  @EnvironmentObject private var connectivity: WatchConnectivityManager
  @State private var voiceMealSheetVisible = false

  private var snapshot: WatchSnapshot {
    WatchSnapshot.parse(connectivity.context)
  }

  private var accent: Color {
    PhysiqTheme.color(hex: snapshot.primaryHex, fallback: PhysiqTheme.defaultAccent)
  }

  private var hydrationColor: Color {
    PhysiqTheme.color(hex: snapshot.hydrationHex, fallback: PhysiqTheme.hydration)
  }

  var body: some View {
    Group {
      if snapshot.hasData {
        TabView {
          WatchPageContainer { metrics in caloriesPage(metrics: metrics) }
          WatchPageContainer { metrics in macrosPage(metrics: metrics) }
          WatchPageContainer { metrics in hydrationPage(metrics: metrics) }
          WatchPageContainer { metrics in todayPage(metrics: metrics) }
        }
        .tabViewStyle(PageTabViewStyle())
        .ignoresSafeArea(.container, edges: [.bottom])
      } else {
        WatchPageContainer(scrollable: true) { _ in emptyState }
      }
    }
    .background(PhysiqTheme.background.ignoresSafeArea())
  }

  // MARK: - Page shell

  private func watchPageShell<Body: View, Bottom: View>(
    metrics: WatchLayoutMetrics,
    icon: String,
    title: String,
    iconColor: Color? = nil,
    bottomBarHeight: CGFloat,
    @ViewBuilder body: () -> Body,
    @ViewBuilder bottomBar: () -> Bottom
  ) -> some View {
    VStack(spacing: 0) {
      pageHeaderRow(icon: icon, title: title, iconColor: iconColor, metrics: metrics)
      body()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
      bottomBar()
        .frame(width: metrics.faceWidth, height: bottomBarHeight)
    }
    .frame(width: metrics.faceWidth, height: metrics.layoutHeight, alignment: .top)
  }

  private func pageHeaderRow(
    icon: String,
    title: String,
    iconColor: Color? = nil,
    metrics: WatchLayoutMetrics
  ) -> some View {
    HStack(spacing: 4) {
      Image(systemName: icon)
        .font(.system(size: 11, weight: .bold))
        .foregroundStyle(iconColor ?? accent)
      Text(title)
        .font(.system(size: 12, weight: .heavy, design: .rounded))
        .foregroundStyle(PhysiqTheme.textPrimary)
        .lineLimit(1)
      Circle()
        .fill(statusColor)
        .frame(width: 5, height: 5)
      Spacer(minLength: 0)
      Color.clear.frame(width: WatchLayoutMetrics.clockReserve)
    }
    .padding(.leading, WatchLayoutMetrics.leadingInset)
    .frame(width: metrics.faceWidth, height: WatchLayoutMetrics.headerRowHeight, alignment: .leading)
  }

  // MARK: - Calories

  private func caloriesPage(metrics: WatchLayoutMetrics) -> some View {
    let bottomH = WatchLayoutMetrics.caloriesBottomBarHeight
    let ringSize = metrics.heroDialSize(bottomBar: bottomH)

    return watchPageShell(
      metrics: metrics,
      icon: "flame.fill",
      title: "Calories",
      bottomBarHeight: bottomH
    ) {
      caloriesHeroRing(ringSize: ringSize, metrics: metrics)
    } bottomBar: {
      caloriesSplitStats(metrics: metrics)
    }
  }

  private func caloriesHeroRing(ringSize: CGFloat, metrics: WatchLayoutMetrics) -> some View {
    ZStack {
      CalorieInstrumentDial(
        progress: snapshot.progress(consumed: snapshot.caloriesConsumed, target: snapshot.caloriesTarget),
        color: accent,
        lineWidth: metrics.heroRingLineWidth(for: ringSize),
        size: ringSize
      )
      VStack(spacing: 1) {
        Image(systemName: "flame.fill")
          .font(.system(size: max(12, ringSize * 0.12)))
          .foregroundStyle(accent)
        Text(formatInt(snapshot.caloriesRemaining))
          .font(.system(size: metrics.heroCalorieFontSize(for: ringSize), weight: .bold, design: .rounded))
          .monospacedDigit()
          .foregroundStyle(PhysiqTheme.textPrimary)
          .minimumScaleFactor(0.6)
          .lineLimit(1)
        Text("cal left")
          .font(.system(size: 10, weight: .semibold, design: .rounded))
          .foregroundStyle(PhysiqTheme.textSecondary)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
  }

  private func caloriesSplitStats(metrics: WatchLayoutMetrics) -> some View {
    HStack(spacing: 0) {
      calorieStatCell("Target", formatInt(snapshot.caloriesTarget), accentValue: false)
      Rectangle().fill(PhysiqTheme.textTertiary.opacity(0.35)).frame(width: 1)
      calorieStatCell("Eaten", formatInt(snapshot.caloriesConsumed), accentValue: true)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(PhysiqTheme.card.opacity(0.5))
  }

  private func calorieStatCell(_ title: String, _ value: String, accentValue: Bool) -> some View {
    VStack(spacing: 1) {
      Text(title.uppercased())
        .font(.system(size: 8, weight: .heavy, design: .rounded))
        .foregroundStyle(PhysiqTheme.textTertiary)
      Text(value)
        .font(.system(size: 15, weight: .bold, design: .rounded))
        .monospacedDigit()
        .foregroundStyle(accentValue ? accent : PhysiqTheme.textPrimary)
        .minimumScaleFactor(0.7)
        .lineLimit(1)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }

  // MARK: - Macros

  private func macrosPage(metrics: WatchLayoutMetrics) -> some View {
    let bottomH = WatchLayoutMetrics.bottomBarHeight
    let ringSize = metrics.macroDialSize(bottomBar: bottomH)

    return watchPageShell(
      metrics: metrics,
      icon: "chart.bar.fill",
      title: "Macros",
      bottomBarHeight: bottomH
    ) {
      VStack(spacing: 0) {
        if !snapshot.voiceMealFeedback.isEmpty {
          Text(snapshot.voiceMealFeedback)
            .font(.system(size: 9, weight: .medium, design: .rounded))
            .foregroundStyle(PhysiqTheme.textSecondary)
            .multilineTextAlignment(.center)
            .lineLimit(2)
            .frame(maxWidth: .infinity)
        }
        HStack(spacing: WatchLayoutMetrics.macroRowGap) {
          macroCell("Protein", consumed: snapshot.proteinConsumed, target: snapshot.proteinTarget,
                    ring: PhysiqTheme.color(hex: snapshot.proteinHex, fallback: PhysiqTheme.protein),
                    ringSize: ringSize, metrics: metrics)
          macroCell("Carbs", consumed: snapshot.carbsConsumed, target: snapshot.carbsTarget,
                    ring: PhysiqTheme.color(hex: snapshot.carbsHex, fallback: PhysiqTheme.carbs),
                    ringSize: ringSize, metrics: metrics)
          macroCell("Fat", consumed: snapshot.fatConsumed, target: snapshot.fatTarget,
                    ring: PhysiqTheme.color(hex: snapshot.fatHex, fallback: PhysiqTheme.fat),
                    ringSize: ringSize, metrics: metrics)
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
    } bottomBar: {
      micBarButton(metrics: metrics) {
        voiceMealSheetVisible = true
      }
    }
    .sheet(isPresented: $voiceMealSheetVisible) {
      VoiceMealSheet()
        .environmentObject(connectivity)
    }
  }

  private func macroCell(
    _ title: String,
    consumed: Double,
    target: Double,
    ring: Color,
    ringSize: CGFloat,
    metrics: WatchLayoutMetrics
  ) -> some View {
    VStack(spacing: 2) {
      ZStack {
        MacroInstrumentDial(
          progress: snapshot.progress(consumed: consumed, target: target),
          color: ring,
          lineWidth: metrics.miniRingLineWidth(for: ringSize),
          size: ringSize
        )
        Text("\(percent(consumed, target))%")
          .font(.system(size: max(9, ringSize * 0.22), weight: .heavy, design: .rounded))
          .monospacedDigit()
          .foregroundStyle(ring)
          .minimumScaleFactor(0.6)
          .lineLimit(1)
      }
      Text(title.uppercased())
        .font(.system(size: 7, weight: .heavy, design: .rounded))
        .foregroundStyle(PhysiqTheme.textTertiary)
        .lineLimit(1)
    }
    .frame(maxWidth: .infinity)
  }

  private func micBarButton(metrics: WatchLayoutMetrics, action: @escaping () -> Void) -> some View {
    Button {
      WatchInteractionFeedback.play(.tap)
      action()
    } label: {
      Image(systemName: "mic.fill")
        .font(.system(size: 18, weight: .bold))
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    .buttonStyle(PhysiqPressableButtonStyle())
    .foregroundStyle(PhysiqTheme.background)
    .background(accent)
  }

  // MARK: - Hydration

  private func hydrationPage(metrics: WatchLayoutMetrics) -> some View {
    let bottomH = WatchLayoutMetrics.bottomBarHeight
    let ringSize = metrics.heroDialSize(bottomBar: bottomH)

    return watchPageShell(
      metrics: metrics,
      icon: "drop.fill",
      title: "Hydration",
      iconColor: hydrationColor,
      bottomBarHeight: bottomH
    ) {
      hydrationHeroRing(ringSize: ringSize, metrics: metrics)
    } bottomBar: {
      hydrationSplitBar(metrics: metrics)
    }
  }

  private func hydrationHeroRing(ringSize: CGFloat, metrics: WatchLayoutMetrics) -> some View {
    ZStack {
      CalorieInstrumentDial(
        progress: snapshot.progress(consumed: snapshot.hydrationConsumed, target: snapshot.hydrationTarget),
        color: hydrationColor,
        lineWidth: metrics.heroRingLineWidth(for: ringSize),
        size: ringSize
      )
      VStack(spacing: 1) {
        Image(systemName: "drop.fill")
          .font(.system(size: max(12, ringSize * 0.12)))
          .foregroundStyle(hydrationColor)
        Text(snapshot.hydrationDisplay)
          .font(.system(size: min(18, ringSize * 0.14), weight: .bold, design: .rounded))
          .monospacedDigit()
          .foregroundStyle(PhysiqTheme.textPrimary)
          .minimumScaleFactor(0.6)
          .lineLimit(1)
        Text(HydrationFormat.unitLabel(snapshot.hydrationUnit))
          .font(.system(size: 9, weight: .semibold, design: .rounded))
          .foregroundStyle(PhysiqTheme.textSecondary)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
  }

  private func hydrationSplitBar(metrics: WatchLayoutMetrics) -> some View {
    let presets = HydrationFormat.quickAdds(snapshot.hydrationUnit)
    return HStack(spacing: 0) {
      ForEach(Array(presets.enumerated()), id: \.element.label) { index, preset in
        if index > 0 {
          Rectangle().fill(PhysiqTheme.background.opacity(0.35)).frame(width: 1)
        }
        Button {
          WatchInteractionFeedback.play(.tap)
          connectivity.logWater(ml: preset.ml)
        } label: {
          Text(preset.label)
            .font(.system(size: 12, weight: .bold, design: .rounded))
            .minimumScaleFactor(0.7)
            .lineLimit(1)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .buttonStyle(PhysiqPressableButtonStyle())
        .foregroundStyle(PhysiqTheme.background)
        .background(hydrationColor)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }

  // MARK: - Today

  private func todayPage(metrics: WatchLayoutMetrics) -> some View {
    let selectedOverride = connectivity.resolvedDayTypeOverride(fallback: snapshot.dayTypeOverride)
    let tileSide = metrics.todayTileSide()

    return watchPageShell(
      metrics: metrics,
      icon: snapshot.todayIcon,
      title: "Today",
      bottomBarHeight: 0
    ) {
      DayTypePicker(
        accent: accent,
        selectedId: selectedOverride,
        tileSide: tileSide
      ) { dayType in
        connectivity.setDayType(dayType)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
    } bottomBar: {
      EmptyView()
    }
  }

  // MARK: - Empty state

  private var statusColor: Color {
    connectivity.activationLabel == "Ready" ? accent : Color.orange.opacity(0.9)
  }

  private var emptyState: some View {
    VStack(alignment: .leading, spacing: 6) {
      Image(systemName: "iphone.gen3").font(.system(size: 20)).foregroundStyle(accent)
      Text("No data yet")
        .font(.system(size: 14, weight: .semibold, design: .rounded))
        .foregroundStyle(PhysiqTheme.textPrimary)
      Text("Open Physiq on your iPhone — targets sync automatically when the app is running.")
        .font(.system(size: 11, weight: .medium, design: .rounded))
        .foregroundStyle(PhysiqTheme.textSecondary)
        .fixedSize(horizontal: false, vertical: true)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(12)
    .background(
      RoundedRectangle(cornerRadius: 14, style: .continuous)
        .stroke(PhysiqTheme.textTertiary.opacity(0.35), lineWidth: 1)
    )
  }

  // MARK: - Formatting

  private func formatInt(_ v: Double) -> String { String(Int(round(v))) }

  private func percent(_ c: Double, _ t: Double) -> Int {
    guard t > 0 else { return 0 }
    return Int(min(max((c / t) * 100, 0), 999))
  }
}

#Preview {
  ContentView()
    .environmentObject(WatchConnectivityManager.shared)
}
