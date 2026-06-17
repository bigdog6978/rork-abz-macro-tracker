export interface NutritionScienceSection {
  title: string;
  body: string[];
  reference?: string[];
}

export const MACRO_SOURCE_BLURB =
  'Based on the Mifflin-St Jeor metabolic model, activity adjustment, goal selection, and your chosen eating style.';

export const NUTRITION_SCIENCE_INTRO =
  'Physiq macro targets are calculated using evidence-based metabolic equations and sports nutrition principles. The algorithm considers body metrics, activity level, goal, and selected eating style to generate practical daily macro targets.';

export const NUTRITION_SCIENCE_NOTE =
  'Physiq provides educational nutrition estimates, not medical advice.';

export const NUTRITION_SCIENCE_SECTIONS: NutritionScienceSection[] = [
  {
    title: 'Energy Needs',
    body: [
      'Mifflin-St Jeor Equation',
      'Used to estimate Basal Metabolic Rate (BMR), which represents the calories your body burns at rest.',
    ],
    reference: [
      'Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO.',
      'A new predictive equation for resting energy expenditure in healthy individuals.',
      'American Journal of Clinical Nutrition, 1990.',
    ],
  },
  {
    title: 'Activity Adjustment',
    body: [
      'Activity multipliers estimate Total Daily Energy Expenditure (TDEE) by adjusting baseline calorie needs based on movement and exercise levels.',
    ],
    reference: [
      'American College of Sports Medicine (ACSM)',
      'Position Stand on Nutrition and Athletic Performance.',
    ],
  },
  {
    title: 'Protein Targets',
    body: [
      'Protein targets are influenced by body weight, activity level, and fitness goal.',
      'Typical research-supported intake range:',
      '1.6 - 2.2 g per kg body weight',
    ],
    reference: [
      'Jager R et al.',
      'International Society of Sports Nutrition Position Stand: Protein and Exercise.',
      'Journal of the International Society of Sports Nutrition, 2017.',
    ],
  },
  {
    title: 'Macro Distribution Strategy',
    body: [
      'After calories and protein are determined, carbohydrates and fats are adjusted based on the selected eating style.',
      'Keto, carnivore, and PSMF materially change macro distribution. Other eating styles primarily guide meal planning and food selection.',
      'PSMF is a short-term protocol (10–14 days max for most adults) with very high protein, ~25 g carbs, and essential fat only.',
    ],
  },
];

export const MEAL_PLAN_SOURCE_BLURB =
  'Meal plans are generated from USDA-sourced food composition data, personalized to your eating style, dietary restrictions, allergies, and evidence-based macro targets.';

export const MEAL_PLAN_METHODOLOGY_SECTIONS: NutritionScienceSection[] = [
  {
    title: 'Food Composition Data',
    body: [
      'Nutrition values (calories, protein, carbohydrates, fat per 100 g) used in meal plan foods are derived from the USDA FoodData Central database.',
    ],
    reference: [
      'U.S. Department of Agriculture, Agricultural Research Service. FoodData Central. fdc.nal.usda.gov',
    ],
  },
  {
    title: 'Calorie & Macro Targets',
    body: [
      'Daily calorie targets are estimated using the Mifflin-St Jeor equation for basal metabolic rate, adjusted by an activity multiplier and goal-based calorie offset. Protein, carbohydrate, and fat grams are derived from evidence-based sports nutrition ranges.',
    ],
    reference: [
      'Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO. A new predictive equation for resting energy expenditure in healthy individuals. American Journal of Clinical Nutrition, 1990.',
      'American College of Sports Medicine (ACSM). Position Stand on Nutrition and Athletic Performance.',
      'Jager R et al. International Society of Sports Nutrition Position Stand: Protein and Exercise. Journal of the International Society of Sports Nutrition, 2017.',
    ],
  },
  {
    title: 'Eating Style Adaptation',
    body: [
      'Food selection is adapted to your chosen eating style: Standard, Mediterranean, Vegan, Vegetarian, Paleo, Keto, Carnivore, or PSMF. Most styles change which foods are suggested. Keto, Carnivore, and PSMF also adjust macro distribution.',
      'PSMF (Protein Sparing Modified Fast) uses ~1.25 g protein per lb lean mass, ~25 g carbs, and essential fat only. It is intended as a short-term protocol (10–14 days maximum for most adults).',
    ],
    reference: [
      'McDonald L. The Rapid Fat Loss Handbook.',
      'Jager R et al. International Society of Sports Nutrition Position Stand: Protein and Exercise. Journal of the International Society of Sports Nutrition, 2017.',
    ],
  },
  {
    title: 'Dietary Restrictions',
    body: [
      'When dietary restrictions are active (Gluten-Free, Dairy-Free, Nut-Free, Egg-Free, Soy-Free, Shellfish-Free, Low Glycemic, Intermittent Fasting, Halal, Kosher), foods in restricted categories are excluded from meal suggestions.',
      'Halal filtering excludes pork and alcohol. Kosher filtering excludes pork and shellfish and avoids mammalian meat combined with dairy in the same meal. The app does not verify halal or kosher certification — always check product labels.',
      'Restriction filters are based on common food allergen and religious dietary categories. Always verify individual food labels for safety.',
    ],
  },
  {
    title: 'Allergies & Disliked Foods',
    body: [
      'User-entered allergies further filter meal suggestions using keyword matching against food names and ingredient tags. Disliked foods are excluded from all generated plans. Allergy filtering is a convenience feature and is not a substitute for reading food labels or consulting a healthcare professional.',
    ],
  },
  {
    title: 'Portion Sizing',
    body: [
      'Portion sizes are calculated to meet your daily macro targets, distributed proportionally across meals. Amounts are approximate and should be adjusted based on individual needs and preferences.',
    ],
  },
];
