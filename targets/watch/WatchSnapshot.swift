import Foundation

/// Parsed phone snapshot: new dashboard keys + legacy `calories`/`protein`/… targets-only fields.
struct WatchSnapshot {
  var firstName: String
  var caloriesRemaining: Double
  var caloriesTarget: Double
  var caloriesConsumed: Double
  var proteinConsumed: Double
  var proteinTarget: Double
  var carbsConsumed: Double
  var carbsTarget: Double
  var fatConsumed: Double
  var fatTarget: Double
  var hydrationConsumed: Double
  var hydrationTarget: Double
  var streak: Int
  var dietLine: String
  var primaryHex: String?
  var proteinHex: String?
  var carbsHex: String?
  var fatHex: String?
  var hydrationHex: String?
  var tier: String
  var athleteSport: String
  var syncState: String
  var syncMessage: String
  var updatedAt: String?
  var dayType: String
  var dayTypeLabel: String
  var dayTypeOverride: String
  var dayTypeOverrideLabel: String
  /// "override" when user picked manual day type; "inferred" when auto from Health.
  var dayTypeSource: String
  var healthConnected: Bool
  var activeEnergyKcal: Double
  var workoutMinutes: Double
  var healthLine: String
  /// Preferred hydration unit: "ml" | "oz" | "cup".
  var hydrationUnit: String
  /// Latest voice-meal result pushed from iPhone after watch dictation.
  var voiceMealFeedback: String

  var hasData: Bool {
    caloriesTarget > 0 || caloriesConsumed > 0 || proteinTarget > 0
  }

  static func parse(_ context: [String: String]) -> WatchSnapshot {
    func d(_ k: String) -> Double {
      Double(context[k] ?? "") ?? 0
    }
    let legacyCalTarget = d("calories")
    let legacyP = d("protein")
    let legacyC = d("carbs")
    let legacyF = d("fat")

    let cTarget = d("caloriesTarget") > 0 ? d("caloriesTarget") : legacyCalTarget
    let cConsumed = d("caloriesConsumed")
    let cRemaining = d("caloriesRemaining") > 0
      ? d("caloriesRemaining")
      : max(cTarget - cConsumed, 0)

    let pT = d("proteinTarget") > 0 ? d("proteinTarget") : legacyP
    let pC = d("proteinConsumed")
    let carbT = d("carbsTarget") > 0 ? d("carbsTarget") : legacyC
    let carbC = d("carbsConsumed")
    let fT = d("fatTarget") > 0 ? d("fatTarget") : legacyF
    let fC = d("fatConsumed")

    let hCon = d("hydrationConsumedMl")
    let hTar = d("hydrationTargetMl")
    var hydrationConsumed = hCon
    var hydrationTarget = hTar
    if hydrationTarget <= 0, let hyd = context["hydration"] {
      let parts = hyd.replacingOccurrences(of: " ml", with: "").split(separator: "/")
      if parts.count == 2 {
        hydrationConsumed = Double(parts[0].trimmingCharacters(in: .whitespaces)) ?? 0
        hydrationTarget = Double(parts[1].trimmingCharacters(in: .whitespaces)) ?? 0
      }
    }

    let streak = Int(Double(context["streak"] ?? "") ?? 0)

    return WatchSnapshot(
      firstName: context["firstName"] ?? "",
      caloriesRemaining: cRemaining,
      caloriesTarget: cTarget,
      caloriesConsumed: cConsumed,
      proteinConsumed: pC,
      proteinTarget: pT,
      carbsConsumed: carbC,
      carbsTarget: carbT,
      fatConsumed: fC,
      fatTarget: fT,
      hydrationConsumed: hydrationConsumed,
      hydrationTarget: hydrationTarget,
      streak: streak,
      dietLine: context["dietLine"] ?? context["eatingStyle"] ?? "",
      primaryHex: context["primaryHex"],
      proteinHex: context["proteinHex"],
      carbsHex: context["carbsHex"],
      fatHex: context["fatHex"],
      hydrationHex: context["hydrationHex"],
      tier: context["tier"] ?? "",
      athleteSport: context["athleteSport"] ?? "",
      syncState: context["syncState"] ?? "",
      syncMessage: context["syncMessage"] ?? "",
      updatedAt: context["updatedAt"],
      dayType: context["dayType"] ?? "",
      dayTypeLabel: context["dayTypeLabel"] ?? "",
      dayTypeOverride: context["dayTypeOverride"] ?? "auto",
      dayTypeOverrideLabel: context["dayTypeOverrideLabel"] ?? "Auto",
      dayTypeSource: context["dayTypeSource"] ?? "inferred",
      healthConnected: context["healthConnected"] == "1",
      activeEnergyKcal: d("activeEnergyKcal"),
      workoutMinutes: d("workoutMinutes"),
      healthLine: context["healthLine"] ?? "",
      hydrationUnit: context["hydrationUnit"] ?? "ml",
      voiceMealFeedback: context["voiceMealFeedback"] ?? ""
    )
  }

