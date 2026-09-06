export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  targetMuscles: string[];
  secondaryMuscles: string[];
  equipment: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  instructions: string[];
  imageUrl: string;
}

export const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Core'
];

export const EQUIPMENT_TYPES = [
  'Barbell',
  'Dumbbell',
  'Cable',
  'Machine',
  'Bodyweight',
  'EZ Bar',
  'Kettlebell'
];

export const EXERCISES: Exercise[] = [
  // Chest
  {
    id: 'barbell-bench-press',
    name: 'Barbell Bench Press',
    muscleGroup: 'Chest',
    targetMuscles: ['Pectoralis Major'],
    secondaryMuscles: ['Triceps', 'Anterior Deltoid'],
    equipment: 'Barbell',
    difficulty: 'intermediate',
    instructions: [
      'Lie flat on a bench and grip the bar slightly wider than shoulder-width.',
      'Unrack the bar and lower it slowly to your mid-chest.',
      'Press the bar back up explosively to the starting position.',
      'Keep your core tight and feet flat on the floor throughout the movement.'
    ],
    imageUrl: '/exercises/barbell-bench-press.png'
  },
  {
    id: 'incline-dumbbell-press',
    name: 'Incline Dumbbell Press',
    muscleGroup: 'Chest',
    targetMuscles: ['Upper Pectoralis Major'],
    secondaryMuscles: ['Triceps', 'Anterior Deltoid'],
    equipment: 'Dumbbell',
    difficulty: 'intermediate',
    instructions: [
      'Set an incline bench to about 30-45 degrees.',
      'Hold a dumbbell in each hand at shoulder level with palms facing forward.',
      'Press the weights up and together until your arms are fully extended.',
      'Slowly lower the dumbbells back to the starting position.'
    ],
    imageUrl: '/exercises/incline-dumbbell-press.png'
  },
  {
    id: 'cable-fly',
    name: 'Cable Fly',
    muscleGroup: 'Chest',
    targetMuscles: ['Pectoralis Major'],
    secondaryMuscles: ['Anterior Deltoid'],
    equipment: 'Cable',
    difficulty: 'beginner',
    instructions: [
      'Set the cable pulleys to a high or mid level.',
      'Grab a handle in each hand, step forward to create tension, and slightly bend your elbows.',
      'Bring your hands together in a hugging motion in front of your chest.',
      'Slowly return your arms to the starting position.'
    ],
    imageUrl: '/exercises/cable-fly.png'
  },
  {
    id: 'chest-dip',
    name: 'Chest Dip',
    muscleGroup: 'Chest',
    targetMuscles: ['Lower Pectoralis Major'],
    secondaryMuscles: ['Triceps', 'Anterior Deltoid'],
    equipment: 'Bodyweight',
    difficulty: 'intermediate',
    instructions: [
      'Mount the dip bars and lean forward slightly to target the chest.',
      'Lower your body by bending your elbows until they reach a 90-degree angle.',
      'Push yourself back up to the starting position.',
      'Keep your core engaged to prevent swinging.'
    ],
    imageUrl: '/exercises/chest-dip.png'
  },
  {
    id: 'dumbbell-fly',
    name: 'Dumbbell Fly',
    muscleGroup: 'Chest',
    targetMuscles: ['Pectoralis Major'],
    secondaryMuscles: ['Anterior Deltoid'],
    equipment: 'Dumbbell',
    difficulty: 'beginner',
    instructions: [
      'Lie on a flat bench with a dumbbell in each hand, arms extended above your chest.',
      'With a slight bend in your elbows, lower the weights in a wide arc until you feel a stretch in your chest.',
      'Contract your chest to bring the weights back up in the same arc.',
      'Avoid pressing the weights; focus on the hugging motion.'
    ],
    imageUrl: '/exercises/dumbbell-fly.png'
  },
  {
    id: 'machine-chest-press',
    name: 'Machine Chest Press',
    muscleGroup: 'Chest',
    targetMuscles: ['Pectoralis Major'],
    secondaryMuscles: ['Triceps', 'Anterior Deltoid'],
    equipment: 'Machine',
    difficulty: 'beginner',
    instructions: [
      'Adjust the seat height so the handles are at mid-chest level.',
      'Grip the handles, brace your core, and press outward until your arms are fully extended.',
      'Slowly bring the handles back towards your chest, controlling the weight.',
      'Keep your back flat against the pad during the entire set.'
    ],
    imageUrl: '/exercises/machine-chest-press.png'
  },

  // Back
  {
    id: 'deadlift',
    name: 'Deadlift',
    muscleGroup: 'Back',
    targetMuscles: ['Erector Spinae', 'Glutes', 'Hamstrings'],
    secondaryMuscles: ['Trapezius', 'Lats', 'Core'],
    equipment: 'Barbell',
    difficulty: 'advanced',
    instructions: [
      'Stand with your mid-foot under the barbell, feet shoulder-width apart.',
      'Bend at the hips and knees to grip the bar with your hands just outside your knees.',
      'Keep your chest up and back straight, pull the bar up along your legs by extending your hips and knees.',
      'Lower the bar back to the ground by pushing your hips back.'
    ],
    imageUrl: '/exercises/deadlift.png'
  },
  {
    id: 'barbell-row',
    name: 'Barbell Row',
    muscleGroup: 'Back',
    targetMuscles: ['Latissimus Dorsi', 'Rhomboids'],
    secondaryMuscles: ['Biceps', 'Erector Spinae'],
    equipment: 'Barbell',
    difficulty: 'intermediate',
    instructions: [
      'Hold a barbell with an overhand grip, hands slightly wider than shoulder-width.',
      'Hinge forward at the hips, keeping your back straight and nearly parallel to the floor.',
      'Pull the barbell to your lower chest/upper abdomen, squeezing your shoulder blades together.',
      'Lower the bar slowly to the starting position.'
    ],
    imageUrl: '/exercises/barbell-row.png'
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    muscleGroup: 'Back',
    targetMuscles: ['Latissimus Dorsi'],
    secondaryMuscles: ['Biceps', 'Rhomboids'],
    equipment: 'Cable',
    difficulty: 'beginner',
    instructions: [
      'Sit at the lat pulldown machine and adjust the knee pad to secure your legs.',
      'Grip the wide bar with an overhand grip slightly wider than shoulder-width.',
      'Pull the bar down to your upper chest while leaning back slightly.',
      'Slowly extend your arms back up to the starting position.'
    ],
    imageUrl: '/exercises/lat-pulldown.png'
  },
  {
    id: 'seated-cable-row',
    name: 'Seated Cable Row',
    muscleGroup: 'Back',
    targetMuscles: ['Latissimus Dorsi', 'Rhomboids'],
    secondaryMuscles: ['Biceps', 'Trapezius'],
    equipment: 'Cable',
    difficulty: 'beginner',
    instructions: [
      'Sit on the bench with your feet on the footrests and knees slightly bent.',
      'Grab the V-bar handle and sit up straight with your chest out.',
      'Pull the handle towards your torso, squeezing your back muscles.',
      'Extend your arms out slowly, getting a full stretch in your lats.'
    ],
    imageUrl: '/exercises/seated-cable-row.png'
  },
  {
    id: 'pull-up',
    name: 'Pull-up',
    muscleGroup: 'Back',
    targetMuscles: ['Latissimus Dorsi'],
    secondaryMuscles: ['Biceps', 'Rhomboids'],
    equipment: 'Bodyweight',
    difficulty: 'intermediate',
    instructions: [
      'Grab the pull-up bar with an overhand grip slightly wider than shoulder-width.',
      'Hang with your arms fully extended and core engaged.',
      'Pull yourself up until your chin clears the bar, focusing on driving your elbows down.',
      'Lower yourself back down with control.'
    ],
    imageUrl: '/exercises/pull-up.png'
  },
  {
    id: 't-bar-row',
    name: 'T-Bar Row',
    muscleGroup: 'Back',
    targetMuscles: ['Latissimus Dorsi', 'Rhomboids'],
    secondaryMuscles: ['Biceps', 'Erector Spinae'],
    equipment: 'Barbell',
    difficulty: 'intermediate',
    instructions: [
      'Straddle a T-bar row machine or a landmine setup, gripping the handles.',
      'Bend your hips and knees to maintain a flat back at a 45-degree angle.',
      'Pull the weight towards your chest, retracting your shoulder blades.',
      'Lower the weight down slowly.'
    ],
    imageUrl: '/exercises/t-bar-row.png'
  },
  {
    id: 'dumbbell-row',
    name: 'Dumbbell Row',
    muscleGroup: 'Back',
    targetMuscles: ['Latissimus Dorsi'],
    secondaryMuscles: ['Biceps', 'Rhomboids'],
    equipment: 'Dumbbell',
    difficulty: 'beginner',
    instructions: [
      'Place one knee and one hand on a flat bench to support your body weight.',
      'Hold a dumbbell in your free hand, letting it hang straight down.',
      'Pull the dumbbell up towards your hip, keeping your elbow close to your body.',
      'Lower the dumbbell with control until your arm is fully extended.'
    ],
    imageUrl: '/exercises/dumbbell-row.png'
  },

  // Shoulders
  {
    id: 'overhead-press',
    name: 'Overhead Press',
    muscleGroup: 'Shoulders',
    targetMuscles: ['Anterior Deltoid', 'Medial Deltoid'],
    secondaryMuscles: ['Triceps', 'Core'],
    equipment: 'Barbell',
    difficulty: 'intermediate',
    instructions: [
      'Stand with feet shoulder-width apart, holding the barbell at upper-chest level.',
      'Brace your core and press the barbell straight up over your head.',
      'Lock out your arms at the top, then slowly lower the bar back to your chest.',
      'Avoid excessively arching your lower back during the press.'
    ],
    imageUrl: '/exercises/overhead-press.png'
  },
  {
    id: 'lateral-raise',
    name: 'Lateral Raise',
    muscleGroup: 'Shoulders',
    targetMuscles: ['Medial Deltoid'],
    secondaryMuscles: ['Anterior Deltoid'],
    equipment: 'Dumbbell',
    difficulty: 'beginner',
    instructions: [
      'Stand holding a dumbbell in each hand by your sides.',
      'Keeping a slight bend in your elbows, raise your arms out to the sides until they reach shoulder height.',
      'Pause for a second at the top, then slowly lower the dumbbells back down.',
      'Keep your torso stationary and avoid using momentum.'
    ],
    imageUrl: '/exercises/lateral-raise.png'
  },
  {
    id: 'face-pull',
    name: 'Face Pull',
    muscleGroup: 'Shoulders',
    targetMuscles: ['Posterior Deltoid'],
    secondaryMuscles: ['Rhomboids', 'Trapezius'],
    equipment: 'Cable',
    difficulty: 'beginner',
    instructions: [
      'Set the cable pulley to upper-chest or face height with a rope attachment.',
      'Grip the rope with both hands and step back to create tension.',
      'Pull the rope towards your face, pulling the ends apart as they reach your ears.',
      'Slowly return to the starting position.'
    ],
    imageUrl: '/exercises/face-pull.png'
  },
  {
    id: 'front-raise',
    name: 'Front Raise',
    muscleGroup: 'Shoulders',
    targetMuscles: ['Anterior Deltoid'],
    secondaryMuscles: ['Medial Deltoid'],
    equipment: 'Dumbbell',
    difficulty: 'beginner',
    instructions: [
      'Stand with a dumbbell in each hand resting on the front of your thighs.',
      'Raise one or both arms straight up in front of you until they are parallel to the floor.',
      'Slowly lower the weights back down.',
      'Maintain a slight bend in the elbow and avoid swinging your body.'
    ],
    imageUrl: '/exercises/front-raise.png'
  },
  {
    id: 'arnold-press',
    name: 'Arnold Press',
    muscleGroup: 'Shoulders',
    targetMuscles: ['Anterior Deltoid', 'Medial Deltoid'],
    secondaryMuscles: ['Triceps'],
    equipment: 'Dumbbell',
    difficulty: 'intermediate',
    instructions: [
      'Sit on a bench with back support, holding dumbbells in front of your face with palms facing you.',
      'As you press the dumbbells overhead, rotate your palms to face forward.',
      'Fully extend your arms at the top.',
      'Reverse the motion as you bring the dumbbells back to the starting position.'
    ],
    imageUrl: '/exercises/arnold-press.png'
  },
  {
    id: 'reverse-fly',
    name: 'Reverse Fly',
    muscleGroup: 'Shoulders',
    targetMuscles: ['Posterior Deltoid'],
    secondaryMuscles: ['Rhomboids'],
    equipment: 'Dumbbell',
    difficulty: 'beginner',
    instructions: [
      'Hinge at the hips so your torso is nearly parallel to the floor, holding dumbbells hanging down.',
      'With a slight bend in your elbows, raise the dumbbells out to your sides until they reach shoulder level.',
      'Squeeze your rear delts at the top, then lower the weights slowly.',
      'Keep your back flat throughout the movement.'
    ],
    imageUrl: '/exercises/reverse-fly.png'
  },

  // Biceps
  {
    id: 'barbell-curl',
    name: 'Barbell Curl',
    muscleGroup: 'Biceps',
    targetMuscles: ['Biceps Brachii'],
    secondaryMuscles: ['Brachialis', 'Forearms'],
    equipment: 'Barbell',
    difficulty: 'beginner',
    instructions: [
      'Stand straight with a barbell in your hands using an underhand grip, shoulder-width apart.',
      'Keeping your upper arms stationary, curl the bar upwards while contracting your biceps.',
      'Squeeze your biceps at the top, then slowly lower the bar back to the starting position.',
      'Avoid swinging your body to lift the weight.'
    ],
    imageUrl: '/exercises/barbell-curl.png'
  },
  {
    id: 'dumbbell-curl',
    name: 'Dumbbell Curl',
    muscleGroup: 'Biceps',
    targetMuscles: ['Biceps Brachii'],
    secondaryMuscles: ['Brachialis', 'Forearms'],
    equipment: 'Dumbbell',
    difficulty: 'beginner',
    instructions: [
      'Stand holding a dumbbell in each hand, palms facing forward.',
      'Curl the weights towards your shoulders, keeping your elbows tucked at your sides.',
      'Squeeze at the top of the movement.',
      'Lower the dumbbells back to the starting position with control.'
    ],
    imageUrl: '/exercises/dumbbell-curl.png'
  },
  {
    id: 'hammer-curl',
    name: 'Hammer Curl',
    muscleGroup: 'Biceps',
    targetMuscles: ['Brachialis', 'Brachioradialis'],
    secondaryMuscles: ['Biceps Brachii'],
    equipment: 'Dumbbell',
    difficulty: 'beginner',
    instructions: [
      'Stand holding a dumbbell in each hand with a neutral grip (palms facing your torso).',
      'Curl the weights upward while maintaining the neutral grip.',
      'Squeeze your arms at the top, then slowly lower the dumbbells.',
      'Keep your elbows stationary at your sides.'
    ],
    imageUrl: '/exercises/hammer-curl.png'
  },
  {
    id: 'preacher-curl',
    name: 'Preacher Curl',
    muscleGroup: 'Biceps',
    targetMuscles: ['Biceps Brachii'],
    secondaryMuscles: ['Brachialis', 'Forearms'],
    equipment: 'EZ Bar',
    difficulty: 'intermediate',
    instructions: [
      'Sit at a preacher curl bench, resting your upper arms on the pad.',
      'Hold an EZ bar with an underhand grip.',
      'Curl the bar upwards towards your shoulders, fully contracting the biceps.',
      'Lower the bar slowly until your arms are fully extended.'
    ],
    imageUrl: '/exercises/preacher-curl.png'
  },
  {
    id: 'cable-curl',
    name: 'Cable Curl',
    muscleGroup: 'Biceps',
    targetMuscles: ['Biceps Brachii'],
    secondaryMuscles: ['Brachialis'],
    equipment: 'Cable',
    difficulty: 'beginner',
    instructions: [
      'Attach a straight bar or rope to the lowest pulley on a cable machine.',
      'Grip the attachment and stand straight, keeping your elbows close to your torso.',
      'Curl your hands towards your shoulders, pulling against the cable resistance.',
      'Slowly lower the attachment back to the starting position.'
    ],
    imageUrl: '/exercises/cable-curl.png'
  },

  // Triceps
  {
    id: 'tricep-pushdown',
    name: 'Tricep Pushdown',
    muscleGroup: 'Triceps',
    targetMuscles: ['Triceps Brachii'],
    secondaryMuscles: ['Forearms'],
    equipment: 'Cable',
    difficulty: 'beginner',
    instructions: [
      'Attach a rope or straight bar to a high pulley on a cable machine.',
      'Grip the attachment and keep your elbows tucked into your sides.',
      'Push down until your arms are fully extended, squeezing your triceps.',
      'Slowly let the attachment rise back to chest height.'
    ],
    imageUrl: '/exercises/tricep-pushdown.png'
  },
  {
    id: 'skull-crusher',
    name: 'Skull Crusher',
    muscleGroup: 'Triceps',
    targetMuscles: ['Triceps Brachii'],
    secondaryMuscles: ['Forearms'],
    equipment: 'EZ Bar',
    difficulty: 'intermediate',
    instructions: [
      'Lie flat on a bench, holding an EZ bar with your arms extended straight up.',
      'Keeping your upper arms stationary, bend your elbows to lower the bar towards your forehead.',
      'Stop just above your head, then extend your elbows to press the weight back up.',
      'Keep your elbows pointing towards the ceiling.'
    ],
    imageUrl: '/exercises/skull-crusher.png'
  },
  {
    id: 'overhead-tricep-extension',
    name: 'Overhead Tricep Extension',
    muscleGroup: 'Triceps',
    targetMuscles: ['Triceps Brachii'],
    secondaryMuscles: ['Forearms'],
    equipment: 'Dumbbell',
    difficulty: 'beginner',
    instructions: [
      'Sit or stand holding a single dumbbell with both hands, arms extended overhead.',
      'Slowly lower the dumbbell behind your head by bending your elbows.',
      'Keep your upper arms close to your head and stationary.',
      'Extend your elbows to press the dumbbell back to the top.'
    ],
    imageUrl: '/exercises/overhead-tricep-extension.png'
  },
  {
    id: 'close-grip-bench-press',
    name: 'Close-Grip Bench Press',
    muscleGroup: 'Triceps',
    targetMuscles: ['Triceps Brachii'],
    secondaryMuscles: ['Pectoralis Major', 'Anterior Deltoid'],
    equipment: 'Barbell',
    difficulty: 'intermediate',
    instructions: [
      'Lie on a flat bench and grip the barbell with hands slightly narrower than shoulder-width.',
      'Unrack the bar and slowly lower it to your mid-chest, keeping your elbows tucked in.',
      'Press the bar back up explosively, focusing on using your triceps.',
      'Ensure your wrists stay straight throughout the movement.'
    ],
    imageUrl: '/exercises/close-grip-bench-press.png'
  },
  {
    id: 'tricep-dip',
    name: 'Tricep Dip',
    muscleGroup: 'Triceps',
    targetMuscles: ['Triceps Brachii'],
    secondaryMuscles: ['Chest', 'Anterior Deltoid'],
    equipment: 'Bodyweight',
    difficulty: 'intermediate',
    instructions: [
      'Position yourself on dip bars with your arms fully extended and torso straight.',
      'Lower your body slowly by bending your elbows until they reach a 90-degree angle.',
      'Keep your elbows pointed straight back and your torso upright to target the triceps.',
      'Push yourself back up to the starting position.'
    ],
    imageUrl: '/exercises/tricep-dip.png'
  },

  // Quads
  {
    id: 'barbell-squat',
    name: 'Barbell Squat',
    muscleGroup: 'Quads',
    targetMuscles: ['Quadriceps', 'Glutes'],
    secondaryMuscles: ['Hamstrings', 'Core', 'Erector Spinae'],
    equipment: 'Barbell',
    difficulty: 'advanced',
    instructions: [
      'Rest a barbell on your upper back, standing with feet shoulder-width apart.',
      'Brace your core and initiate the movement by pushing your hips back and bending your knees.',
      'Squat down until your thighs are at least parallel to the floor.',
      'Drive through your heels to stand back up to the starting position.'
    ],
    imageUrl: '/exercises/barbell-squat.png'
  },
  {
    id: 'leg-press',
    name: 'Leg Press',
    muscleGroup: 'Quads',
    targetMuscles: ['Quadriceps'],
    secondaryMuscles: ['Glutes', 'Hamstrings'],
    equipment: 'Machine',
    difficulty: 'beginner',
    instructions: [
      'Sit in the leg press machine and place your feet shoulder-width apart on the sled.',
      'Unlock the safety handles and lower the sled by bending your knees.',
      'Bring the sled down until your knees form a 90-degree angle.',
      'Press the sled back up without fully locking your knees.'
    ],
    imageUrl: '/exercises/leg-press.png'
  },
  {
    id: 'leg-extension',
    name: 'Leg Extension',
    muscleGroup: 'Quads',
    targetMuscles: ['Quadriceps'],
    secondaryMuscles: [],
    equipment: 'Machine',
    difficulty: 'beginner',
    instructions: [
      'Sit on the leg extension machine, adjusting the pad to rest on your lower shins.',
      'Grip the handles on the side of the machine for stability.',
      'Extend your legs fully to lift the weight, squeezing your quads at the top.',
      'Slowly lower the weight back down to the starting position.'
    ],
    imageUrl: '/exercises/leg-extension.png'
  },
  {
    id: 'lunge',
    name: 'Lunge',
    muscleGroup: 'Quads',
    targetMuscles: ['Quadriceps', 'Glutes'],
    secondaryMuscles: ['Hamstrings', 'Core'],
    equipment: 'Dumbbell',
    difficulty: 'beginner',
    instructions: [
      'Stand holding a dumbbell in each hand by your sides.',
      'Take a large step forward with one leg and lower your hips until both knees are bent at a 90-degree angle.',
      'Keep your front knee directly above your ankle.',
      'Push off your front foot to return to the starting position, then alternate legs.'
    ],
    imageUrl: '/exercises/lunge.png'
  },
  {
    id: 'bulgarian-split-squat',
    name: 'Bulgarian Split Squat',
    muscleGroup: 'Quads',
    targetMuscles: ['Quadriceps', 'Glutes'],
    secondaryMuscles: ['Hamstrings', 'Core'],
    equipment: 'Dumbbell',
    difficulty: 'intermediate',
    instructions: [
      'Stand a couple of feet in front of a bench, holding dumbbells by your sides.',
      'Place one foot behind you, resting the top of your foot on the bench.',
      'Lower your hips until your front thigh is parallel to the floor.',
      'Drive through your front heel to push yourself back up.'
    ],
    imageUrl: '/exercises/bulgarian-split-squat.png'
  },
  {
    id: 'hack-squat',
    name: 'Hack Squat',
    muscleGroup: 'Quads',
    targetMuscles: ['Quadriceps'],
    secondaryMuscles: ['Glutes', 'Hamstrings'],
    equipment: 'Machine',
    difficulty: 'intermediate',
    instructions: [
      'Position your shoulders under the pads of a hack squat machine with your back flat against the backrest.',
      'Place your feet shoulder-width apart on the platform.',
      'Lower the sled by bending your knees until your thighs are parallel to the platform.',
      'Push forcefully through your feet to return to the top position.'
    ],
    imageUrl: '/exercises/hack-squat.png'
  },

  // Hamstrings
  {
    id: 'romanian-deadlift',
    name: 'Romanian Deadlift',
    muscleGroup: 'Hamstrings',
    targetMuscles: ['Hamstrings', 'Glutes'],
    secondaryMuscles: ['Erector Spinae', 'Core'],
    equipment: 'Barbell',
    difficulty: 'intermediate',
    instructions: [
      'Stand holding a barbell with an overhand grip, feet shoulder-width apart.',
      'Keep your legs mostly straight with a slight bend in your knees.',
      'Hinge at the hips, pushing them back while lowering the barbell along your legs.',
      'Stop when you feel a deep stretch in your hamstrings, then squeeze your glutes to stand back up.'
    ],
    imageUrl: '/exercises/romanian-deadlift.png'
  },
  {
    id: 'leg-curl',
    name: 'Leg Curl',
    muscleGroup: 'Hamstrings',
    targetMuscles: ['Hamstrings'],
    secondaryMuscles: ['Calves'],
    equipment: 'Machine',
    difficulty: 'beginner',
    instructions: [
      'Lie face down on a leg curl machine, adjusting the pad to sit just above your heels.',
      'Hold the handles for stability and curl your legs up towards your glutes.',
      'Squeeze your hamstrings at the top of the movement.',
      'Slowly lower the weight back down with control.'
    ],
    imageUrl: '/exercises/leg-curl.png'
  },
  {
    id: 'stiff-leg-deadlift',
    name: 'Stiff-Leg Deadlift',
    muscleGroup: 'Hamstrings',
    targetMuscles: ['Hamstrings', 'Lower Back'],
    secondaryMuscles: ['Glutes'],
    equipment: 'Barbell',
    difficulty: 'intermediate',
    instructions: [
      'Stand holding a barbell with your feet hip-width apart and legs completely straight.',
      'Keeping your back flat, hinge forward at the hips to lower the bar towards your feet.',
      'Lower the bar as far as your hamstring flexibility allows.',
      'Return to the standing position by contracting your hamstrings and lower back.'
    ],
    imageUrl: '/exercises/stiff-leg-deadlift.png'
  },
  {
    id: 'nordic-hamstring-curl',
    name: 'Nordic Hamstring Curl',
    muscleGroup: 'Hamstrings',
    targetMuscles: ['Hamstrings'],
    secondaryMuscles: ['Glutes', 'Core'],
    equipment: 'Bodyweight',
    difficulty: 'advanced',
    instructions: [
      'Kneel on a soft pad and have a partner hold your ankles securely to the floor.',
      'Keeping your body straight from your knees to your head, slowly lower yourself forward.',
      'Use your hamstrings to control the descent as much as possible.',
      'Catch yourself with your hands when you fall, and use your arms to push yourself back up.'
    ],
    imageUrl: '/exercises/nordic-hamstring-curl.png'
  },
  {
    id: 'sumo-deadlift',
    name: 'Sumo Deadlift',
    muscleGroup: 'Hamstrings',
    targetMuscles: ['Hamstrings', 'Glutes', 'Quads'],
    secondaryMuscles: ['Erector Spinae', 'Adductors'],
    equipment: 'Barbell',
    difficulty: 'advanced',
    instructions: [
      'Stand with an ultra-wide stance, toes pointed outwards, with the barbell over your mid-foot.',
      'Drop your hips and grip the bar with your hands inside your knees.',
      'Keep your chest up and pull the bar by driving your feet into the floor.',
      'Stand tall and squeeze your glutes at the top before lowering the bar back down.'
    ],
    imageUrl: '/exercises/sumo-deadlift.png'
  },

  // Glutes
  {
    id: 'hip-thrust',
    name: 'Hip Thrust',
    muscleGroup: 'Glutes',
    targetMuscles: ['Gluteus Maximus'],
    secondaryMuscles: ['Hamstrings', 'Core'],
    equipment: 'Barbell',
    difficulty: 'intermediate',
    instructions: [
      'Sit on the floor with your upper back resting against a bench and a barbell over your hips.',
      'Plant your feet firmly on the ground, shoulder-width apart.',
      'Drive through your heels and squeeze your glutes to lift the barbell until your hips are fully extended.',
      'Slowly lower your hips back to the floor.'
    ],
    imageUrl: '/exercises/hip-thrust.png'
  },
  {
    id: 'glute-bridge',
    name: 'Glute Bridge',
    muscleGroup: 'Glutes',
    targetMuscles: ['Gluteus Maximus'],
    secondaryMuscles: ['Hamstrings', 'Core'],
    equipment: 'Bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Lie on your back with your knees bent and feet flat on the floor, close to your glutes.',
      'Push through your heels to raise your hips towards the ceiling.',
      'Squeeze your glutes at the top of the movement.',
      'Slowly lower your hips back down to the starting position.'
    ],
    imageUrl: '/exercises/glute-bridge.png'
  },
  {
    id: 'cable-kickback',
    name: 'Cable Kickback',
    muscleGroup: 'Glutes',
    targetMuscles: ['Gluteus Maximus'],
    secondaryMuscles: ['Hamstrings'],
    equipment: 'Cable',
    difficulty: 'beginner',
    instructions: [
      'Attach an ankle cuff to a low cable pulley and strap it to one ankle.',
      'Face the machine, holding onto it for support, with a slight bend in your supporting leg.',
      'Kick your strapped leg straight back, focusing on squeezing your glutes.',
      'Slowly return the leg to the starting position without resting the weight.'
    ],
    imageUrl: '/exercises/cable-kickback.png'
  },
  {
    id: 'sumo-squat',
    name: 'Sumo Squat',
    muscleGroup: 'Glutes',
    targetMuscles: ['Glutes', 'Quads', 'Adductors'],
    secondaryMuscles: ['Hamstrings'],
    equipment: 'Dumbbell',
    difficulty: 'beginner',
    instructions: [
      'Stand with a wide stance, toes pointed outward, holding a single dumbbell with both hands between your legs.',
      'Keep your chest up and lower your hips down until your thighs are parallel to the floor.',
      'Push through your heels to stand back up, squeezing your glutes at the top.',
      'Ensure your knees track in the same direction as your toes throughout.'
    ],
    imageUrl: '/exercises/sumo-squat.png'
  },
  {
    id: 'step-up',
    name: 'Step-Up',
    muscleGroup: 'Glutes',
    targetMuscles: ['Glutes', 'Quadriceps'],
    secondaryMuscles: ['Hamstrings', 'Calves'],
    equipment: 'Dumbbell',
    difficulty: 'beginner',
    instructions: [
      'Stand in front of a bench or step holding a dumbbell in each hand.',
      'Place one foot firmly on the bench.',
      'Drive through your elevated heel to step up, bringing your other foot onto the bench.',
      'Slowly step down with the trailing leg first, then alternate sides.'
    ],
    imageUrl: '/exercises/step-up.png'
  },

  // Calves
  {
    id: 'standing-calf-raise',
    name: 'Standing Calf Raise',
    muscleGroup: 'Calves',
    targetMuscles: ['Gastrocnemius'],
    secondaryMuscles: ['Soleus'],
    equipment: 'Machine',
    difficulty: 'beginner',
    instructions: [
      'Stand on a calf raise machine with the shoulder pads resting on your shoulders and the balls of your feet on the platform.',
      'Let your heels drop as far as possible to stretch your calves.',
      'Push up onto the balls of your feet, contracting your calves forcefully.',
      'Slowly lower your heels back down.'
    ],
    imageUrl: '/exercises/standing-calf-raise.png'
  },
  {
    id: 'seated-calf-raise',
    name: 'Seated Calf Raise',
    muscleGroup: 'Calves',
    targetMuscles: ['Soleus'],
    secondaryMuscles: ['Gastrocnemius'],
    equipment: 'Machine',
    difficulty: 'beginner',
    instructions: [
      'Sit on a seated calf raise machine and adjust the thigh pads to rest comfortably above your knees.',
      'Place the balls of your feet on the footplate and let your heels drop down.',
      'Push through the balls of your feet to raise your heels as high as possible.',
      'Lower your heels back down with control.'
    ],
    imageUrl: '/exercises/seated-calf-raise.png'
  },
  {
    id: 'donkey-calf-raise',
    name: 'Donkey Calf Raise',
    muscleGroup: 'Calves',
    targetMuscles: ['Gastrocnemius'],
    secondaryMuscles: ['Soleus'],
    equipment: 'Machine',
    difficulty: 'intermediate',
    instructions: [
      'Position yourself in a donkey calf raise machine, hinging at the hips so your back is flat.',
      'Place the balls of your feet on the platform and let your heels drop.',
      'Raise your heels as high as possible by flexing your calves.',
      'Lower your heels fully to return to the stretched position.'
    ],
    imageUrl: '/exercises/donkey-calf-raise.png'
  },

  // Core
  {
    id: 'plank',
    name: 'Plank',
    muscleGroup: 'Core',
    targetMuscles: ['Rectus Abdominis', 'Transverse Abdominis'],
    secondaryMuscles: ['Shoulders', 'Glutes'],
    equipment: 'Bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Assume a push-up position, but rest your weight on your forearms instead of your hands.',
      'Keep your body in a straight line from your head to your heels.',
      'Engage your core and squeeze your glutes.',
      'Hold this position for the desired amount of time without letting your hips sag.'
    ],
    imageUrl: '/exercises/plank.png'
  },
  {
    id: 'cable-crunch',
    name: 'Cable Crunch',
    muscleGroup: 'Core',
    targetMuscles: ['Rectus Abdominis'],
    secondaryMuscles: ['Obliques'],
    equipment: 'Cable',
    difficulty: 'intermediate',
    instructions: [
      'Kneel below a high cable pulley with a rope attachment.',
      'Hold the rope behind your neck and lock your hips in place.',
      'Crunch your torso downward, bringing your elbows towards your knees.',
      'Slowly return to the starting position without letting the weight stack rest.'
    ],
    imageUrl: '/exercises/cable-crunch.png'
  },
  {
    id: 'hanging-leg-raise',
    name: 'Hanging Leg Raise',
    muscleGroup: 'Core',
    targetMuscles: ['Lower Rectus Abdominis'],
    secondaryMuscles: ['Hip Flexors', 'Forearms'],
    equipment: 'Bodyweight',
    difficulty: 'advanced',
    instructions: [
      'Hang from a pull-up bar with an overhand grip and your legs straight.',
      'Engage your core and lift your legs forward until they are parallel to the floor.',
      'Lower your legs slowly back to the starting position.',
      'Avoid swinging your body to build momentum.'
    ],
    imageUrl: '/exercises/hanging-leg-raise.png'
  },
  {
    id: 'russian-twist',
    name: 'Russian Twist',
    muscleGroup: 'Core',
    targetMuscles: ['Obliques'],
    secondaryMuscles: ['Rectus Abdominis'],
    equipment: 'Bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Sit on the floor with your knees bent and feet slightly elevated.',
      'Lean back slightly, keeping your back straight and core engaged.',
      'Clasp your hands together and twist your torso to the right, bringing your hands towards the floor.',
      'Twist back to the center and then to the left, completing one rep.'
    ],
    imageUrl: '/exercises/russian-twist.png'
  },
  {
    id: 'ab-wheel-rollout',
    name: 'Ab Wheel Rollout',
    muscleGroup: 'Core',
    targetMuscles: ['Rectus Abdominis', 'Transverse Abdominis'],
    secondaryMuscles: ['Lats', 'Shoulders'],
    equipment: 'Bodyweight',
    difficulty: 'advanced',
    instructions: [
      'Kneel on the floor and grab the handles of an ab wheel.',
      'Slowly roll the wheel forward, extending your body as far as you can without letting your lower back sag.',
      'Engage your core to pull the wheel back to the starting position.',
      'Keep your arms and back straight throughout the movement.'
    ],
    imageUrl: '/exercises/ab-wheel-rollout.png'
  },
  {
    id: 'woodchop',
    name: 'Woodchop',
    muscleGroup: 'Core',
    targetMuscles: ['Obliques', 'Transverse Abdominis'],
    secondaryMuscles: ['Shoulders', 'Hips'],
    equipment: 'Cable',
    difficulty: 'intermediate',
    instructions: [
      'Set a cable pulley to the highest position with a single D-handle attachment.',
      'Stand sideways to the machine, holding the handle with both hands above one shoulder.',
      'Twist your torso and pull the handle down across your body towards the opposite hip.',
      'Slowly return to the starting position, maintaining control against the resistance.'
    ],
    imageUrl: '/exercises/woodchop.png'
  }
];

export const getExercisesByMuscleGroup = (group: string) => EXERCISES.filter(e => e.muscleGroup === group);
export const getExercisesByEquipment = (equipment: string) => EXERCISES.filter(e => e.equipment === equipment);
export const searchExercises = (query: string) => EXERCISES.filter(e => e.name.toLowerCase().includes(query.toLowerCase()) || e.muscleGroup.toLowerCase().includes(query.toLowerCase()));
