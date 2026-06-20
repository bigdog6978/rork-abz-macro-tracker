import SwiftUI

private struct DayTypeOption: Identifiable {
  let id: String
  let label: String
  let icon: String
}

/// 2×2 picker matching iPhone Training Mode day-type overrides.
struct DayTypePicker: View {
  let accent: Color
  let selectedId: String
  let minTouchHeight: CGFloat
  let onSelect: (String) -> Void

  private let options: [DayTypeOption] = [
    DayTypeOption(id: "auto", label: "Auto", icon: "sparkles"),
    DayTypeOption(id: "training", label: "Train", icon: "figure.run"),
    DayTypeOption(id: "competition", label: "Comp", icon: "trophy.fill"),
    DayTypeOption(id: "rest", label: "Rest", icon: "moon.zzz.fill"),
  ]

  private let columns = [
    GridItem(.flexible(), spacing: 6),
    GridItem(.flexible(), spacing: 6),
  ]

  var body: some View {
    LazyVGrid(columns: columns, spacing: 6) {
      ForEach(options) { option in
        dayTypeButton(option)
      }
    }
  }

  private func dayTypeButton(_ option: DayTypeOption) -> some View {
    let isSelected = selectedId == option.id
    return Button {
      WatchInteractionFeedback.play(.select)
      onSelect(option.id)
    } label: {
      VStack(spacing: 3) {
        Image(systemName: option.icon)
          .font(.system(size: 13, weight: .bold))
        Text(option.label)
          .font(.system(size: 10, weight: .bold, design: .rounded))
          .minimumScaleFactor(0.7)
          .lineLimit(1)
      }
      .frame(maxWidth: .infinity, minHeight: minTouchHeight)
    }
    .buttonStyle(PhysiqSelectButtonStyle())
    .foregroundStyle(isSelected ? PhysiqTheme.background : accent)
    .background(
      RoundedRectangle(cornerRadius: 12, style: .continuous)
        .fill(isSelected ? accent : PhysiqTheme.card)
    )
    .overlay(
      RoundedRectangle(cornerRadius: 12, style: .continuous)
        .stroke(isSelected ? accent : accent.opacity(0.55), lineWidth: isSelected ? 0 : 1.5)
    )
  }
}
