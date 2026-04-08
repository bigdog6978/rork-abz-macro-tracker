import SwiftUI

struct ContentView: View {
  @EnvironmentObject private var connectivity: WatchConnectivityManager

  private var snapshot: WatchSnapshot {
    WatchSnapshot.parse(connectivity.context)
  }

  private var accent: Color {
    PhysiqTheme.color(hex: snapshot.primaryHex, fallback: PhysiqTheme.defaultAccent)
  }

  /// `.tracking` is watchOS 9+; minimum deployment is 8.0.
  @ViewBuilder
  private func physiqWordmark(accent: Color) -> some View {
    if #available(watchOS 9.0, *) {
      Text("PHYSIQ")
        .font(.system(size: 11, weight: .heavy, design: .rounded))
        .foregroundStyle(accent)
        .tracking(1.2)
    } else {
      Text("PHYSIQ")
        .font(.system(size: 11, weight: .heavy, design: .rounded))
        .foregroundStyle(accent)
    }
  }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 10) {
        header
        if snapshot.hasData {
          calorieHero
          macroRow
          hydrationBlock
        } else {
          emptyState
        }
        syncFooter
        hydrationButton
      }
      .padding(.horizontal, 10)
      .padding(.vertical, 8)
    }
    .background(PhysiqTheme.background)
  }

  private var header: some View {
    VStack(alignment: .leading, spacing: 4) {
      physiqWordmark(accent: accent)
      if !snapshot.firstName.isEmpty {
        Text(greetingName)
          .font(.system(size: 17, weight: .bold, design: .rounded))
          .foregroundStyle(PhysiqTheme.textPrimary)
      }
      if !snapshot.dietLine.isEmpty {
        Text(snapshot.dietLine)
          .font(.system(size: 11, weight: .medium, design: .rounded))
          .foregroundStyle(PhysiqTheme.textSecondary)
          .lineLimit(2)
      }
      HStack(spacing: 6) {
        Circle()
          .fill(statusColor)
          .frame(width: 6, height: 6)
        Text(statusLine)
          .font(.system(size: 10, weight: .medium, design: .rounded))
          .foregroundStyle(PhysiqTheme.textTertiary)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  private var greetingName: String {
    let h = Calendar.current.component(.hour, from: Date())
    let part: String
    if h < 12 { part = "Good morning" }
    else if h < 17 { part = "Good afternoon" }
    else { part = "Good evening" }
    return "\(part), \(snapshot.firstName)"
  }

  private var statusLine: String {
    var parts: [String] = [connectivity.activationLabel]
    if connectivity.phoneReachable {
      parts.append("iPhone reachable")
    }
    return parts.joined(separator: " · ")
  }

  private var statusColor: Color {
    connectivity.activationLabel == "Ready" ? accent : Color.orange.opacity(0.9)
  }

  private var calorieHero: some View {
    HStack(alignment: .center, spacing: 10) {
      ZStack {
        RingGaugeView(
          progress: snapshot.progress(consumed: snapshot.caloriesConsumed, target: snapshot.caloriesTarget),
          color: accent,
          lineWidth: 7,
          size: 92
        )
        VStack(spacing: 1) {
          Text(formatInt(snapshot.caloriesRemaining))
            .font(.system(size: 22, weight: .bold, design: .rounded))
            .monospacedDigit()
            .foregroundStyle(PhysiqTheme.textPrimary)
            .minimumScaleFactor(0.7)
            .lineLimit(1)
          Text("cal left")
            .font(.system(size: 10, weight: .semibold, design: .rounded))
            .foregroundStyle(PhysiqTheme.textSecondary)
        }
        .padding(6)
      }
      VStack(alignment: .leading, spacing: 6) {
        statLine("Target", formatInt(snapshot.caloriesTarget), accent: false)
        statLine("Consumed", formatInt(snapshot.caloriesConsumed), accent: true)
        if snapshot.streak > 0 {
          HStack(spacing: 4) {
            Image(systemName: "flame.fill")
              .font(.system(size: 11))
              .foregroundStyle(accent)
            Text("\(snapshot.streak) day streak")
              .font(.system(size: 11, weight: .semibold, design: .rounded))
              .foregroundStyle(accent)
          }
          .padding(.top, 2)
        }
      }
      Spacer(minLength: 0)
    }
    .padding(10)
    .background(
      RoundedRectangle(cornerRadius: 14, style: .continuous)
        .fill(PhysiqTheme.card)
    )
  }

  private func statLine(_ title: String, _ value: String, accent: Bool) -> some View {
    HStack {
      Text(title)
        .font(.system(size: 11, weight: .medium, design: .rounded))
        .foregroundStyle(PhysiqTheme.textSecondary)
      Spacer()
      Text(value)
        .font(.system(size: 13, weight: .bold, design: .rounded))
        .monospacedDigit()
        .foregroundStyle(accent ? self.accent : PhysiqTheme.textPrimary)
    }
  }

  private var macroRow: some View {
    HStack(spacing: 6) {
      macroCell(
        "Protein",
        consumed: snapshot.proteinConsumed,
        target: snapshot.proteinTarget,
        ring: PhysiqTheme.color(hex: snapshot.proteinHex, fallback: PhysiqTheme.protein)
      )
      macroCell(
        "Carbs",
        consumed: snapshot.carbsConsumed,
        target: snapshot.carbsTarget,
        ring: PhysiqTheme.color(hex: snapshot.carbsHex, fallback: PhysiqTheme.carbs)
      )
      macroCell(
        "Fat",
        consumed: snapshot.fatConsumed,
        target: snapshot.fatTarget,
        ring: PhysiqTheme.color(hex: snapshot.fatHex, fallback: PhysiqTheme.fat)
      )
    }
  }

  private func macroCell(_ title: String, consumed: Double, target: Double, ring: Color) -> some View {
    VStack(spacing: 4) {
      ZStack {
        RingGaugeView(
          progress: snapshot.progress(consumed: consumed, target: target),
          color: ring,
          lineWidth: 5,
          size: 48
        )
        Text("\(percent(consumed, target))%")
          .font(.system(size: 10, weight: .bold, design: .rounded))
          .foregroundStyle(PhysiqTheme.textPrimary)
      }
      Text(title.uppercased())
        .font(.system(size: 8, weight: .heavy, design: .rounded))
        .foregroundStyle(PhysiqTheme.textTertiary)
      Text("\(formatOne(consumed))/\(formatOne(target))g")
        .font(.system(size: 9, weight: .semibold, design: .rounded))
        .monospacedDigit()
        .foregroundStyle(PhysiqTheme.textSecondary)
        .lineLimit(1)
        .minimumScaleFactor(0.6)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 8)
    .background(
      RoundedRectangle(cornerRadius: 12, style: .continuous)
        .fill(PhysiqTheme.card)
    )
  }

  private var hydrationBlock: some View {
    VStack(alignment: .leading, spacing: 6) {
      HStack {
        Text("Hydration")
          .font(.system(size: 12, weight: .bold, design: .rounded))
          .foregroundStyle(PhysiqTheme.textPrimary)
        Spacer()
        Text("\(formatInt(snapshot.hydrationConsumed)) / \(formatInt(snapshot.hydrationTarget)) ml")
          .font(.system(size: 11, weight: .semibold, design: .rounded))
          .monospacedDigit()
          .foregroundStyle(accent)
      }
      GeometryReader { geo in
        ZStack(alignment: .leading) {
          Capsule()
            .fill(PhysiqTheme.track)
          Capsule()
            .fill(accent.opacity(0.85))
            .frame(width: max(4, geo.size.width * snapshot.progress(
              consumed: snapshot.hydrationConsumed,
              target: snapshot.hydrationTarget
            )))
        }
      }
      .frame(height: 6)
      .accessibilityLabel(Text("Hydration progress"))
    }
    .padding(10)
    .background(
      RoundedRectangle(cornerRadius: 14, style: .continuous)
        .fill(PhysiqTheme.card)
    )
  }

  private var emptyState: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text("No macro data yet")
        .font(.system(size: 14, weight: .semibold, design: .rounded))
        .foregroundStyle(PhysiqTheme.textPrimary)
      Text("Open Physiq on your iPhone — targets sync automatically when the app is running.")
        .font(.system(size: 11, weight: .medium, design: .rounded))
        .foregroundStyle(PhysiqTheme.textSecondary)
        .fixedSize(horizontal: false, vertical: true)
    }
    .padding(12)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(
      RoundedRectangle(cornerRadius: 14, style: .continuous)
        .stroke(PhysiqTheme.textTertiary.opacity(0.35), lineWidth: 1)
    )
  }

  private var syncFooter: some View {
    Group {
      if let u = snapshot.updatedAt {
        Text("Updated \(shortTime(u))")
          .font(.system(size: 9, weight: .medium, design: .rounded))
          .foregroundStyle(PhysiqTheme.textTertiary)
      }
      if !snapshot.tier.isEmpty, snapshot.tier != "core" {
        Text(snapshot.tier.uppercased())
          .font(.system(size: 9, weight: .heavy, design: .rounded))
          .foregroundStyle(accent.opacity(0.9))
      }
      if !snapshot.athleteSport.isEmpty {
        Text(snapshot.athleteSport)
          .font(.system(size: 9, weight: .medium, design: .rounded))
          .foregroundStyle(PhysiqTheme.textSecondary)
      }
    }
  }

  private var hydrationButton: some View {
    Button(action: { connectivity.sendHydrationAck() }) {
      Text("Log +250 ml")
        .font(.system(size: 14, weight: .bold, design: .rounded))
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
    }
    .buttonStyle(.plain)
    .background(
      RoundedRectangle(cornerRadius: 12, style: .continuous)
        .fill(accent)
    )
    .foregroundStyle(PhysiqTheme.background)
    .padding(.top, 4)
    .accessibilityLabel(Text("Log 250 milliliters of hydration"))
  }

  private func formatInt(_ v: Double) -> String {
    String(Int(round(v)))
  }

  private func formatOne(_ v: Double) -> String {
    String(format: "%.1f", v)
  }

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
