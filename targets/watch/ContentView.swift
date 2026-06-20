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

  var body: some View {
    Group {
      if snapshot.hasData {
        TabView {
          page { caloriesPage }
          page { macrosPage }
          page { hydrationPage }
          page { todayPage }
        }
        .tabViewStyle(PageTabViewStyle())
      } else {
        ScrollView { emptyState.padding(10) }
      }
    }
    .background(PhysiqTheme.background.ignoresSafeArea())
  }

  @ViewBuilder
  private func page<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
    ScrollView {
      VStack(spacing: 10) { content() }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
    }
  }

  // MARK: - Calories

  private var caloriesPage: some View {
    VStack(spacing: 10) {
      pageHeader(icon: "flame.fill", title: "Calories")
      ZStack {
        RingGaugeView(
          progress: snapshot.progress(consumed: snapshot.caloriesConsumed, target: snapshot.caloriesTarget),
          color: accent,
          lineWidth: 9,
          size: 120
        )
        VStack(spacing: 1) {
          Image(systemName: "flame.fill")
            .font(.system(size: 14))
            .foregroundStyle(accent)
          Text(formatInt(snapshot.caloriesRemaining))
            .font(.system(size: 30, weight: .bold, design: .rounded))
            .monospacedDigit()
            .foregroundStyle(PhysiqTheme.textPrimary)
            .minimumScaleFactor(0.6)
            .lineLimit(1)
          Text("cal left")
            .font(.system(size: 11, weight: .semibold, design: .rounded))
            .foregroundStyle(PhysiqTheme.textSecondary)
        }
      }
      HStack(spacing: 8) {
        miniStat("Target", formatInt(snapshot.caloriesTarget), accentValue: false)
        miniStat("Eaten", formatInt(snapshot.caloriesConsumed), accentValue: true)
      }
      if snapshot.streak > 0 {
        HStack(spacing: 4) {
          Image(systemName: "flame.fill").font(.system(size: 11)).foregroundStyle(accent)
          Text("\(snapshot.streak) day streak")
            .font(.system(size: 11, weight: .semibold, design: .rounded))
            .foregroundStyle(accent)
        }
      }
    }
  }

  // MARK: - Macros

  private var macrosPage: some View {
    VStack(spacing: 10) {
      pageHeader(icon: "chart.bar.fill", title: "Macros")
      HStack(spacing: 6) {
        macroCell("Protein", icon: "bolt.fill", consumed: snapshot.proteinConsumed, target: snapshot.proteinTarget,
                  ring: PhysiqTheme.color(hex: snapshot.proteinHex, fallback: PhysiqTheme.protein))
        macroCell("Carbs", icon: "leaf.fill", consumed: snapshot.carbsConsumed, target: snapshot.carbsTarget,
                  ring: PhysiqTheme.color(hex: snapshot.carbsHex, fallback: PhysiqTheme.carbs))
        macroCell("Fat", icon: "drop.triangle.fill", consumed: snapshot.fatConsumed, target: snapshot.fatTarget,
                  ring: PhysiqTheme.color(hex: snapshot.fatHex, fallback: PhysiqTheme.fat))
      }
      actionButton(icon: "mic.fill", label: "Speak meal") {
        voiceMealSheetVisible = true
      }
      if !snapshot.voiceMealFeedback.isEmpty {
        Text(snapshot.voiceMealFeedback)
          .font(.system(size: 10, weight: .medium, design: .rounded))
          .foregroundStyle(PhysiqTheme.textSecondary)
          .multilineTextAlignment(.center)
          .lineLimit(3)
          .frame(maxWidth: .infinity)
      }
    }
    .sheet(isPresented: $voiceMealSheetVisible) {
      VoiceMealSheet()
        .environmentObject(connectivity)
    }
  }

  private func macroCell(_ title: String, icon: String, consumed: Double, target: Double, ring: Color) -> some View {
    VStack(spacing: 4) {
      ZStack {
        RingGaugeView(progress: snapshot.progress(consumed: consumed, target: target), color: ring, lineWidth: 5, size: 50)
        Image(systemName: icon).font(.system(size: 13)).foregroundStyle(ring)
      }
      Text(title.uppercased())
        .font(.system(size: 8, weight: .heavy, design: .rounded))
        .foregroundStyle(PhysiqTheme.textTertiary)
      Text("\(percent(consumed, target))%")
        .font(.system(size: 11, weight: .bold, design: .rounded))
        .monospacedDigit()
        .foregroundStyle(PhysiqTheme.textPrimary)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 8)
    .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(PhysiqTheme.card))
  }

  // MARK: - Hydration

  private var hydrationPage: some View {
    VStack(spacing: 10) {
      pageHeader(icon: "drop.fill", title: "Hydration")
      ZStack {
        RingGaugeView(
          progress: snapshot.progress(consumed: snapshot.hydrationConsumed, target: snapshot.hydrationTarget),
          color: PhysiqTheme.color(hex: snapshot.carbsHex, fallback: PhysiqTheme.carbs),
          lineWidth: 9,
          size: 110
        )
        VStack(spacing: 1) {
          Image(systemName: "drop.fill")
            .font(.system(size: 16))
            .foregroundStyle(PhysiqTheme.color(hex: snapshot.carbsHex, fallback: PhysiqTheme.carbs))
          Text(snapshot.hydrationDisplay)
            .font(.system(size: 16, weight: .bold, design: .rounded))
            .monospacedDigit()
            .foregroundStyle(PhysiqTheme.textPrimary)
            .minimumScaleFactor(0.6)
            .lineLimit(1)
          Text(HydrationFormat.unitLabel(snapshot.hydrationUnit))
            .font(.system(size: 10, weight: .semibold, design: .rounded))
            .foregroundStyle(PhysiqTheme.textSecondary)
        }
      }
      HStack(spacing: 6) {
        ForEach(HydrationFormat.quickAdds(snapshot.hydrationUnit), id: \.label) { preset in
          actionButton(icon: "plus", label: preset.label) {
            connectivity.logWater(ml: preset.ml)
          }
        }
      }
    }
  }

  // MARK: - Today / Training

  private var todayPage: some View {
    VStack(spacing: 10) {
      pageHeader(icon: dayTypeIcon, title: "Today")
      VStack(alignment: .leading, spacing: 6) {
        HStack(spacing: 6) {
          Image(systemName: dayTypeIcon).font(.system(size: 14)).foregroundStyle(accent)
          Text(snapshot.dayTypeLabel.isEmpty ? "Set your day" : snapshot.dayTypeLabel)
            .font(.system(size: 15, weight: .bold, design: .rounded))
            .foregroundStyle(PhysiqTheme.textPrimary)
        }
        if !snapshot.healthLine.isEmpty {
          Text(snapshot.healthLine)
            .font(.system(size: 11, weight: .medium, design: .rounded))
            .foregroundStyle(PhysiqTheme.textSecondary)
            .lineLimit(2)
        } else if snapshot.healthConnected {
          Text("Apple Health connected")
            .font(.system(size: 11, weight: .medium, design: .rounded))
            .foregroundStyle(PhysiqTheme.textSecondary)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding(10)
      .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(PhysiqTheme.card))

      VStack(spacing: 6) {
        Text("Mark day type")
          .font(.system(size: 10, weight: .heavy, design: .rounded))
          .foregroundStyle(PhysiqTheme.textTertiary)
          .frame(maxWidth: .infinity, alignment: .leading)
        HStack(spacing: 6) {
          actionButton(icon: "figure.run", label: "Train") { connectivity.setDayType("training") }
          actionButton(icon: "trophy.fill", label: "Comp") { connectivity.setDayType("competition") }
          actionButton(icon: "moon.zzz.fill", label: "Rest") { connectivity.setDayType("rest") }
        }
      }
      if let u = snapshot.updatedAt {
        Text("Updated \(shortTime(u))")
          .font(.system(size: 9, weight: .medium, design: .rounded))
          .foregroundStyle(PhysiqTheme.textTertiary)
      }
    }
  }

  private var dayTypeIcon: String {
    switch snapshot.dayType {
    case "workout_day": return "figure.run"
    case "high_activity_day": return "bolt.heart.fill"
    case "rest_day": return "moon.zzz.fill"
    default: return "calendar"
    }
  }

  // MARK: - Shared pieces

  private func pageHeader(icon: String, title: String) -> some View {
    HStack(spacing: 6) {
      Image(systemName: icon).font(.system(size: 12, weight: .bold)).foregroundStyle(accent)
      Text(title)
        .font(.system(size: 13, weight: .heavy, design: .rounded))
        .foregroundStyle(PhysiqTheme.textPrimary)
      Spacer(minLength: 0)
      Circle().fill(statusColor).frame(width: 6, height: 6)
    }
  }

  private func miniStat(_ title: String, _ value: String, accentValue: Bool) -> some View {
    VStack(spacing: 2) {
      Text(title.uppercased())
        .font(.system(size: 9, weight: .heavy, design: .rounded))
        .foregroundStyle(PhysiqTheme.textTertiary)
      Text(value)
        .font(.system(size: 16, weight: .bold, design: .rounded))
        .monospacedDigit()
        .foregroundStyle(accentValue ? accent : PhysiqTheme.textPrimary)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 8)
    .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(PhysiqTheme.card))
  }

  private func actionButton(icon: String, label: String, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      VStack(spacing: 3) {
        Image(systemName: icon).font(.system(size: 14, weight: .bold))
        Text(label)
          .font(.system(size: 11, weight: .bold, design: .rounded))
          .minimumScaleFactor(0.7)
          .lineLimit(1)
      }
      .frame(maxWidth: .infinity)
      .padding(.vertical, 9)
    }
    .buttonStyle(.plain)
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
