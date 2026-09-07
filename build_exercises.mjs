import fs from 'fs';

async function build() {
  console.log("Fetching exercises...");
  const res = await fetch('https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json');
  const allExercises = await res.json();
  
  const targetExercises = [
    // Chest
    { id: 'Barbell_Bench_Press_-_Medium_Grip', ourName: 'Barbell Bench Press', group: 'Chest', eq: 'Barbell' },
    { id: 'Incline_Dumbbell_Press', ourName: 'Incline Dumbbell Press', group: 'Chest', eq: 'Dumbbell' },
    { id: 'Cable_Crossover', ourName: 'Cable Fly', group: 'Chest', eq: 'Cable' },
    { id: 'Dips_-_Chest_Version', ourName: 'Chest Dip', group: 'Chest', eq: 'Bodyweight' },
    { id: 'Dumbbell_Flyes', ourName: 'Dumbbell Fly', group: 'Chest', eq: 'Dumbbell' },
    { id: 'Machine_Bench_Press', ourName: 'Machine Chest Press', group: 'Chest', eq: 'Machine' },
    // Back
    { id: 'Barbell_Deadlift', ourName: 'Deadlift', group: 'Back', eq: 'Barbell' },
    { id: 'Bent_Over_Barbell_Row', ourName: 'Barbell Row', group: 'Back', eq: 'Barbell' },
    { id: 'Wide-Grip_Lat_Pulldown', ourName: 'Lat Pulldown', group: 'Back', eq: 'Cable' },
    { id: 'Seated_Cable_Rows', ourName: 'Seated Cable Row', group: 'Back', eq: 'Cable' },
    { id: 'Pullups', ourName: 'Pull-up', group: 'Back', eq: 'Bodyweight' },
    { id: 'T-Bar_Row_with_Handle', ourName: 'T-Bar Row', group: 'Back', eq: 'Machine' },
    { id: 'One-Arm_Dumbbell_Row', ourName: 'Dumbbell Row', group: 'Back', eq: 'Dumbbell' },
    // Shoulders
    { id: 'Standing_Military_Press', ourName: 'Overhead Press', group: 'Shoulders', eq: 'Barbell' },
    { id: 'Side_Lateral_Raise', ourName: 'Lateral Raise', group: 'Shoulders', eq: 'Dumbbell' },
    { id: 'Face_Pull', ourName: 'Face Pull', group: 'Shoulders', eq: 'Cable' },
    { id: 'Front_Dumbbell_Raise', ourName: 'Front Raise', group: 'Shoulders', eq: 'Dumbbell' },
    { id: 'Arnold_Dumbbell_Press', ourName: 'Arnold Press', group: 'Shoulders', eq: 'Dumbbell' },
    { id: 'Reverse_Machine_Flyes', ourName: 'Reverse Fly', group: 'Shoulders', eq: 'Machine' },
    // Biceps
    { id: 'Barbell_Curl', ourName: 'Barbell Curl', group: 'Biceps', eq: 'Barbell' },
    { id: 'Dumbbell_Alternate_Bicep_Curl', ourName: 'Dumbbell Curl', group: 'Biceps', eq: 'Dumbbell' },
    { id: 'Hammer_Curls', ourName: 'Hammer Curl', group: 'Biceps', eq: 'Dumbbell' },
    { id: 'Preacher_Curl', ourName: 'Preacher Curl', group: 'Biceps', eq: 'EZ Bar' },
    { id: 'Cable_Hammer_Curls_-_Rope_Attachment', ourName: 'Cable Curl', group: 'Biceps', eq: 'Cable' },
    // Triceps
    { id: 'Triceps_Pushdown_-_V-Bar_Attachment', ourName: 'Tricep Pushdown', group: 'Triceps', eq: 'Cable' },
    { id: 'Lying_Triceps_Press', ourName: 'Skull Crusher', group: 'Triceps', eq: 'EZ Bar' },
    { id: 'Standing_Dumbbell_Triceps_Extension', ourName: 'Overhead Tricep Extension', group: 'Triceps', eq: 'Dumbbell' },
    { id: 'Close-Grip_Barbell_Bench_Press', ourName: 'Close-Grip Bench Press', group: 'Triceps', eq: 'Barbell' },
    { id: 'Tricep_Dumbbell_Kickback', ourName: 'Tricep Kickback', group: 'Triceps', eq: 'Dumbbell' },
    // Quads
    { id: 'Barbell_Squat', ourName: 'Barbell Squat', group: 'Quads', eq: 'Barbell' },
    { id: 'Leg_Press', ourName: 'Leg Press', group: 'Quads', eq: 'Machine' },
    { id: 'Leg_Extensions', ourName: 'Leg Extension', group: 'Quads', eq: 'Machine' },
    { id: 'Dumbbell_Lunges', ourName: 'Lunge', group: 'Quads', eq: 'Dumbbell' },
    { id: 'Split_Squat_with_Dumbbells', ourName: 'Bulgarian Split Squat', group: 'Quads', eq: 'Dumbbell' },
    { id: 'Hack_Squat', ourName: 'Hack Squat', group: 'Quads', eq: 'Machine' },
    // Hamstrings
    { id: 'Romanian_Deadlift_from_Deficit', ourName: 'Romanian Deadlift', group: 'Hamstrings', eq: 'Barbell' },
    { id: 'Seated_Leg_Curl', ourName: 'Leg Curl', group: 'Hamstrings', eq: 'Machine' },
    { id: 'Stiff-Legged_Dumbbell_Deadlift', ourName: 'Stiff-Leg Deadlift', group: 'Hamstrings', eq: 'Dumbbell' },
    { id: 'Sumo_Deadlift', ourName: 'Sumo Deadlift', group: 'Hamstrings', eq: 'Barbell' },
    // Glutes
    { id: 'Barbell_Glute_Bridge', ourName: 'Glute Bridge', group: 'Glutes', eq: 'Barbell' },
    { id: 'One-Legged_Cable_Kickback', ourName: 'Cable Kickback', group: 'Glutes', eq: 'Cable' },
    { id: 'Plie_Dumbbell_Squat', ourName: 'Sumo Squat', group: 'Glutes', eq: 'Dumbbell' },
    { id: 'Dumbbell_Step_Ups', ourName: 'Step-Up', group: 'Glutes', eq: 'Dumbbell' },
    // Calves
    { id: 'Standing_Calf_Raises', ourName: 'Standing Calf Raise', group: 'Calves', eq: 'Machine' },
    { id: 'Seated_Calf_Raise', ourName: 'Seated Calf Raise', group: 'Calves', eq: 'Machine' },
    { id: 'Calf_Press_On_The_Leg_Press_Machine', ourName: 'Calf Press', group: 'Calves', eq: 'Machine' },
    // Core
    { id: 'Plank', ourName: 'Plank', group: 'Core', eq: 'Bodyweight' },
    { id: 'Cable_Crunch', ourName: 'Cable Crunch', group: 'Core', eq: 'Cable' },
    { id: 'Hanging_Leg_Raise', ourName: 'Hanging Leg Raise', group: 'Core', eq: 'Bodyweight' },
    { id: 'Russian_Twist', ourName: 'Russian Twist', group: 'Core', eq: 'Bodyweight' },
    { id: 'Ab_Roller', ourName: 'Ab Wheel Rollout', group: 'Core', eq: 'Other' }
  ];
  const results = allExercises.map(found => {
    // Map the JSON structure to our Exercise interface
    let group = 'Core'; // default
    if (found.primaryMuscles && found.primaryMuscles.length > 0) {
      const pm = found.primaryMuscles[0].toLowerCase();
      if (pm.includes('chest') || pm.includes('pectoral')) group = 'Chest';
      else if (pm.includes('back') || pm.includes('lat') || pm.includes('rhomboid')) group = 'Back';
      else if (pm.includes('shoulder') || pm.includes('deltoid')) group = 'Shoulders';
      else if (pm.includes('bicep')) group = 'Biceps';
      else if (pm.includes('tricep')) group = 'Triceps';
      else if (pm.includes('quad')) group = 'Quads';
      else if (pm.includes('hamstring')) group = 'Hamstrings';
      else if (pm.includes('glute')) group = 'Glutes';
      else if (pm.includes('calve') || pm.includes('calf')) group = 'Calves';
    }

  const results = [];

  for (const t of targetExercises) {
    let found = allExercises.find(e => e.id === t.id || e.name === t.ourName);
    if (!found) {
      // Fuzzy search
      found = allExercises.find(e => e.name.toLowerCase().includes(t.ourName.toLowerCase()));
    let eq = 'Bodyweight';
    if (found.equipment) {
      const eqLow = found.equipment.toLowerCase();
      if (eqLow.includes('barbell')) eq = 'Barbell';
      else if (eqLow.includes('dumbbell')) eq = 'Dumbbell';
      else if (eqLow.includes('cable')) eq = 'Cable';
      else if (eqLow.includes('machine')) eq = 'Machine';
      else if (eqLow.includes('ez')) eq = 'EZ Bar';
      else if (eqLow.includes('kettlebell')) eq = 'Kettlebell';
      else if (eqLow !== 'body only' && eqLow !== 'none') eq = 'Other';
    }
    
    if (found) {
      results.push({
        id: t.ourName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: t.ourName,
        muscleGroup: t.group,
        targetMuscles: found.primaryMuscles || [],
        secondaryMuscles: found.secondaryMuscles || [],
        equipment: t.eq,
        difficulty: found.level || 'beginner',
        instructions: found.instructions || [],
        // Pick the first image or a placeholder
        imageUrl: found.images && found.images.length > 0 ? `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${found.images[0]}` : ''
      });
    } else {
      console.log(`Could not find: ${t.ourName}`);
    }
  }

    return {
      id: found.id || found.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: found.name,
      muscleGroup: group,
      targetMuscles: found.primaryMuscles || [],
      secondaryMuscles: found.secondaryMuscles || [],
      equipment: eq,
      difficulty: found.level || 'beginner',
      instructions: found.instructions || [],
      imageUrl: found.images && found.images.length > 0 ? `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${found.images[0]}` : ''
    };
  });

  const fileContent = `export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  targetMuscles: string[];
  secondaryMuscles: string[];
  equipment: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  instructions: string[];
  imageUrl: string;
}

export const MUSCLE_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core'
];

export const EQUIPMENT_TYPES = [
  'Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'EZ Bar', 'Kettlebell', 'Other'
];

export const EXERCISES: Exercise[] = ${JSON.stringify(results, null, 2)};

export const getExercisesByMuscleGroup = (group: string) => EXERCISES.filter(e => e.muscleGroup === group);
export const getExercisesByEquipment = (equipment: string) => EXERCISES.filter(e => e.equipment === equipment);
export const searchExercises = (query: string) => EXERCISES.filter(e => e.name.toLowerCase().includes(query.toLowerCase()) || e.muscleGroup.toLowerCase().includes(query.toLowerCase()));
`;

  fs.writeFileSync('src/lib/data/exercises.ts', fileContent);
  console.log(`Successfully generated exercises.ts with ${results.length} exercises.`);
}

build().catch(console.error);
