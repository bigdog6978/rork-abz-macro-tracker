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
      'In the current Physiq engine, keto and carnivore materially change macro distribution, while the other eating styles primarily guide meal planning and food selection.',
    ],
  },
];
