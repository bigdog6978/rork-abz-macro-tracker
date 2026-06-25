import SwiftUI

private struct DayTypeOption: Identifiable {
  let id: String
  let label: String
  let icon: String
}

/// 2×2 equal tile picker — one shared gutter for horizontal and vertical spacing.
struct DayTypePicker: View {
  let accent: Color
  let selectedId: String
  let tileSide: CGFloat
  let tileGap: CGFloat
  let onSelect: (String) -> Void

  private let options: [DayTypeOption] = [
    DayTypeOption(id: "auto", label: "Auto", icon: "sparkles"),
    DayTypeOption(id: "training", label: "Train", icon: "figure.run"),
    DayTypeOption(id: "competition", label: "Comp", icon: "trophy.fill"),
    DayTypeOption(id: "rest", label: "Rest", icon: "moon.zzz.fill"),
  ]

  private var gridWidth: CGFloat { tileSide * 2 + tileGap }
  private var gridHeight: CGFloat { tileSide * 2 + tileGap }

  var body: some View {
    VStack(spacing: tileGap) {
      tileRow(options[0], options[1])
      tileRow(options[2], options[3])
    }
    .frame(width: gridWidth, height: gridHeight)
  }

  private func tileRow(_ left: DayTypeOption, _ right: DayTypeOption) -> some View {
    HStack(spacing: tileGap) {
      dayTypeButton(left)
      dayTypeButton(right)
    }
  }

  private func dayTypeButton(_ option: DayTypeOption) -> some View {
    let isSelected = selectedId == option.id
    return Button {
      WatchInteractionFeedback.play(.select)
      onSelect(option.id)
    } label: {
      VStack(spacing: 2) {
        Image(systemName: option.icon)
          .font(.system(size: max(12, tileSide * 0.22), weight: .bold))
        Text(option.label)
          .font(.system(size: max(9, tileSide * 0.14), weight: .bold))
          .minimumScaleFactor(0.7)
          .lineLimit(1)
      }
      .frame(width: tileSide, height: tileSide)
    }
    .buttonStyle(PhysiqSelectButtonStyle())
    .foregroundStyle(isSelected ? PhysiqTheme.background : accent)
    .background(
      RoundedRectangle(cornerRadius: WatchLayoutMetrics.tileCornerRadius, style: .continuous)
        .fill(isSelected ? accent : PhysiqTheme.card.opacity(0.35))
    )
    .overlay(
      RoundedRectangle(cornerRadius: WatchLayoutMetrics.tileCornerRadius, style: .continuous)
        .stroke(isSelected ? accent : accent.opacity(0.5), lineWidth: isSelected ? 0 : 1)
    )
  }
}
