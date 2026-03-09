/**
 * Goal and Eating Style definitions for onboarding and Settings.
 * Used for progressive disclosure ("Learn more") in UI.
 */

import type { Goal, EatingStyle } from '../../types';

export interface LearnMoreSection {
  heading: string;
  body: string;
}

export interface GoalDefinition {
  id: Goal;
  title: string;
  shortDescription: string;
  learnMore: LearnMoreSection[];
}

export interface EatingStyleDefinition {
  id: EatingStyle;
  title: string;
  shortDescription: string;
  preview: string;
  learnMore: LearnMoreSection[];
}

export const GOAL_DEFINITIONS: Record<Goal, GoalDefinition> = {
  cut: {
    id: 'cut',
    title: 'Fat Loss (Cut)',
    shortDescription:
      'Create a calorie deficit to drop body fat while keeping strength and muscle.',
    learnMore: [
      {
        heading: 'What it means',
        body: "A 'cut' targets fat loss first. Protein stays high and calories are set below maintenance so you can lean out without feeling flat or weak.",
      },
      {
        heading: 'How calories work',
        body: 'We set calories below maintenance based on your activity level and chosen pace.',
      },
      {
        heading: 'Macro targets',
        body: 'Protein is prioritized. Calories and macros are calculated from your body stats, goal, activity level, and optional body fat.',
      },
      {
        heading: 'Best for',
        body: 'Leaning out, improving definition, or making a weight class.',
      },
      {
        heading: 'Notes',
        body: 'Track 1–2 weeks and adjust if weight change is too fast or too slow.',
      },
    ],
  },
  gain: {
    id: 'gain',
    title: 'Muscle Gain (Build)',
    shortDescription:
      'Create a controlled surplus to add muscle with minimal fat gain.',
    learnMore: [
      {
        heading: 'What it means',
        body: "A 'build' targets strength and size. Calories are set above maintenance so training performance and recovery stay high.",
      },
      {
        heading: 'How calories work',
        body: 'We set calories above maintenance. The goal is steady progress without excessive fat gain.',
      },
      {
        heading: 'Macro targets',
        body: 'Protein, carbs, and fat are calculated from your stats and activity. Eating Style changes food choices, not your base targets.',
      },
      {
        heading: 'Best for',
        body: 'Adding size/strength, improving lifts, or fueling hard training blocks.',
      },
      {
        heading: 'Notes',
        body: 'If scale weight is rising too quickly, reduce calories slightly and recheck weekly.',
      },
    ],
  },
  recompose: {
    id: 'recompose',
    title: 'Recomposition',
    shortDescription:
      'Build muscle and lose fat slowly by staying near maintenance with high protein.',
    learnMore: [
      {
        heading: 'What it means',
        body: "Recomp is the slow-and-steady option. You'll train hard, keep protein high, and hover near maintenance to improve body composition over time.",
      },
      {
        heading: 'How calories work',
        body: 'Calories are set near maintenance with small adjustments based on trends.',
      },
      {
        heading: 'Macro targets',
        body: 'Protein stays high. Calories and macros are derived centrally and adjusted only when your Eating Style requires it.',
      },
      {
        heading: 'Best for',
        body: 'Beginners, returning lifters, or anyone who wants sustainable progress.',
      },
      {
        heading: 'Notes',
        body: 'Progress is slower than a dedicated cut or build—consistency wins here.',
      },
    ],
  },
  maintain: {
    id: 'maintain',
    title: 'Maintenance',
    shortDescription:
      'Hold your current weight while supporting performance and recovery.',
    learnMore: [
      {
        heading: 'What it means',
        body: "Maintenance keeps you steady. It's perfect between phases or when life is busy and you want structure without pushing hard.",
      },
      {
        heading: 'How calories work',
        body: 'Calories are set at estimated maintenance and refined with weekly check-ins.',
      },
      {
        heading: 'Macro targets',
        body: 'Protein stays strong. Calories and macros are derived centrally from your profile.',
      },
      {
        heading: 'Best for',
        body: 'Staying consistent, maintaining strength, or taking a diet break.',
      },
      {
        heading: 'Notes',
        body: 'If weight drifts up or down, adjust calories slightly and monitor.',
      },
    ],
  },
};

