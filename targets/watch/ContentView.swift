import SwiftUI

/// Paged, icon-led Physiq watch UI. Each page answers one question at a glance and inherits the
/// Physiq brand (dark background, chartreuse accent). All data is phone-driven via WatchConnectivity.
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
          WatchPageContainer { metrics in
            caloriesPage(metrics: metrics)
          }
          WatchPageContainer { metrics in
            macrosPage(metrics: metrics)
          }
          WatchPageContainer { metrics in
            hydrationPage(metrics: metrics)
          }
          WatchPageContainer { metrics in
            todayPage(metrics: metrics)
          }
        }
        .tabViewStyle(PageTabViewStyle())
        .ignoresSafeArea(.container, edges: [.bottom])
      } else {
        WatchPageContainer(scrollable: true) { _ in
          emptyState
        }
      }
    }
    .background(PhysiqTheme.background.ignoresSafeArea())
  }

  // MARK: - Calories

  private func caloriesPage(metrics: WatchLayoutMetrics) -> some View {
    let showStreak = metrics.showsStreakRow && snapshot.streak > 0
    let footerHeight = metrics.caloriesFooterHeight(showStreak: showStreak)
    let ringSize = metrics.heroRingSize(footerHeight: footerHeight)

    return immersivePage(
      metrics: metrics,
      icon: "flame.fill",
      title: "Calories",
      footerHeight: footerHeight
    ) {
      caloriesHeroRing(ringSize: ringSize, metrics: metrics)
    } footer: {
      VStack(spacing: metrics.pageSpacing) {
        HStack(spacing: 8) {
          miniStat("Target", formatInt(snapshot.caloriesTarget), accentValue: false, metrics: metrics)
          miniStat("Eaten", formatInt(snapshot.caloriesConsumed), accentValue: true, metrics: metrics)
        }
        if showStreak {
          HStack(spacing: 4) {
            Image(systemName: "flame.fill").font(.system(size: 11)).foregroundStyle(accent)
            Text("\(snapshot.streak) day streak")
              .font(.system(size: 11, weight: .semibold, design: .rounded))
              .foregroundStyle(accent)
          }
        }
      }
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
          .font(.system(size: 11, weight: .semibold, design: .rounded))
          .foregroundStyle(PhysiqTheme.textSecondary)
      }
    }
    .frame(maxWidth: .infinity)
  }

  // MARK: - Macros

  private func macrosPage(metrics: WatchLayoutMetrics) -> some View {
    let hasFeedback = !snapshot.voiceMealFeedback.isEmpty
    let footerHeight = metrics.macrosFooterHeight(hasFeedback: hasFeedback)
    let ringSize = metrics.macroRingSize(footerHeight: footerHeight)

    return immersivePage(
      metrics: metrics,
      icon: "chart.bar.fill",
      title: "Macros",
      footerHeight: footerHeight
    ) {
      HStack(spacing: 4) {
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
    } footer: {
      VStack(spacing: metrics.pageSpacing) {
        actionButton(icon: "mic.fill", label: "Speak meal", metrics: metrics) {
          voiceMealSheetVisible = true
        }
        if hasFeedback {
          Text(snapshot.voiceMealFeedback)
            .font(.system(size: 10, weight: .medium, design: .rounded))
            .foregroundStyle(PhysiqTheme.textSecondary)
            .multilineTextAlignment(.center)
            .lineLimit(2)
            .frame(maxWidth: .infinity)
        }
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
    VStack(spacing: 4) {
      ZStack {
        MacroInstrumentDial(
          progress: snapshot.progress(consumed: consumed, target: target),
          color: ring,
          lineWidth: metrics.miniRingLineWidth(for: ringSize),
          size: ringSize
        )
        Text("\(percent(consumed, target))%")
          .font(.system(size: max(10, ringSize * 0.22), weight: .heavy, design: .rounded))
          .monospacedDigit()
          .foregroundStyle(ring)
          .minimumScaleFactor(0.6)
          .lineLimit(1)
      }
      Text(title.uppercased())
        .font(.system(size: 8, weight: .heavy, design: .rounded))
        .foregroundStyle(PhysiqTheme.textTertiary)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 4)
    .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(PhysiqTheme.card))
  }

  // MARK: - Hydration

  private func hydrationPage(metrics: WatchLayoutMetrics) -> some View {
    let footerHeight = metrics.hydrationFooterHeight
    let ringSize = metrics.heroRingSize(footerHeight: footerHeight)

    return immersivePage(
      metrics: metrics,
      icon: "drop.fill",
      title: "Hydration",
      iconColor: hydrationColor,
      statusDotColor: hydrationColor,
      footerHeight: footerHeight
    ) {
      hydrationHeroRing(ringSize: ringSize, metrics: metrics)
    } footer: {
      HStack(spacing: 6) {
        ForEach(HydrationFormat.quickAdds(snapshot.hydrationUnit), id: \.label) { preset in
          hydrationActionButton(label: preset.label, metrics: metrics) {
            connectivity.logWater(ml: preset.ml)
          }
        }
      }
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
          .font(.system(size: max(14, ringSize * 0.14)))
          .foregroundStyle(hydrationColor)
        Text(snapshot.hydrationDisplay)
          .font(.system(size: min(20, ringSize * 0.15), weight: .bold, design: .rounded))
          .monospacedDigit()
          .foregroundStyle(PhysiqTheme.textPrimary)
          .minimumScaleFactor(0.6)
          .lineLimit(1)
        Text(HydrationFormat.unitLabel(snapshot.hydrationUnit))
          .font(.system(size: 10, weight: .semibold, design: .rounded))
          .foregroundStyle(PhysiqTheme.textSecondary)
      }
    }
    .frame(maxWidth: .infinity)
  }

  // MARK: - Today / Training

  private func todayPage(metrics: WatchLayoutMetrics) -> some View {
    let selectedOverride = connectivity.resolvedDayTypeOverride(fallback: snapshot.dayTypeOverride)
    let touchHeight = metrics.dayTypeTouchHeight()

    return ZStack(alignment: .top) {
      VStack(spacing: 0) {
        todayHeadlineCard()
          .padding(.top, metrics.contentBandTop)
        Spacer(minLength: 0)
      }
      .frame(height: metrics.layoutHeight, alignment: .top)

      VStack(spacing: 6) {
        Text("Day type")
          .font(.system(size: 10, weight: .heavy, design: .rounded))
          .foregroundStyle(PhysiqTheme.textTertiary)
          .frame(maxWidth: .infinity, alignment: .leading)
        DayTypePicker(
          accent: accent,
          selectedId: selectedOverride,
          minTouchHeight: touchHeight
        ) { dayType in
          connectivity.setDayType(dayType)
        }
        if let feedback = connectivity.dayTypeFeedback, !feedback.isEmpty {
          Text(feedback)
            .font(.system(size: 10, weight: .medium, design: .rounded))
            .foregroundStyle(PhysiqTheme.textSecondary)
            .multilineTextAlignment(.center)
            .lineLimit(2)
            .frame(maxWidth: .infinity)
        }
      }
      .padding(.horizontal, max(0, metrics.footerHorizontalInset - metrics.horizontal))
      .frame(height: metrics.layoutHeight, alignment: .bottom)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)

      inlinePageHeader(icon: snapshot.todayIcon, title: "Today")
        .padding(.top, metrics.safeTop)
        .padding(.leading, max(0, metrics.safeLeading - metrics.horizontal))
    }
    .frame(width: metrics.size.width, height: metrics.layoutHeight, alignment: .top)
  }

  private func todayHeadlineCard() -> some View {
    VStack(alignment: .leading, spacing: 4) {
      HStack(spacing: 6) {
        Image(systemName: snapshot.todayIcon).font(.system(size: 13)).foregroundStyle(accent)
        Text(snapshot.todayHeadline)
          .font(.system(size: 14, weight: .bold, design: .rounded))
          .foregroundStyle(PhysiqTheme.textPrimary)
          .lineLimit(1)
          .minimumScaleFactor(0.8)
      }
      Text(snapshot.todaySubtitle)
        .font(.system(size: 10, weight: .medium, design: .rounded))
        .foregroundStyle(PhysiqTheme.textSecondary)
        .lineLimit(2)
    }
    .frame(maxWidth: .infinity, minHeight: WatchLayoutMetrics.todayHeadlineHeight, alignment: .leading)
    .padding(.horizontal, 8)
    .padding(.vertical, 6)
    .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(PhysiqTheme.card))
  }

  private var dayTypeIcon: String {
    snapshot.todayIcon
  }

  // MARK: - Shared pieces

  /// Three-layer immersive page: hero band, footer pinned to layout bottom, header in safe top band.
  private func immersivePage<Hero: View, Footer: View>(
    metrics: WatchLayoutMetrics,
    icon: String,
    title: String,
    iconColor: Color? = nil,
    statusDotColor: Color? = nil,
    footerHeight: CGFloat,
    @ViewBuilder hero: () -> Hero,
    @ViewBuilder footer: () -> Footer
  ) -> some View {
    let heroBand = max(0, metrics.layoutHeight - metrics.contentBandTop - footerHeight)
    let footerInset = max(0, metrics.footerHorizontalInset - metrics.horizontal)
    let headerLead = max(0, metrics.safeLeading - metrics.horizontal)

    return ZStack(alignment: .top) {
      hero()
        .frame(maxWidth: .infinity)
        .frame(height: heroBand, alignment: .center)
        .padding(.top, metrics.contentBandTop)

      footer()
        .padding(.horizontal, footerInset)
        .frame(height: metrics.layoutHeight, alignment: .bottom)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)

      inlinePageHeader(
        icon: icon,
        title: title,
        iconColor: iconColor,
        statusDotColor: statusDotColor
      )
      .padding(.top, metrics.safeTop)
      .padding(.leading, headerLead)
    }
    .frame(width: metrics.size.width, height: metrics.layoutHeight, alignment: .top)
  }

  /// Leading icon + title on the same row as the system clock (trailing clearance only).
  private func inlinePageHeader(
    icon: String,
    title: String,
    iconColor: Color? = nil,
    statusDotColor: Color? = nil,
    showStatusDot: Bool = true
  ) -> some View {
    HStack(spacing: 4) {
      Image(systemName: icon)
        .font(.system(size: 11, weight: .bold))
        .foregroundStyle(iconColor ?? accent)
      Text(title)
        .font(.system(size: 12, weight: .heavy, design: .rounded))
        .foregroundStyle(PhysiqTheme.textPrimary)
        .lineLimit(1)
      if showStatusDot {
        Circle()
          .fill(statusDotColor ?? statusColor)
          .frame(width: 5, height: 5)
      }
      Spacer(minLength: WatchLayoutMetrics.clockTrailingGap)
    }
    .frame(height: WatchLayoutMetrics.inlineHeaderHeight, alignment: .leading)
  }

  private func miniStat(
    _ title: String,
    _ value: String,
    accentValue: Bool,
    metrics: WatchLayoutMetrics
  ) -> some View {
    VStack(spacing: 2) {
      Text(title.uppercased())
        .font(.system(size: 9, weight: .heavy, design: .rounded))
        .foregroundStyle(PhysiqTheme.textTertiary)
      Text(value)
        .font(.system(size: 16, weight: .bold, design: .rounded))
        .monospacedDigit()
        .foregroundStyle(accentValue ? accent : PhysiqTheme.textPrimary)
        .minimumScaleFactor(0.7)
        .lineLimit(1)
    }
    .frame(maxWidth: .infinity, minHeight: metrics.minTouchHeight, alignment: .center)
    .padding(.vertical, 2)
    .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(PhysiqTheme.card))
  }

  private func hydrationActionButton(
    label: String,
    metrics: WatchLayoutMetrics,
    action: @escaping () -> Void
  ) -> some View {
    Button {
      WatchInteractionFeedback.play(.tap)
      action()
    } label: {
      VStack(spacing: 3) {
        Image(systemName: "plus").font(.system(size: 14, weight: .bold))
        Text(label)
          .font(.system(size: 11, weight: .bold, design: .rounded))
          .minimumScaleFactor(0.7)
          .lineLimit(1)
      }
      .frame(maxWidth: .infinity, minHeight: metrics.minTouchHeight)
    }
    .buttonStyle(PhysiqPressableButtonStyle())
    .foregroundStyle(PhysiqTheme.background)
    .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(hydrationColor))
  }

  private func actionButton(
    icon: String,
    label: String,
    metrics: WatchLayoutMetrics,
    action: @escaping () -> Void
  ) -> some View {
    Button {
      WatchInteractionFeedback.play(.tap)
      action()
    } label: {
      VStack(spacing: 3) {
        Image(systemName: icon).font(.system(size: 14, weight: .bold))
        Text(label)
          .font(.system(size: 11, weight: .bold, design: .rounded))
          .minimumScaleFactor(0.7)
          .lineLimit(1)
      }
      .frame(maxWidth: .infinity, minHeight: metrics.minTouchHeight)
    }
    .buttonStyle(PhysiqPressableButtonStyle())
    .foregroundStyle(PhysiqTheme.background)
    .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(accent))
  }

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
    .background(RoundedRectangle(cornerRadius: 14, style: .continuous).stroke(PhysiqTheme.textTertiary.opacity(0.35), lineWidth: 1))
  }

  // MARK: - Formatting

  private func formatInt(_ v: Double) -> String { String(Int(round(v))) }

  private func percent(_ c: Double, _ t: Double) -> Int {
    guard t > 0 else { return 0 }
    return Int(min(max((c / t) * 100, 0), 999))
  }

  private func shortTime(_ iso: String) -> String {
    let f = ISO8601DateFormatter()
    guard let d = f.date(from: iso) else { return "" }
    let out = DateFormatter()
    out.timeStyle = .short
    out.dateStyle = .none
    return out.string(from: d)
  }
}

#Preview {
  ContentView()
    .environmentObject(WatchConnectivityManager.shared)
}
