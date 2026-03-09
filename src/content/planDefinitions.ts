/**
 * Goal, Activity Level, and Eating Style definitions for onboarding and Settings.
 * Used for progressive disclosure ("Learn more") in UI.
 */

import type { ActivityLevel, Goal, EatingStyle } from '../../types';

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

export interface ActivityLevelDefinition {
  id: ActivityLevel;
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
    title: 'Fat Loss',
    shortDescription:
      'Designed to reduce body fat while preserving lean muscle mass.',
    learnMore: [
      {
        heading: 'Definition',
        body:
          'Designed to reduce body fat while preserving lean muscle mass. Calories are set below maintenance while maintaining higher protein intake.',
      },
    ],
  },
  gain: {
    id: 'gain',
    title: 'Muscle Gain',
    shortDescription:
      'Supports muscle growth with extra calories and strong protein intake.',
    learnMore: [
      {
        heading: 'Definition',
        body:
          'Supports muscle growth by providing a calorie surplus along with sufficient protein and carbohydrates for recovery and performance.',
      },
    ],
  },
  recompose: {
    id: 'recompose',
    title: 'Body Recomposition',
    shortDescription:
      'Aims to reduce body fat while building or preserving muscle.',
    learnMore: [
      {
        heading: 'Definition',
        body:
          'Aims to reduce body fat while building or preserving muscle through optimized protein intake and balanced calories.',
      },
    ],
  },
  maintain: {
    id: 'maintain',
    title: 'Maintenance',
    shortDescription:
      'Balances calories with daily energy expenditure to hold your current weight.',
    learnMore: [
      {
        heading: 'Definition',
        body:
          'Maintains your current body weight by balancing calorie intake with daily energy expenditure.',
      },
    ],
  },
};

export const ACTIVITY_LEVEL_DEFINITIONS: Record<ActivityLevel, ActivityLevelDefinition> = {
  sedentary: {
    id: 'sedentary',
    title: 'Sedentary',
    shortDescription: 'Little or no structured exercise.',
    learnMore: [
      {
        heading: 'Definition',
        body: 'Little or no structured exercise. Typical of desk jobs or low daily movement.',
      },
    ],
  },
  light_activity: {
    id: 'light_activity',
    title: 'Light Activity',
    shortDescription: 'Light exercise or physical activity 1-3 days per week.',
    learnMore: [
      {
        heading: 'Definition',
        body: 'Light exercise or physical activity 1-3 days per week.',
      },
    ],
  },
  moderate_training: {
    id: 'moderate_training',
    title: 'Moderate Training',
    shortDescription: 'Moderate exercise or training 3-5 days per week.',
    learnMore: [
      {
        heading: 'Definition',
        body: 'Moderate exercise or training 3-5 days per week.',
      },
    ],
  },
  strength_training: {
    id: 'strength_training',
    title: 'Very Active',
    shortDescription: 'Hard training or physical activity 6-7 days per week.',
    learnMore: [
      {
        heading: 'Definition',
        body: 'Hard training or physical activity 6-7 days per week.',
      },
    ],
  },
  endurance_training: {
    id: 'endurance_training',
    title: 'Athlete',
    shortDescription: 'Intense training, sports participation, or physically demanding occupation.',
    learnMore: [
      {
        heading: 'Definition',
        body: 'Intense training, sports participation, or physically demanding occupation.',
      },
    ],
  },
};

export const EATING_STYLE_DEFINITIONS: Record<EatingStyle, EatingStyleDefinition> = {
  standard: {
    id: 'standard',
    title: 'Balanced (Standard)',
    shortDescription: 'Traditional macro distribution designed for general health and sustainable nutrition.',
    preview: 'Balanced • Flexible • Sustainable',
    learnMore: [
      {
        heading: 'Definition',
        body:
          'Traditional macro distribution designed for general health and sustainable nutrition.',
      },
    ],
  },
  mediterranean: {
    id: 'mediterranean',
    title: 'Mediterranean',
    shortDescription:
      'Balanced macro approach emphasizing whole foods, healthy fats, and moderate carbohydrates.',
    preview: 'Whole foods • Lean protein • Healthy fats',
    learnMore: [
      {
        heading: 'Definition',
        body:
          'Balanced macro approach emphasizing whole foods, healthy fats, and moderate carbohydrates.',
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
      'Very low carbohydrate intake with higher fat consumption to support ketosis.',
    preview: 'Protein: 0.9 g/lb • Carbs: ≤30 g • Fat: high',
    learnMore: [
      {
        heading: 'Definition',
        body: 'Very low carbohydrate intake with higher fat consumption to support ketosis.',
      },
    ],
  },
  carnivore: {
    id: 'carnivore',
    title: 'Carnivore',
    shortDescription:
      'Animal-based eating style emphasizing protein and fats from animal foods.',
    preview: 'Protein: 1.0–1.2 g/lb • Carbs: ~0 • Fat: remainder',
    learnMore: [
      {
        heading: 'Definition',
        body: 'Animal-based eating style emphasizing protein and fats from animal foods.',
      },
    ],
  },
};

export function getGoalDefinition(goal: Goal): GoalDefinition {
  return GOAL_DEFINITIONS[goal];
}

export function getActivityLevelDefinition(activityLevel: ActivityLevel): ActivityLevelDefinition {
  return ACTIVITY_LEVEL_DEFINITIONS[activityLevel];
}

export function getEatingStyleDefinition(eatingStyle: EatingStyle): EatingStyleDefinition {
  return EATING_STYLE_DEFINITIONS[eatingStyle];
}