export const EATING_STYLE_DEFINITIONS: Record<EatingStyle, EatingStyleDefinition> = {
  standard: {
    id: 'standard',
    title: 'Standard',
    shortDescription: 'Flexible macros with no restrictions—simple and adaptable.',
    preview: 'Protein: 0.9 g/lb • Carbs: flexible • Fat: flexible',
    learnMore: [
      {
        heading: 'What it means',
        body: 'A flexible baseline eating style with no ingredient rules. Meal plans use a broad variety of foods.',
      },
      {
        heading: 'How food selection works',
        body: 'Meals can include lean proteins, starches, fruits, vegetables, and fats without a special restriction pattern.',
      },
      {
        heading: 'Macro targets',
        body: 'Eating Style does not change your base macro targets. Your targets come from the macro engine.',
      },
      {
        heading: 'Best for',
        body: 'Anyone who wants flexibility without strict rules.',
      },
      {
        heading: 'Notes',
        body: 'These are starting targets; adjust based on results and adherence.',
      },
    ],
  },
  mediterranean: {
    id: 'mediterranean',
    title: 'Mediterranean',
    shortDescription:
      'Whole-food meals built around lean protein, plants, olive oil, legumes, and grains.',
    preview: 'Whole foods • Lean protein • Healthy fats',
    learnMore: [
      {
        heading: 'What it means',
        body: 'Mediterranean emphasizes food quality: fish, lean proteins, legumes, whole grains, olive oil, fruits, and vegetables.',
      },
      {
        heading: 'How food selection works',
        body: 'Meal plans bias toward olive oil, fish, yogurt, legumes, grains, and minimally processed foods.',
      },
      {
        heading: 'Macro targets',
        body: 'Eating Style does not change your base macro targets.',
      },
      {
        heading: 'Best for',
        body: 'Users who want a balanced, whole-food approach that is easy to sustain.',
      },
      {
        heading: 'Notes',
        body: 'Great for general wellness and meal variety.',
      },
    ],
  },
  vegan: {
    id: 'vegan',
    title: 'Vegan',
    shortDescription: 'Plant-based meals only with no animal products.',
    preview: 'Plant protein • No dairy/eggs/meat • Plant-only foods',
    learnMore: [
      {
        heading: 'What it means',
        body: 'Vegan meal plans exclude meat, fish, dairy, eggs, and other animal-based ingredients.',
      },
      {
        heading: 'How food selection works',
        body: 'Meal plans use tofu, tempeh, beans, lentils, grains, fruits, vegetables, and plant-based fats.',
      },
      {
        heading: 'Macro targets',
        body: 'Eating Style does not change your base macro targets unless you choose Keto or Carnivore.',
      },
      {
        heading: 'Best for',
        body: 'Users who want fully plant-based meal recommendations.',
      },
      {
        heading: 'Notes',
        body: 'Protein quality is handled through food selection, not a special macro formula.',
      },
    ],
  },
  vegetarian: {
    id: 'vegetarian',
    title: 'Vegetarian',
    shortDescription: 'Plant-forward meals with dairy and eggs allowed.',
    preview: 'No meat or fish • Eggs/dairy allowed',
    learnMore: [
      {
        heading: 'What it means',
        body: 'Vegetarian meal plans exclude meat and fish, but can include dairy and eggs.',
      },
      {
        heading: 'How food selection works',
        body: 'Meal plans use eggs, yogurt, cheese, tofu, tempeh, grains, legumes, fruits, and vegetables.',
      },
      {
        heading: 'Macro targets',
        body: 'Eating Style does not change your base macro targets.',
      },
      {
        heading: 'Best for',
        body: 'Users who want plant-forward meals without fully removing dairy and eggs.',
      },
      {
        heading: 'Notes',
        body: 'Protein remains centrally calculated and the planner fills in suitable foods.',
      },
    ],
  },
  paleo: {
    id: 'paleo',
    title: 'Paleo',
    shortDescription: 'Whole-food meals with grains, legumes, and most dairy removed.',
    preview: 'Whole foods • No grains/legumes • Protein-forward',
    learnMore: [
      {
        heading: 'What it means',
        body: 'Paleo favors meat, fish, eggs, fruit, vegetables, nuts, and minimally processed foods.',
      },
      {
        heading: 'How food selection works',
        body: 'Meal plans avoid grains, legumes, and common dairy-heavy foods while keeping variety high.',
      },
      {
        heading: 'Macro targets',
        body: 'Eating Style does not change your base macro targets.',
      },
      {
        heading: 'Best for',
        body: 'Users who want whole-food meals with fewer processed ingredients.',
      },
      {
        heading: 'Notes',
        body: 'Paleo changes ingredients, not your macro calculation.',
      },
    ],
  },
  keto: {
    id: 'keto',
    title: 'Keto',
    shortDescription:
      'Very low carb to support appetite control and stable energy—protein stays strong.',
    preview: 'Protein: 0.9 g/lb • Carbs: ≤30 g • Fat: high',
    learnMore: [
      {
        heading: 'What it means',
        body: 'Keto keeps carbs very low so your body relies more on fat for fuel. Many people find it helps control hunger.',
      },
      {
        heading: 'How calories work',
        body: 'Calories still follow your Goal. Keto only changes macro distribution by capping carbs and shifting remaining calories to fat.',
      },
      {
        heading: 'Macro targets',
        body: 'Carbs are capped around 20–30 g per day. Protein stays anchored by the macro engine and remaining calories go to fat.',
      },
      {
        heading: 'Best for',
        body: 'People who do well on low carb, prefer fatty foods, or struggle with cravings.',
      },
      {
        heading: 'Notes',
        body: 'Electrolytes matter. Consider sodium/potassium/magnesium, especially in week 1.',
      },
    ],
  },
  carnivore: {
    id: 'carnivore',
    title: 'Carnivore',
    shortDescription:
      'Animal-based, ultra-low carb, high satiety—built around protein-first meals.',
    preview: 'Protein: 1.0–1.2 g/lb • Carbs: ~0 • Fat: remainder',
    learnMore: [
      {
        heading: 'What it means',
        body: 'Carnivore focuses on animal foods with minimal to zero carbs. Protein is prioritized and fat is adjusted for satiety and your Goal.',
      },
      {
        heading: 'How calories work',
        body: 'Calories still follow your Goal. Carnivore sets carbs near zero and fills the remaining calories with fat after protein is set.',
      },
      {
        heading: 'Macro targets',
        body: 'Carbs stay around 5 g per day from trace sources. Protein is unchanged and remaining calories become fat.',
      },
      {
        heading: 'Best for',
        body: 'High satiety dieting, simplicity, and people who feel best on animal-based foods.',
      },
      {
        heading: 'Notes',
        body: 'Choose leaner cuts if fat loss stalls; choose fattier cuts if energy is low.',
      },
    ],
  },
};

export function getGoalDefinition(goal: Goal): GoalDefinition {
  return GOAL_DEFINITIONS[goal];
}

export function getEatingStyleDefinition(eatingStyle: EatingStyle): EatingStyleDefinition {
  return EATING_STYLE_DEFINITIONS[eatingStyle];
}
