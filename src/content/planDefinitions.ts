/**
 * Goal and Macro Strategy definitions for onboarding and Settings.
 * Used for progressive disclosure ("Learn more") in UI.
 */

import type { Goal, MacroStrategy } from '../../types';

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

export interface MacroStrategyDefinition {
  id: MacroStrategy;
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
        body: 'Protein is prioritized. Carbs and fat are set by your Macro Strategy.',
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
        body: 'Protein stays high. Carbs and fat are set by your Macro Strategy.',
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
        body: 'Protein stays high. Carbs and fat are set by your Macro Strategy.',
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
        body: 'Protein stays strong. Carbs and fat are set by your Macro Strategy.',
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

export const MACRO_STRATEGY_DEFINITIONS: Record<MacroStrategy, MacroStrategyDefinition> = {
  balanced: {
    id: 'balanced',
    title: 'Balanced',
    shortDescription: 'Flexible macros with no restrictions—simple and adaptable.',
    preview: 'Protein: 0.9 g/lb • Carbs: flexible • Fat: flexible',
    learnMore: [
      {
        heading: 'What it means',
        body: 'A flexible approach that lets you adjust carbs and fat based on preference and training.',
      },
      {
        heading: 'How calories work',
        body: 'Calories follow your Goal (deficit, maintenance, or surplus).',
      },
      {
        heading: 'Macro targets',
        body: 'Protein: 0.8–1.0 g per lb body weight per day\nCarbs: 30–50% of calories\nFat: 20–35% of calories',
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
  high_protein: {
    id: 'high_protein',
    title: 'High-Protein Balanced',
    shortDescription:
      'High protein with flexible carbs and fats—simple, effective, and easy to stick to.',
    preview: 'Protein: 1.0 g/lb • Carbs: moderate • Fat: moderate',
    learnMore: [
      {
        heading: 'What it means',
        body: 'A balanced approach with protein as the anchor. Carbs support training, fats support hormones and satiety.',
      },
      {
        heading: 'How calories work',
        body: 'Calories follow your Goal (deficit, maintenance, or surplus).',
      },
      {
        heading: 'Macro targets',
        body: 'Protein: 1.0 g per lb body weight per day\nCarbs: 25–40% of calories (higher on training days)\nFat: 25–35% of calories',
      },
      {
        heading: 'Best for',
        body: 'Most lifters, athletes, and anyone who wants the easiest long-term plan.',
      },
      {
        heading: 'Notes',
        body: 'If hunger is high, increase fiber and push more calories toward protein/fat.',
      },
    ],
  },
  low_carb: {
    id: 'low_carb',
    title: 'Low Carb',
    shortDescription: 'Reduced carbs without strict keto—good appetite control.',
    preview: 'Protein: 1.0 g/lb • Carbs: lower • Fat: higher',
    learnMore: [
      {
        heading: 'What it means',
        body: 'Carbs are reduced to support appetite control while keeping flexibility.',
      },
      {
        heading: 'How calories work',
        body: 'Calories follow your Goal. Carbs are capped to support fat loss or maintenance.',
      },
      {
        heading: 'Macro targets',
        body: 'Protein: 1.0 g per lb body weight per day\nCarbs: 50–100 g per day\nFat: remainder of calories',
      },
      {
        heading: 'Best for',
        body: 'People who feel better on lower carbs but don’t want strict keto.',
      },
      {
        heading: 'Notes',
        body: 'These are starting targets; adjust based on results and adherence.',
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
        body: 'Calories follow your Goal. Keto is not a free pass—deficit still matters for fat loss.',
      },
      {
        heading: 'Macro targets',
        body: 'Protein: 0.8–1.0 g per lb body weight per day\nCarbs: 20–30 g net carbs per day\nFat: remainder of calories (typically 60–75%)',
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
    title: 'Carnivore Protocol',
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
        body: 'Calories follow your Goal. Use fat as the main lever: higher fat for maintenance/build, slightly lower fat for cutting.',
      },
      {
        heading: 'Macro targets',
        body: 'Protein: 1.0–1.2 g per lb body weight per day\nCarbs: 0–10 g per day (from trace sources)\nFat: remainder of calories',
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
  low_fat: {
    id: 'low_fat',
    title: 'Low-Fat',
    shortDescription: 'Lower fat with higher carbs to fuel training.',
    preview: 'Protein: 1.0 g/lb • Carbs: higher • Fat: lower',
    learnMore: [
      {
        heading: 'What it means',
        body: 'This approach keeps fat lower and uses carbs to support training and recovery.',
      },
      {
        heading: 'How calories work',
        body: 'Calories follow your Goal. Carbs are the main fuel lever here.',
      },
      {
        heading: 'Macro targets',
        body: 'Protein: 1.0 g per lb body weight per day\nCarbs: 40–55% of calories\nFat: 15–25% of calories',
      },
      {
        heading: 'Best for',
        body: 'High-volume training and people who feel flat on low carb.',
      },
      {
        heading: 'Notes',
        body: 'Keep fats above the minimum range for adherence and recovery.',
      },
    ],
  },
  performance: {
    id: 'performance',
    title: 'Low-Fat Performance',
    shortDescription:
      'Lower fat with higher carbs to fuel training volume and gym performance.',
    preview: 'Protein: 1.0 g/lb • Carbs: higher • Fat: lower',
    learnMore: [
      {
        heading: 'What it means',
        body: 'This approach emphasizes carbs to support hard training and recovery while keeping fat lower.',
      },
      {
        heading: 'How calories work',
        body: 'Calories follow your Goal. Carbs are the main fuel lever here.',
      },
      {
        heading: 'Macro targets',
        body: 'Protein: 1.0 g per lb body weight per day\nCarbs: 40–55% of calories\nFat: 15–25% of calories',
      },
      {
        heading: 'Best for',
        body: 'High-volume training, athletes, and people who feel flat on low carb.',
      },
      {
        heading: 'Notes',
        body: 'Keep fats above the minimum range for adherence and recovery.',
      },
    ],
  },
  mediterranean: {
    id: 'mediterranean',
    title: 'Mediterranean',
    shortDescription:
      'Balanced macros built on whole foods: lean proteins, plants, and healthy fats.',
    preview: 'Protein: 0.9 g/lb • Carbs: moderate • Fat: olive oil/nuts',
    learnMore: [
      {
        heading: 'What it means',
        body: 'A whole-foods approach emphasizing quality: lean proteins, fruits/veg, legumes, and unsaturated fats.',
      },
      {
        heading: 'How calories work',
        body: 'Calories follow your Goal. Food quality helps adherence and recovery.',
      },
      {
        heading: 'Macro targets',
        body: 'Protein: 0.8–1.0 g per lb body weight per day\nCarbs: 30–45% of calories (mostly minimally processed)\nFat: 25–40% of calories (emphasize unsaturated fats)',
      },
      {
        heading: 'Best for',
        body: 'Heart-healthy eating, general wellness, and an easy lifestyle fit.',
      },
      {
        heading: 'Notes',
        body: 'Prioritize protein at each meal; use olive oil and nuts to fine-tune calories.',
      },
    ],
  },
};

export function getGoalDefinition(goal: Goal): GoalDefinition {
  return GOAL_DEFINITIONS[goal];
}

export function getMacroStrategyDefinition(strategy: MacroStrategy): MacroStrategyDefinition {
  return MACRO_STRATEGY_DEFINITIONS[strategy];
}
