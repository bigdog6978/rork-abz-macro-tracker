import SwiftUI

struct ContentView: View {
  @EnvironmentObject private var connectivity: WatchConnectivityManager

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 10) {
        Text("Physiq")
          .font(.headline)
        Text(connectivity.activationLabel)
          .font(.caption)
          .foregroundStyle(.secondary)
        if connectivity.phoneReachable {
          Text("iPhone reachable")
            .font(.caption2)
            .foregroundStyle(.tertiary)
        }
        Divider()
        macroRow("Calories", connectivity.context["calories"])
        macroRow("Protein", connectivity.context["protein"])
        macroRow("Carbs", connectivity.context["carbs"])
        macroRow("Fat", connectivity.context["fat"])
        macroRow("Hydration", connectivity.context["hydration"])
        if let updated = connectivity.context["updatedAt"] {
          Text("Updated \(updated)")
            .font(.caption2)
            .foregroundStyle(.tertiary)
        }
        Button(action: { connectivity.sendHydrationAck() }) {
          Text("Log hydration (+250 ml)")
        }
        .buttonStyle(.borderedProminent)
        .padding(.top, 4)
      }
      .padding()
    }
  }

  private func macroRow(_ title: String, _ value: String?) -> some View {
    HStack {
      Text(title)
      Spacer()
      Text(value ?? "—")
        .monospacedDigit()
    }
    .font(.body)
  }
}

#Preview {
  ContentView()
    .environmentObject(WatchConnectivityManager.shared)
}