  func progress(consumed: Double, target: Double) -> CGFloat {
    guard target > 0 else { return 0 }
    return CGFloat(min(max(consumed / target, 0), 1))
  }

  /// Hydration consumed/target rendered in the user's preferred unit.
  var hydrationDisplay: String {
    HydrationFormat.progress(consumedMl: hydrationConsumed, targetMl: hydrationTarget, unit: hydrationUnit)
  }

  var isManualDayType: Bool {
    dayTypeOverride != "auto" && !dayTypeOverride.isEmpty
  }

  var todayHeadline: String {
    if isManualDayType {
      switch dayTypeOverride {
      case "training": return "Training day"
      case "competition": return "Competition day"
      case "rest": return "Rest day"
      default: return dayTypeOverrideLabel
      }
    }
    return dayTypeLabel.isEmpty ? "Set your day" : dayTypeLabel
  }

  var todaySubtitle: String {
    if isManualDayType { return "Manual · overrides Apple Health" }
    if !healthLine.isEmpty { return healthLine }
    if healthConnected { return "From Apple Health" }
    return "Connect Apple Health on iPhone"
  }

  var todayIcon: String {
    if isManualDayType {
      switch dayTypeOverride {
      case "training": return "figure.run"
      case "competition": return "trophy.fill"
      case "rest": return "moon.zzz.fill"
      default: return "calendar"
      }
    }
    switch dayType {
    case "workout_day": return "figure.run"
    case "high_activity_day": return "bolt.heart.fill"
    case "rest_day": return "moon.zzz.fill"
    default: return "calendar"
    }
  }
}

/// Mirrors RN `utils/hydration` for watch-side display + quick-add presets.
enum HydrationFormat {
  static let mlPerOz = 29.5735
  static let mlPerCup = 236.588

  static func toUnit(_ ml: Double, unit: String) -> Double {
    switch unit {
    case "oz": return ml / mlPerOz
    case "cup": return ml / mlPerCup
    default: return ml
    }
  }

  static func unitLabel(_ unit: String) -> String {
    switch unit {
    case "oz": return "oz"
    case "cup": return "cups"
    default: return "mL"
    }
  }

  static func format(_ ml: Double, unit: String) -> String {
    let v = toUnit(ml, unit: unit)
    if unit == "ml" {
      return "\(Int(round(v))) \(unitLabel(unit))"
    }
    let rounded = (v * 10).rounded() / 10
    let num = rounded.truncatingRemainder(dividingBy: 1) == 0 ? String(Int(rounded)) : String(format: "%.1f", rounded)
    return "\(num) \(unitLabel(unit))"
  }

  static func remainingMl(consumedMl: Double, targetMl: Double) -> Double {
    max(targetMl - consumedMl, 0)
  }

  /// Number only (no unit suffix) for hero dial center — matches Calories `formatInt` style.
  static func formatNumber(_ ml: Double, unit: String) -> String {
    let v = toUnit(ml, unit: unit)
    if unit == "ml" {
      return String(Int(round(v)))
    }
    let rounded = (v * 10).rounded() / 10
    return rounded.truncatingRemainder(dividingBy: 1) == 0 ? String(Int(rounded)) : String(format: "%.1f", rounded)
  }

  static func formatRemaining(consumedMl: Double, targetMl: Double, unit: String) -> String {
    formatNumber(remainingMl(consumedMl: consumedMl, targetMl: targetMl), unit: unit)
  }

  static func leftLabel(unit: String) -> String {
    switch unit {
    case "oz": return "oz left"
    case "cup": return "cups left"
    default: return "mL left"
    }
  }

  static func progress(consumedMl: Double, targetMl: Double, unit: String) -> String {
    let c = format(consumedMl, unit: unit)
    let t = format(targetMl, unit: unit)
    // Keep a single unit label at the end.
    let cNum = c.split(separator: " ").first.map(String.init) ?? c
    return "\(cNum) / \(t)"
  }

  /// Quick-add presets (label, milliliters) per unit.
  static func quickAdds(_ unit: String) -> [(label: String, ml: Int)] {
    switch unit {
    case "oz":
      return [("+8 oz", Int((8 * mlPerOz).rounded())), ("+16 oz", Int((16 * mlPerOz).rounded()))]
    case "cup":
      return [("+1 cup", Int(mlPerCup.rounded())), ("+2 cups", Int((2 * mlPerCup).rounded()))]
    default:
      return [("+250 mL", 250), ("+500 mL", 500)]
    }
  }
}
