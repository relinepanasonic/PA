import fs from 'fs';

async function build() {
  console.log("Fetching exercises...");
  const res = await fetch('https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json');
  const allExercises = await res.json();
  
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
