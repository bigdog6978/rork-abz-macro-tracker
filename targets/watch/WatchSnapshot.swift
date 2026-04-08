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
  var tier: String
  var athleteSport: String
  var updatedAt: String?

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
      tier: context["tier"] ?? "",
      athleteSport: context["athleteSport"] ?? "",
      updatedAt: context["updatedAt"]
    )
  }

  func progress(consumed: Double, target: Double) -> CGFloat {
    guard target > 0 else { return 0 }
    return CGFloat(min(max(consumed / target, 0), 1))
  }
}
