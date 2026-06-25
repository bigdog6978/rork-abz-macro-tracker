import SwiftUI

/// Paged Physiq watch UI — true edge-to-edge v6.5 layout (all safe areas ignored). Phone-driven via WatchConnectivity.
struct ContentView: View {
  @EnvironmentObject private var connectivity: WatchConnectivityManager
  @State private var voiceMealStatus = ""
  @State private var voiceMealSending = false
  @State private var voiceMealLegacySheetVisible = false
  @State private var selectedPage: Int

  init() {
    #if DEBUG
    _selectedPage = State(initialValue: WatchDebugHarness.initialPage)
    #else
    _selectedPage = State(initialValue: 0)
    #endif
  }

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
        TabView(selection: $selectedPage) {
          WatchPageContainer { metrics in caloriesPage(metrics: metrics) }.tag(0)
          WatchPageContainer { metrics in macrosPage(metrics: metrics) }.tag(1)
          WatchPageContainer { metrics in hydrationPage(metrics: metrics) }.tag(2)
          WatchPageContainer { metrics in todayPage(metrics: metrics) }.tag(3)
        }
        .tabViewStyle(PageTabViewStyle())
        .ignoresSafeArea()
      } else {
        WatchPageContainer(scrollable: true) { _ in emptyState }
      }
    }
    .background(PhysiqTheme.background.ignoresSafeArea())
    .overlay {
      #if DEBUG
      if WatchDebugHarness.isClockProbeEnabled {
        ClockProbeOverlay()
      }
      #endif
    }
  }

  // MARK: - Page shell (VStack: header → body → footer bar)

  private func watchPageShell<Body: View, Bottom: View>(
    metrics: WatchLayoutMetrics,
    icon: String,
    title: String,
    iconColor: Color? = nil,
    bottomBarHeight: CGFloat,
    footerBackgroundColor: Color = .clear,
    tileFooter: Bool = false,
    @ViewBuilder body: () -> Body,
    @ViewBuilder bottomBar: () -> Bottom
  ) -> some View {
    VStack(spacing: 0) {
      pageHeaderRow(icon: icon, title: title, iconColor: iconColor, metrics: metrics)
      body()
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
      if bottomBarHeight > 0 {
        footerColumn(
          metrics: metrics,
          barHeight: bottomBarHeight,
          backgroundColor: footerBackgroundColor,
          tileFooter: tileFooter,
          content: bottomBar
        )
      }
    }
    .frame(width: metrics.faceWidth, height: metrics.faceHeight, alignment: .top)
    .ignoresSafeArea(.container, edges: .bottom)
  }

  /// Bottom action bar; tile footers keep buttons inside a size-scaled safe band.
  private func footerColumn<Content: View>(
    metrics: WatchLayoutMetrics,
    barHeight: CGFloat,
    backgroundColor: Color,
    tileFooter: Bool = false,
    @ViewBuilder content: () -> Content
  ) -> some View {
    Group {
      if tileFooter {
        footerTileBand(metrics: metrics, content: content)
      } else {
        content()
          .frame(width: metrics.faceWidth, height: barHeight)
          .background {
            backgroundColor
              .ignoresSafeArea(.container, edges: .bottom)
          }
      }
    }
    .frame(width: metrics.faceWidth, height: barHeight, alignment: .top)
  }

  private func footerTileBand<Content: View>(
    metrics: WatchLayoutMetrics,
    @ViewBuilder content: () -> Content
  ) -> some View {
    content()
      .frame(height: metrics.footerButtonHeight())
      .frame(maxWidth: .infinity)
      .padding(.horizontal, metrics.footerHorizontalInset())
      .padding(.top, metrics.footerTopPadding())
      .padding(.bottom, metrics.footerBottomInset() + WatchLayoutMetrics.pageDotClearance)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
  }

  /// Title row on the system clock line — leading icon + title.
  private func pageHeaderRow(
    icon: String,
    title: String,
    iconColor: Color? = nil,
    metrics: WatchLayoutMetrics
  ) -> some View {
    HStack(alignment: .center, spacing: 4) {
      Image(systemName: icon)
        .font(.system(size: 11, weight: .bold))
        .foregroundStyle(iconColor ?? accent)
      Text(title)
        .font(.system(size: 12, weight: .heavy))
        .foregroundStyle(PhysiqTheme.textPrimary)
        .lineLimit(1)
      Circle()
        .fill(statusColor)
        .frame(width: 5, height: 5)
      Spacer(minLength: 0)
    }
    .padding(.leading, metrics.leadingInset)
    .padding(.top, WatchLayoutMetrics.headerTopInset)
    .frame(width: metrics.faceWidth, height: WatchLayoutMetrics.headerBandHeight, alignment: .leading)
  }

  // MARK: - Calories

  private func caloriesPage(metrics: WatchLayoutMetrics) -> some View {
    let bottomH = WatchLayoutMetrics.caloriesBottomBarHeight
    let ringSize = metrics.heroDialSize(bottomBar: bottomH)

    return watchPageShell(
      metrics: metrics,
      icon: "flame.fill",
      title: "Calories",
      bottomBarHeight: bottomH,
      footerBackgroundColor: PhysiqTheme.card.opacity(0.5)
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
          .font(.system(size: metrics.heroCalorieFontSize(for: ringSize), weight: .bold))
          .monospacedDigit()
          .foregroundStyle(PhysiqTheme.textPrimary)
          .minimumScaleFactor(0.6)
          .lineLimit(1)
        Text("cal left")
          .font(.system(size: 10, weight: .semibold))
          .foregroundStyle(PhysiqTheme.textSecondary)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
  }

  private func caloriesSplitStats(metrics: WatchLayoutMetrics) -> some View {
    HStack(spacing: 0) {
      calorieStatCell("Target", formatInt(snapshot.caloriesTarget), accentValue: false)
      Rectangle().fill(PhysiqTheme.textTertiary.opacity(0.35)).frame(width: 1)
      calorieStatCell("Consumed", formatInt(snapshot.caloriesConsumed), accentValue: true)
    }
    .frame(maxWidth: .infinity)
    .background(PhysiqTheme.card.opacity(0.5))
  }

  private func calorieStatCell(_ title: String, _ value: String, accentValue: Bool) -> some View {
    VStack(spacing: 1) {
      Text(title)
        .font(.system(size: 8, weight: .heavy))
        .foregroundStyle(PhysiqTheme.textTertiary)
      Text(value)
        .font(.system(size: 15, weight: .bold))
        .monospacedDigit()
        .foregroundStyle(accentValue ? accent : PhysiqTheme.textPrimary)
        .minimumScaleFactor(0.7)
        .lineLimit(1)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }

  // MARK: - Macros

  private func macrosPage(metrics: WatchLayoutMetrics) -> some View {
    let bottomH = metrics.footerBarHeight()
    let ringSize = metrics.macroDialSize(bottomBar: bottomH)

    return watchPageShell(
      metrics: metrics,
      icon: "chart.bar.fill",
      title: "Macros",
      bottomBarHeight: bottomH,
      footerBackgroundColor: .clear,
      tileFooter: true
    ) {
      VStack(spacing: 4) {
        if let line = voiceMealStatusLine {
          HStack(spacing: 4) {
            if voiceMealSending {
              ProgressView()
                .scaleEffect(0.7)
                .tint(accent)
            }
            Text(line)
              .font(.system(size: 9, weight: .medium))
              .foregroundStyle(PhysiqTheme.textSecondary)
              .multilineTextAlignment(.center)
              .lineLimit(2)
          }
          .frame(maxWidth: .infinity)
        }
        HStack(spacing: WatchLayoutMetrics.macroRowGap) {
          macroCell(title: "Protein", consumed: snapshot.proteinConsumed, target: snapshot.proteinTarget,
                    ring: PhysiqTheme.color(hex: snapshot.proteinHex, fallback: PhysiqTheme.protein),
                    ringSize: ringSize, metrics: metrics)
          macroCell(title: "Carbs", consumed: snapshot.carbsConsumed, target: snapshot.carbsTarget,
                    ring: PhysiqTheme.color(hex: snapshot.carbsHex, fallback: PhysiqTheme.carbs),
                    ringSize: ringSize, metrics: metrics)
          macroCell(title: "Fat", consumed: snapshot.fatConsumed, target: snapshot.fatTarget,
                    ring: PhysiqTheme.color(hex: snapshot.fatHex, fallback: PhysiqTheme.fat),
                    ringSize: ringSize, metrics: metrics)
        }
        .padding(.horizontal, 6)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
      .onChange(of: snapshot.voiceMealFeedback) { newValue in
        guard !newValue.isEmpty else { return }
        voiceMealStatus = ""
        voiceMealSending = false
      }
    } bottomBar: {
      VoiceMealMicBar(
        metrics: metrics,
        accent: accent,
        statusMessage: $voiceMealStatus,
        isSending: $voiceMealSending,
        onLegacyTap: { voiceMealLegacySheetVisible = true }
      )
    }
    .sheet(isPresented: $voiceMealLegacySheetVisible) {
      VoiceMealLegacySheet(statusMessage: $voiceMealStatus, isSending: $voiceMealSending)
        .environmentObject(connectivity)
    }
  }

  private var voiceMealStatusLine: String? {
    if !snapshot.voiceMealFeedback.isEmpty { return snapshot.voiceMealFeedback }
    if voiceMealSending { return voiceMealStatus.isEmpty ? "Sending…" : voiceMealStatus }
    if !voiceMealStatus.isEmpty { return voiceMealStatus }
    return nil
  }

  private func macroCell(
    title: String,
    consumed: Double,
    target: Double,
    ring: Color,
    ringSize: CGFloat,
    metrics: WatchLayoutMetrics
  ) -> some View {
    let labelSize = max(11, ringSize * 0.25)
    return VStack(spacing: 2) {
      ZStack {
        MacroInstrumentDial(
          progress: snapshot.progress(consumed: consumed, target: target),
          color: ring,
          lineWidth: metrics.miniRingLineWidth(for: ringSize),
          size: ringSize
        )
        Text("\(percent(consumed, target))%")
          .font(.system(size: max(9, ringSize * 0.22), weight: .heavy))
          .monospacedDigit()
          .foregroundStyle(ring)
          .minimumScaleFactor(0.6)
          .lineLimit(1)
      }
      Text(title)
        .font(.system(size: labelSize, weight: .heavy))
        .foregroundStyle(PhysiqTheme.textPrimary)
        .minimumScaleFactor(0.7)
        .lineLimit(1)
    }
    .frame(maxWidth: .infinity)
  }

  // MARK: - Hydration

  private func hydrationPage(metrics: WatchLayoutMetrics) -> some View {
    let bottomH = metrics.footerBarHeight()
    let ringSize = metrics.heroDialSize(bottomBar: bottomH)

    return watchPageShell(
      metrics: metrics,
      icon: "drop.fill",
      title: "Hydration",
      iconColor: hydrationColor,
      bottomBarHeight: bottomH,
      footerBackgroundColor: .clear,
      tileFooter: true
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
        Text(
          HydrationFormat.formatRemaining(
            consumedMl: snapshot.hydrationConsumed,
            targetMl: snapshot.hydrationTarget,
            unit: snapshot.hydrationUnit
          )
        )
          .font(.system(size: metrics.heroCalorieFontSize(for: ringSize), weight: .bold))
          .monospacedDigit()
          .foregroundStyle(PhysiqTheme.textPrimary)
          .minimumScaleFactor(0.6)
          .lineLimit(1)
        Text(HydrationFormat.leftLabel(unit: snapshot.hydrationUnit))
          .font(.system(size: 10, weight: .semibold))
          .foregroundStyle(PhysiqTheme.textSecondary)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
  }

  private func hydrationSplitBar(metrics: WatchLayoutMetrics) -> some View {
    let presets = HydrationFormat.quickAdds(snapshot.hydrationUnit)
    let buttonH = metrics.footerButtonHeight()
    let radius = metrics.tileCornerRadius(buttonHeight: buttonH)
    let gap = WatchLayoutMetrics.todayTileGap
    return HStack(spacing: gap) {
      ForEach(Array(presets.enumerated()), id: \.element.label) { _, preset in
        Button {
          WatchInteractionFeedback.play(.tap)
          connectivity.logWater(ml: preset.ml)
        } label: {
          Text(preset.label)
            .font(.system(size: 12, weight: .bold))
            .minimumScaleFactor(0.7)
            .lineLimit(1)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .buttonStyle(PhysiqPressableButtonStyle())
        .foregroundStyle(PhysiqTheme.background)
        .background(
          RoundedRectangle(cornerRadius: radius, style: .continuous).fill(hydrationColor)
        )
        .frame(height: buttonH)
      }
    }
    .frame(maxWidth: .infinity)
  }

  // MARK: - Today

  private func todayPage(metrics: WatchLayoutMetrics) -> some View {
    let selectedOverride = connectivity.resolvedDayTypeOverride(fallback: snapshot.dayTypeOverride)
    let tileGap = WatchLayoutMetrics.todayTileGap
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
        tileSide: tileSide,
        tileGap: tileGap
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
        .font(.system(size: 14, weight: .semibold))
        .foregroundStyle(PhysiqTheme.textPrimary)
      Text("Open Physiq on your iPhone — targets sync automatically when the app is running.")
        .font(.system(size: 11, weight: .medium))
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
