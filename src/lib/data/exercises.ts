export interface Exercise {
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

export const EXERCISES: Exercise[] = [
  {
    "id": "barbell-bench-press",
    "name": "Barbell Bench Press",
    "muscleGroup": "Chest",
    "targetMuscles": [
      "chest"
    ],
    "secondaryMuscles": [
      "shoulders",
      "triceps"
    ],
    "equipment": "Barbell",
    "difficulty": "beginner",
    "instructions": [
      "Lie back on a flat bench. Using a medium width grip (a grip that creates a 90-degree angle in the middle of the movement between the forearms and the upper arms), lift the bar from the rack and hold it straight over you with your arms locked. This will be your starting position.",
      "From the starting position, breathe in and begin coming down slowly until the bar touches your middle chest.",
      "After a brief pause, push the bar back to the starting position as you breathe out. Focus on pushing the bar using your chest muscles. Lock your arms and squeeze your chest in the contracted position at the top of the motion, hold for a second and then start coming down slowly again. Tip: Ideally, lowering the weight should take about twice as long as raising it.",
      "Repeat the movement for the prescribed amount of repetitions.",
      "When you are done, place the bar back in the rack."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press_-_Medium_Grip/0.jpg"
  },
  {
    "id": "incline-dumbbell-press",
    "name": "Incline Dumbbell Press",
    "muscleGroup": "Chest",
    "targetMuscles": [
      "chest"
    ],
    "secondaryMuscles": [
      "shoulders",
      "triceps"
    ],
    "equipment": "Dumbbell",
    "difficulty": "beginner",
    "instructions": [
      "Lie back on an incline bench with a dumbbell in each hand atop your thighs. The palms of your hands will be facing each other.",
      "Then, using your thighs to help push the dumbbells up, lift the dumbbells one at a time so that you can hold them at shoulder width.",
      "Once you have the dumbbells raised to shoulder width, rotate your wrists forward so that the palms of your hands are facing away from you. This will be your starting position.",
      "Be sure to keep full control of the dumbbells at all times. Then breathe out and push the dumbbells up with your chest.",
      "Lock your arms at the top, hold for a second, and then start slowly lowering the weight. Tip Ideally, lowering the weights should take about twice as long as raising them.",
      "Repeat the movement for the prescribed amount of repetitions.",
      "When you are done, place the dumbbells back on your thighs and then on the floor. This is the safest manner to release the dumbbells."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Dumbbell_Press/0.jpg"
  },
  {
    "id": "cable-fly",
    "name": "Cable Fly",
    "muscleGroup": "Chest",
    "targetMuscles": [
      "chest"
    ],
    "secondaryMuscles": [
      "shoulders"
    ],
    "equipment": "Cable",
    "difficulty": "beginner",
    "instructions": [
      "To get yourself into the starting position, place the pulleys on a high position (above your head), select the resistance to be used and hold the pulleys in each hand.",
      "Step forward in front of an imaginary straight line between both pulleys while pulling your arms together in front of you. Your torso should have a small forward bend from the waist. This will be your starting position.",
      "With a slight bend on your elbows in order to prevent stress at the biceps tendon, extend your arms to the side (straight out at both sides) in a wide arc until you feel a stretch on your chest. Breathe in as you perform this portion of the movement. Tip: Keep in mind that throughout the movement, the arms and torso should remain stationary; the movement should only occur at the shoulder joint.",
      "Return your arms back to the starting position as you breathe out. Make sure to use the same arc of motion used to lower the weights.",
      "Hold for a second at the starting position and repeat the movement for the prescribed amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Crossover/0.jpg"
  },
  {
    "id": "chest-dip",
    "name": "Chest Dip",
    "muscleGroup": "Chest",
    "targetMuscles": [
      "chest"
    ],
    "secondaryMuscles": [
      "shoulders",
      "triceps"
    ],
    "equipment": "Bodyweight",
    "difficulty": "intermediate",
    "instructions": [
      "For this exercise you will need access to parallel bars. To get yourself into the starting position, hold your body at arms length (arms locked) above the bars.",
      "While breathing in, lower yourself slowly with your torso leaning forward around 30 degrees or so and your elbows flared out slightly until you feel a slight stretch in the chest.",
      "Once you feel the stretch, use your chest to bring your body back to the starting position as you breathe out. Tip: Remember to squeeze the chest at the top of the movement for a second.",
      "Repeat the movement for the prescribed amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dips_-_Chest_Version/0.jpg"
  },
  {
    "id": "dumbbell-fly",
    "name": "Dumbbell Fly",
    "muscleGroup": "Chest",
    "targetMuscles": [
      "chest"
    ],
    "secondaryMuscles": [],
    "equipment": "Dumbbell",
    "difficulty": "beginner",
    "instructions": [
      "Lie down on a flat bench with a dumbbell on each hand resting on top of your thighs. The palms of your hand will be facing each other.",
      "Then using your thighs to help raise the dumbbells, lift the dumbbells one at a time so you can hold them in front of you at shoulder width with the palms of your hands facing each other. Raise the dumbbells up like you're pressing them, but stop and hold just before you lock out. This will be your starting position.",
      "With a slight bend on your elbows in order to prevent stress at the biceps tendon, lower your arms out at both sides in a wide arc until you feel a stretch on your chest. Breathe in as you perform this portion of the movement. Tip: Keep in mind that throughout the movement, the arms should remain stationary; the movement should only occur at the shoulder joint.",
      "Return your arms back to the starting position as you squeeze your chest muscles and breathe out. Tip: Make sure to use the same arc of motion used to lower the weights.",
      "Hold for a second at the contracted position and repeat the movement for the prescribed amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Flyes/0.jpg"
  },
  {
    "id": "machine-chest-press",
    "name": "Machine Chest Press",
    "muscleGroup": "Chest",
    "targetMuscles": [
      "chest"
    ],
    "secondaryMuscles": [
      "shoulders",
      "triceps"
    ],
    "equipment": "Machine",
    "difficulty": "beginner",
    "instructions": [
      "Sit down on the Chest Press Machine and select the weight.",
      "Step on the lever provided by the machine since it will help you to bring the handles forward so that you can grab the handles and fully extend the arms.",
      "Grab the handles with a palms-down grip and lift your elbows so that your upper arms are parallel to the floor to the sides of your torso. Tip: Your forearms will be pointing forward since you are grabbing the handles. Once you bring the handles forward and extend the arms you will be at the starting position.",
      "Now bring the handles back towards you as you breathe in.",
      "Push the handles away from you as you flex your pecs and you breathe out. Hold the contraction for a second before going back to the starting position.",
      "Repeat for the recommended amount of reps.",
      "When finished step on the lever again and slowly get the handles back to their original place."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Machine_Bench_Press/0.jpg"
  },
  {
    "id": "deadlift",
    "name": "Deadlift",
    "muscleGroup": "Back",
    "targetMuscles": [
      "lower back"
    ],
    "secondaryMuscles": [
      "calves",
      "forearms",
      "glutes",
      "hamstrings",
      "lats",
      "middle back",
      "quadriceps",
      "traps"
    ],
    "equipment": "Barbell",
    "difficulty": "intermediate",
    "instructions": [
      "Stand in front of a loaded barbell.",
      "While keeping the back as straight as possible, bend your knees, bend forward and grasp the bar using a medium (shoulder width) overhand grip. This will be the starting position of the exercise. Tip: If it is difficult to hold on to the bar with this grip, alternate your grip or use wrist straps.",
      "While holding the bar, start the lift by pushing with your legs while simultaneously getting your torso to the upright position as you breathe out. In the upright position, stick your chest out and contract the back by bringing the shoulder blades back. Think of how the soldiers in the military look when they are in standing in attention.",
      "Go back to the starting position by bending at the knees while simultaneously leaning the torso forward at the waist while keeping the back straight. When the weights on the bar touch the floor you are back at the starting position and ready to perform another repetition.",
      "Perform the amount of repetitions prescribed in the program."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Deadlift/0.jpg"
  },
  {
    "id": "barbell-row",
    "name": "Barbell Row",
    "muscleGroup": "Back",
    "targetMuscles": [
      "middle back"
    ],
    "secondaryMuscles": [
      "biceps",
      "lats",
      "shoulders"
    ],
    "equipment": "Barbell",
    "difficulty": "beginner",
    "instructions": [
      "Holding a barbell with a pronated grip (palms facing down), bend your knees slightly and bring your torso forward, by bending at the waist, while keeping the back straight until it is almost parallel to the floor. Tip: Make sure that you keep the head up. The barbell should hang directly in front of you as your arms hang perpendicular to the floor and your torso. This is your starting position.",
      "Now, while keeping the torso stationary, breathe out and lift the barbell to you. Keep the elbows close to the body and only use the forearms to hold the weight. At the top contracted position, squeeze the back muscles and hold for a brief pause.",
      "Then inhale and slowly lower the barbell back to the starting position.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bent_Over_Barbell_Row/0.jpg"
  },
  {
    "id": "lat-pulldown",
    "name": "Lat Pulldown",
    "muscleGroup": "Back",
    "targetMuscles": [
      "lats"
    ],
    "secondaryMuscles": [
      "biceps",
      "middle back",
      "shoulders"
    ],
    "equipment": "Cable",
    "difficulty": "beginner",
    "instructions": [
      "Sit down on a pull-down machine with a wide bar attached to the top pulley. Make sure that you adjust the knee pad of the machine to fit your height. These pads will prevent your body from being raised by the resistance attached to the bar.",
      "Grab the bar with the palms facing forward using the prescribed grip. Note on grips: For a wide grip, your hands need to be spaced out at a distance wider than shoulder width. For a medium grip, your hands need to be spaced out at a distance equal to your shoulder width and for a close grip at a distance smaller than your shoulder width.",
      "As you have both arms extended in front of you holding the bar at the chosen grip width, bring your torso back around 30 degrees or so while creating a curvature on your lower back and sticking your chest out. This is your starting position.",
      "As you breathe out, bring the bar down until it touches your upper chest by drawing the shoulders and the upper arms down and back. Tip: Concentrate on squeezing the back muscles once you reach the full contracted position. The upper torso should remain stationary and only the arms should move. The forearms should do no other work except for holding the bar; therefore do not try to pull down the bar using the forearms.",
      "After a second at the contracted position squeezing your shoulder blades together, slowly raise the bar back to the starting position when your arms are fully extended and the lats are fully stretched. Inhale during this portion of the movement.",
      "Repeat this motion for the prescribed amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Wide-Grip_Lat_Pulldown/0.jpg"
  },
  {
    "id": "seated-cable-row",
    "name": "Seated Cable Row",
    "muscleGroup": "Back",
    "targetMuscles": [
      "middle back"
    ],
    "secondaryMuscles": [
      "biceps",
      "lats",
      "shoulders"
    ],
    "equipment": "Cable",
    "difficulty": "beginner",
    "instructions": [
      "For this exercise you will need access to a low pulley row machine with a V-bar. Note: The V-bar will enable you to have a neutral grip where the palms of your hands face each other. To get into the starting position, first sit down on the machine and place your feet on the front platform or crossbar provided making sure that your knees are slightly bent and not locked.",
      "Lean over as you keep the natural alignment of your back and grab the V-bar handles.",
      "With your arms extended pull back until your torso is at a 90-degree angle from your legs. Your back should be slightly arched and your chest should be sticking out. You should be feeling a nice stretch on your lats as you hold the bar in front of you. This is the starting position of the exercise.",
      "Keeping the torso stationary, pull the handles back towards your torso while keeping the arms close to it until you touch the abdominals. Breathe out as you perform that movement. At that point you should be squeezing your back muscles hard. Hold that contraction for a second and slowly go back to the original position while breathing in.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Cable_Rows/0.jpg"
  },
  {
    "id": "pull-up",
    "name": "Pull-up",
    "muscleGroup": "Back",
    "targetMuscles": [
      "lats"
    ],
    "secondaryMuscles": [
      "biceps",
      "middle back"
    ],
    "equipment": "Bodyweight",
    "difficulty": "beginner",
    "instructions": [
      "Grab the pull-up bar with the palms facing forward using the prescribed grip. Note on grips: For a wide grip, your hands need to be spaced out at a distance wider than your shoulder width. For a medium grip, your hands need to be spaced out at a distance equal to your shoulder width and for a close grip at a distance smaller than your shoulder width.",
      "As you have both arms extended in front of you holding the bar at the chosen grip width, bring your torso back around 30 degrees or so while creating a curvature on your lower back and sticking your chest out. This is your starting position.",
      "Pull your torso up until the bar touches your upper chest by drawing the shoulders and the upper arms down and back. Exhale as you perform this portion of the movement. Tip: Concentrate on squeezing the back muscles once you reach the full contracted position. The upper torso should remain stationary as it moves through space and only the arms should move. The forearms should do no other work other than hold the bar.",
      "After a second on the contracted position, start to inhale and slowly lower your torso back to the starting position when your arms are fully extended and the lats are fully stretched.",
      "Repeat this motion for the prescribed amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pullups/0.jpg"
  },
  {
    "id": "t-bar-row",
    "name": "T-Bar Row",
    "muscleGroup": "Back",
    "targetMuscles": [
      "middle back"
    ],
    "secondaryMuscles": [
      "biceps",
      "lats"
    ],
    "equipment": "Machine",
    "difficulty": "beginner",
    "instructions": [
      "Position a bar into a landmine or in a corner to keep it from moving. Load an appropriate weight onto your end.",
      "Stand over the bar, and position a Double D row handle around the bar next to the collar. Using your hips and legs, rise to a standing position.",
      "Assume a wide stance with your hips back and your chest up. Your arms should be extended. This will be your starting position.",
      "Pull the weight to your upper abdomen by retracting the shoulder blades and flexing the elbows. Do not jerk the weight or cheat during the movement.",
      "After a brief pause, return to the starting position."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/T-Bar_Row_with_Handle/0.jpg"
  },
  {
    "id": "dumbbell-row",
    "name": "Dumbbell Row",
    "muscleGroup": "Back",
    "targetMuscles": [
      "middle back"
    ],
    "secondaryMuscles": [
      "biceps",
      "lats",
      "shoulders"
    ],
    "equipment": "Dumbbell",
    "difficulty": "beginner",
    "instructions": [
      "Choose a flat bench and place a dumbbell on each side of it.",
      "Place the right leg on top of the end of the bench, bend your torso forward from the waist until your upper body is parallel to the floor, and place your right hand on the other end of the bench for support.",
      "Use the left hand to pick up the dumbbell on the floor and hold the weight while keeping your lower back straight. The palm of the hand should be facing your torso. This will be your starting position.",
      "Pull the resistance straight up to the side of your chest, keeping your upper arm close to your side and keeping the torso stationary. Breathe out as you perform this step. Tip: Concentrate on squeezing the back muscles once you reach the full contracted position. Also, make sure that the force is performed with the back muscles and not the arms. Finally, the upper torso should remain stationary and only the arms should move. The forearms should do no other work except for holding the dumbbell; therefore do not try to pull the dumbbell up using the forearms.",
      "Lower the resistance straight down to the starting position. Breathe in as you perform this step.",
      "Repeat the movement for the specified amount of repetitions.",
      "Switch sides and repeat again with the other arm."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/One-Arm_Dumbbell_Row/0.jpg"
  },
  {
    "id": "overhead-press",
    "name": "Overhead Press",
    "muscleGroup": "Shoulders",
    "targetMuscles": [
      "shoulders"
    ],
    "secondaryMuscles": [
      "triceps"
    ],
    "equipment": "Barbell",
    "difficulty": "beginner",
    "instructions": [
      "Start by placing a barbell that is about chest high on a squat rack. Once you have selected the weights, grab the barbell using a pronated (palms facing forward) grip. Make sure to grip the bar wider than shoulder width apart from each other.",
      "Slightly bend the knees and place the barbell on your collar bone. Lift the barbell up keeping it lying on your chest. Take a step back and position your feet shoulder width apart from each other.",
      "Once you pick up the barbell with the correct grip length, lift the bar up over your head by locking your arms. Hold at about shoulder level and slightly in front of your head. This is your starting position.",
      "Lower the bar down to the collarbone slowly as you inhale.",
      "Lift the bar back up to the starting position as you exhale.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Military_Press/0.jpg"
  },
  {
    "id": "lateral-raise",
    "name": "Lateral Raise",
    "muscleGroup": "Shoulders",
    "targetMuscles": [
      "shoulders"
    ],
    "secondaryMuscles": [],
    "equipment": "Dumbbell",
    "difficulty": "beginner",
    "instructions": [
      "Pick a couple of dumbbells and stand with a straight torso and the dumbbells by your side at arms length with the palms of the hand facing you. This will be your starting position.",
      "While maintaining the torso in a stationary position (no swinging), lift the dumbbells to your side with a slight bend on the elbow and the hands slightly tilted forward as if pouring water in a glass. Continue to go up until you arms are parallel to the floor. Exhale as you execute this movement and pause for a second at the top.",
      "Lower the dumbbells back down slowly to the starting position as you inhale.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Side_Lateral_Raise/0.jpg"
  },
  {
    "id": "face-pull",
    "name": "Face Pull",
    "muscleGroup": "Shoulders",
    "targetMuscles": [
      "shoulders"
    ],
    "secondaryMuscles": [
      "middle back"
    ],
    "equipment": "Cable",
    "difficulty": "intermediate",
    "instructions": [
      "Facing a high pulley with a rope or dual handles attached, pull the weight directly towards your face, separating your hands as you do so. Keep your upper arms parallel to the ground."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Face_Pull/0.jpg"
  },
  {
    "id": "front-raise",
    "name": "Front Raise",
    "muscleGroup": "Shoulders",
    "targetMuscles": [
      "shoulders"
    ],
    "secondaryMuscles": [],
    "equipment": "Dumbbell",
    "difficulty": "beginner",
    "instructions": [
      "Pick a couple of dumbbells and stand with a straight torso and the dumbbells on front of your thighs at arms length with the palms of the hand facing your thighs. This will be your starting position.",
      "While maintaining the torso stationary (no swinging), lift the left dumbbell to the front with a slight bend on the elbow and the palms of the hands always facing down. Continue to go up until you arm is slightly above parallel to the floor. Exhale as you execute this portion of the movement and pause for a second at the top. Inhale after the second pause.",
      "Now lower the dumbbell back down slowly to the starting position as you simultaneously lift the right dumbbell.",
      "Continue alternating in this fashion until all of the recommended amount of repetitions have been performed for each arm."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Front_Dumbbell_Raise/0.jpg"
  },
  {
    "id": "arnold-press",
    "name": "Arnold Press",
    "muscleGroup": "Shoulders",
    "targetMuscles": [
      "shoulders"
    ],
    "secondaryMuscles": [
      "triceps"
    ],
    "equipment": "Dumbbell",
    "difficulty": "intermediate",
    "instructions": [
      "Sit on an exercise bench with back support and hold two dumbbells in front of you at about upper chest level with your palms facing your body and your elbows bent. Tip: Your arms should be next to your torso. The starting position should look like the contracted portion of a dumbbell curl.",
      "Now to perform the movement, raise the dumbbells as you rotate the palms of your hands until they are facing forward.",
      "Continue lifting the dumbbells until your arms are extended above you in straight arm position. Breathe out as you perform this portion of the movement.",
      "After a second pause at the top, begin to lower the dumbbells to the original position by rotating the palms of your hands towards you. Tip: The left arm will be rotated in a counter clockwise manner while the right one will be rotated clockwise. Breathe in as you perform this portion of the movement.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Arnold_Dumbbell_Press/0.jpg"
  },
  {
    "id": "reverse-fly",
    "name": "Reverse Fly",
    "muscleGroup": "Shoulders",
    "targetMuscles": [
      "shoulders"
    ],
    "secondaryMuscles": [],
    "equipment": "Machine",
    "difficulty": "beginner",
    "instructions": [
      "Adjust the handles so that they are fully to the rear. Make an appropriate weight selection and adjust the seat height so the handles are at shoulder level. Grasp the handles with your hands facing inwards. This will be your starting position.",
      "In a semicircular motion, pull your hands out to your side and back, contracting your rear delts.",
      "Keep your arms slightly bent throughout the movement, with all of the motion occurring at the shoulder joint.",
      "Pause at the rear of the movement, and slowly return the weight to the starting position."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Reverse_Machine_Flyes/0.jpg"
  },
  {
    "id": "barbell-curl",
    "name": "Barbell Curl",
    "muscleGroup": "Biceps",
    "targetMuscles": [
      "biceps"
    ],
    "secondaryMuscles": [
      "forearms"
    ],
    "equipment": "Barbell",
    "difficulty": "beginner",
    "instructions": [
      "Stand up with your torso upright while holding a barbell at a shoulder-width grip. The palm of your hands should be facing forward and the elbows should be close to the torso. This will be your starting position.",
      "While holding the upper arms stationary, curl the weights forward while contracting the biceps as you breathe out. Tip: Only the forearms should move.",
      "Continue the movement until your biceps are fully contracted and the bar is at shoulder level. Hold the contracted position for a second and squeeze the biceps hard.",
      "Slowly begin to bring the bar back to starting position as your breathe in.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Curl/0.jpg"
  },
  {
    "id": "dumbbell-curl",
    "name": "Dumbbell Curl",
    "muscleGroup": "Biceps",
    "targetMuscles": [
      "biceps"
    ],
    "secondaryMuscles": [
      "forearms"
    ],
    "equipment": "Dumbbell",
    "difficulty": "beginner",
    "instructions": [
      "Stand (torso upright) with a dumbbell in each hand held at arms length. The elbows should be close to the torso and the palms of your hand should be facing your thighs.",
      "While holding the upper arm stationary, curl the right weight as you rotate the palm of the hands until they are facing forward. At this point continue contracting the biceps as you breathe out until your biceps is fully contracted and the dumbbells are at shoulder level. Hold the contracted position for a second as you squeeze the biceps. Tip: Only the forearms should move.",
      "Slowly begin to bring the dumbbell back to the starting position as your breathe in. Tip: Remember to twist the palms back to the starting position (facing your thighs) as you come down.",
      "Repeat the movement with the left hand. This equals one repetition.",
      "Continue alternating in this manner for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Alternate_Bicep_Curl/0.jpg"
  },
  {
    "id": "hammer-curl",
    "name": "Hammer Curl",
    "muscleGroup": "Biceps",
    "targetMuscles": [
      "biceps"
    ],
    "secondaryMuscles": [],
    "equipment": "Dumbbell",
    "difficulty": "beginner",
    "instructions": [
      "Stand up with your torso upright and a dumbbell on each hand being held at arms length. The elbows should be close to the torso.",
      "The palms of the hands should be facing your torso. This will be your starting position.",
      "Now, while holding your upper arm stationary, exhale and curl the weight forward while contracting the biceps. Continue to raise the weight until the biceps are fully contracted and the dumbbell is at shoulder level. Hold the contracted position for a brief moment as you squeeze the biceps. Tip: Focus on keeping the elbow stationary and only moving your forearm.",
      "After the brief pause, inhale and slowly begin the lower the dumbbells back down to the starting position.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Hammer_Curls/0.jpg"
  },
  {
    "id": "preacher-curl",
    "name": "Preacher Curl",
    "muscleGroup": "Biceps",
    "targetMuscles": [
      "biceps"
    ],
    "secondaryMuscles": [],
    "equipment": "EZ Bar",
    "difficulty": "beginner",
    "instructions": [
      "To perform this movement you will need a preacher bench and an E-Z bar. Grab the E-Z curl bar at the close inner handle (either have someone hand you the bar which is preferable or grab the bar from the front bar rest provided by most preacher benches). The palm of your hands should be facing forward and they should be slightly tilted inwards due to the shape of the bar.",
      "With the upper arms positioned against the preacher bench pad and the chest against it, hold the E-Z Curl Bar at shoulder length. This will be your starting position.",
      "As you breathe in, slowly lower the bar until your upper arm is extended and the biceps is fully stretched.",
      "As you exhale, use the biceps to curl the weight up until your biceps is fully contracted and the bar is at shoulder height. Squeeze the biceps hard and hold this position for a second.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Preacher_Curl/0.jpg"
  },
  {
    "id": "cable-curl",
    "name": "Cable Curl",
    "muscleGroup": "Biceps",
    "targetMuscles": [
      "biceps"
    ],
    "secondaryMuscles": [],
    "equipment": "Cable",
    "difficulty": "beginner",
    "instructions": [
      "Attach a rope attachment to a low pulley and stand facing the machine about 12 inches away from it.",
      "Grasp the rope with a neutral (palms-in) grip and stand straight up keeping the natural arch of the back and your torso stationary.",
      "Put your elbows in by your side and keep them there stationary during the entire movement. Tip: Only the forearms should move; not your upper arms. This will be your starting position.",
      "Using your biceps, pull your arms up as you exhale until your biceps touch your forearms. Tip: Remember to keep the elbows in and your upper arms stationary.",
      "After a 1 second contraction where you squeeze your biceps, slowly start to bring the weight back to the original position.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Hammer_Curls_-_Rope_Attachment/0.jpg"
  },
  {
    "id": "tricep-pushdown",
    "name": "Tricep Pushdown",
    "muscleGroup": "Triceps",
    "targetMuscles": [
      "triceps"
    ],
    "secondaryMuscles": [],
    "equipment": "Cable",
    "difficulty": "beginner",
    "instructions": [
      "Attach a V-Bar to a high pulley and grab with an overhand grip (palms facing down) at shoulder width.",
      "Standing upright with the torso straight and a very small inclination forward, bring the upper arms close to your body and perpendicular to the floor. The forearms should be pointing up towards the pulley as they hold the bar. The thumbs should be higher than the small finger. This is your starting position.",
      "Using the triceps, bring the bar down until it touches the front of your thighs and the arms are fully extended perpendicular to the floor. The upper arms should always remain stationary next to your torso and only the forearms should move. Exhale as you perform this movement.",
      "After a second hold at the contracted position, bring the V-Bar slowly up to the starting point. Breathe in as you perform this step.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Triceps_Pushdown_-_V-Bar_Attachment/0.jpg"
  },
  {
    "id": "skull-crusher",
    "name": "Skull Crusher",
    "muscleGroup": "Triceps",
    "targetMuscles": [
      "triceps"
    ],
    "secondaryMuscles": [],
    "equipment": "EZ Bar",
    "difficulty": "intermediate",
    "instructions": [
      "Lie on a flat bench with either an e-z bar (my preference) or a straight bar placed on the floor behind your head and your feet on the floor.",
      "Grab the bar behind you, using a medium overhand (pronated) grip, and raise the bar in front of you at arms length. Tip: The arms should be perpendicular to the torso and the floor. The elbows should be tucked in. This is the starting position.",
      "As you breathe in, slowly lower the weight until the bar lightly touches your forehead while keeping the upper arms and elbows stationary.",
      "At that point, use the triceps to bring the weight back up to the starting position as you breathe out.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Lying_Triceps_Press/0.jpg"
  },
  {
    "id": "overhead-tricep-extension",
    "name": "Overhead Tricep Extension",
    "muscleGroup": "Triceps",
    "targetMuscles": [
      "triceps"
    ],
    "secondaryMuscles": [],
    "equipment": "Dumbbell",
    "difficulty": "beginner",
    "instructions": [
      "To begin, stand up with a dumbbell held by both hands. Your feet should be about shoulder width apart from each other. Slowly use both hands to grab the dumbbell and lift it over your head until both arms are fully extended.",
      "The resistance should be resting in the palms of your hands with your thumbs around it. The palm of the hands should be facing up towards the ceiling. This will be your starting position.",
      "Keeping your upper arms close to your head with elbows in and perpendicular to the floor, lower the resistance in a semicircular motion behind your head until your forearms touch your biceps. Tip: The upper arms should remain stationary and only the forearms should move. Breathe in as you perform this step.",
      "Go back to the starting position by using the triceps to raise the dumbbell. Breathe out as you perform this step.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Dumbbell_Triceps_Extension/0.jpg"
  },
  {
    "id": "close-grip-bench-press",
    "name": "Close-Grip Bench Press",
    "muscleGroup": "Triceps",
    "targetMuscles": [
      "triceps"
    ],
    "secondaryMuscles": [
      "chest",
      "shoulders"
    ],
    "equipment": "Barbell",
    "difficulty": "beginner",
    "instructions": [
      "Lie back on a flat bench. Using a close grip (around shoulder width), lift the bar from the rack and hold it straight over you with your arms locked. This will be your starting position.",
      "As you breathe in, come down slowly until you feel the bar on your middle chest. Tip: Make sure that - as opposed to a regular bench press - you keep the elbows close to the torso at all times in order to maximize triceps involvement.",
      "After a second pause, bring the bar back to the starting position as you breathe out and push the bar using your triceps muscles. Lock your arms in the contracted position, hold for a second and then start coming down slowly again. Tip: It should take at least twice as long to go down than to come up.",
      "Repeat the movement for the prescribed amount of repetitions.",
      "When you are done, place the bar back in the rack."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Close-Grip_Barbell_Bench_Press/0.jpg"
  },
  {
    "id": "tricep-kickback",
    "name": "Tricep Kickback",
    "muscleGroup": "Triceps",
    "targetMuscles": [
      "triceps"
    ],
    "secondaryMuscles": [],
    "equipment": "Dumbbell",
    "difficulty": "beginner",
    "instructions": [
      "Start with a dumbbell in each hand and your palms facing your torso. Keep your back straight with a slight bend in the knees and bend forward at the waist. Your torso should be almost parallel to the floor. Make sure to keep your head up. Your upper arms should be close to your torso and parallel to the floor. Your forearms should be pointed towards the floor as you hold the weights. There should be a 90-degree angle formed between your forearm and upper arm. This is your starting position.",
      "Now, while keeping your upper arms stationary, exhale and use your triceps to lift the weights until the arm is fully extended. Focus on moving the forearm.",
      "After a brief pause at the top contraction, inhale and slowly lower the dumbbells back down to the starting position.",
      "Repeat the movement for the prescribed amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Tricep_Dumbbell_Kickback/0.jpg"
  },
  {
    "id": "barbell-squat",
    "name": "Barbell Squat",
    "muscleGroup": "Quads",
    "targetMuscles": [
      "quadriceps"
    ],
    "secondaryMuscles": [
      "calves",
      "glutes",
      "hamstrings",
      "lower back"
    ],
    "equipment": "Barbell",
    "difficulty": "beginner",
    "instructions": [
      "This exercise is best performed inside a squat rack for safety purposes. To begin, first set the bar on a rack to just below shoulder level. Once the correct height is chosen and the bar is loaded, step under the bar and place the back of your shoulders (slightly below the neck) across it.",
      "Hold on to the bar using both arms at each side and lift it off the rack by first pushing with your legs and at the same time straightening your torso.",
      "Step away from the rack and position your legs using a shoulder width medium stance with the toes slightly pointed out. Keep your head up at all times and also maintain a straight back. This will be your starting position. (Note: For the purposes of this discussion we will use the medium stance described above which targets overall development; however you can choose any of the three stances discussed in the foot stances section).",
      "Begin to slowly lower the bar by bending the knees and hips as you maintain a straight posture with the head up. Continue down until the angle between the upper leg and the calves becomes slightly less than 90-degrees. Inhale as you perform this portion of the movement. Tip: If you performed the exercise correctly, the front of the knees should make an imaginary straight line with the toes that is perpendicular to the front. If your knees are past that imaginary line (if they are past your toes) then you are placing undue stress on the knee and the exercise has been performed incorrectly.",
      "Begin to raise the bar as you exhale by pushing the floor with the heel of your foot as you straighten the legs again and go back to the starting position.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Squat/0.jpg"
  },
  {
    "id": "leg-press",
    "name": "Leg Press",
    "muscleGroup": "Quads",
    "targetMuscles": [
      "quadriceps"
    ],
    "secondaryMuscles": [
      "calves",
      "glutes",
      "hamstrings"
    ],
    "equipment": "Machine",
    "difficulty": "beginner",
    "instructions": [
      "Using a leg press machine, sit down on the machine and place your legs on the platform directly in front of you at a medium (shoulder width) foot stance. (Note: For the purposes of this discussion we will use the medium stance described above which targets overall development; however you can choose any of the three stances described in the foot positioning section).",
      "Lower the safety bars holding the weighted platform in place and press the platform all the way up until your legs are fully extended in front of you. Tip: Make sure that you do not lock your knees. Your torso and the legs should make a perfect 90-degree angle. This will be your starting position.",
      "As you inhale, slowly lower the platform until your upper and lower legs make a 90-degree angle.",
      "Pushing mainly with the heels of your feet and using the quadriceps go back to the starting position as you exhale.",
      "Repeat for the recommended amount of repetitions and ensure to lock the safety pins properly once you are done. You do not want that platform falling on you fully loaded."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Press/0.jpg"
  },
  {
    "id": "leg-extension",
    "name": "Leg Extension",
    "muscleGroup": "Quads",
    "targetMuscles": [
      "quadriceps"
    ],
    "secondaryMuscles": [],
    "equipment": "Machine",
    "difficulty": "beginner",
    "instructions": [
      "For this exercise you will need to use a leg extension machine. First choose your weight and sit on the machine with your legs under the pad (feet pointed forward) and the hands holding the side bars. This will be your starting position. Tip: You will need to adjust the pad so that it falls on top of your lower leg (just above your feet). Also, make sure that your legs form a 90-degree angle between the lower and upper leg. If the angle is less than 90-degrees then that means the knee is over the toes which in turn creates undue stress at the knee joint. If the machine is designed that way, either look for another machine or just make sure that when you start executing the exercise you stop going down once you hit the 90-degree angle.",
      "Using your quadriceps, extend your legs to the maximum as you exhale. Ensure that the rest of the body remains stationary on the seat. Pause a second on the contracted position.",
      "Slowly lower the weight back to the original position as you inhale, ensuring that you do not go past the 90-degree angle limit.",
      "Repeat for the recommended amount of times."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Extensions/0.jpg"
  },
  {
    "id": "lunge",
    "name": "Lunge",
    "muscleGroup": "Quads",
    "targetMuscles": [
      "quadriceps"
    ],
    "secondaryMuscles": [
      "calves",
      "glutes",
      "hamstrings"
    ],
    "equipment": "Dumbbell",
    "difficulty": "beginner",
    "instructions": [
      "Stand with your torso upright holding two dumbbells in your hands by your sides. This will be your starting position.",
      "Step forward with your right leg around 2 feet or so from the foot being left stationary behind and lower your upper body down, while keeping the torso upright and maintaining balance. Inhale as you go down. Note: As in the other exercises, do not allow your knee to go forward beyond your toes as you come down, as this will put undue stress on the knee joint. Make sure that you keep your front shin perpendicular to the ground.",
      "Using mainly the heel of your foot, push up and go back to the starting position as you exhale.",
      "Repeat the movement for the recommended amount of repetitions and then perform with the left leg."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Lunges/0.jpg"
  },
  {
    "id": "bulgarian-split-squat",
    "name": "Bulgarian Split Squat",
    "muscleGroup": "Quads",
    "targetMuscles": [
      "quadriceps"
    ],
    "secondaryMuscles": [
      "glutes",
      "hamstrings"
    ],
    "equipment": "Dumbbell",
    "difficulty": "beginner",
    "instructions": [
      "Position yourself into a staggered stance with the rear foot elevated and front foot forward.",
      "Hold a dumbbell in each hand, letting them hang at the sides. This will be your starting position.",
      "Begin by descending, flexing your knee and hip to lower your body down. Maintain good posture througout the movement. Keep the front knee in line with the foot as you perform the exercise.",
      "At the bottom of the movement, drive through the heel to extend the knee and hip to return to the starting position."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Split_Squat_with_Dumbbells/0.jpg"
  },
  {
    "id": "hack-squat",
    "name": "Hack Squat",
    "muscleGroup": "Quads",
    "targetMuscles": [
      "quadriceps"
    ],
    "secondaryMuscles": [
      "calves",
      "glutes",
      "hamstrings"
    ],
    "equipment": "Machine",
    "difficulty": "beginner",
    "instructions": [
      "Place the back of your torso against the back pad of the machine and hook your shoulders under the shoulder pads provided.",
      "Position your legs in the platform using a shoulder width medium stance with the toes slightly pointed out. Tip: Keep your head up at all times and also maintain the back on the pad at all times.",
      "Place your arms on the side handles of the machine and disengage the safety bars (which on most designs is done by moving the side handles from a facing front position to a diagonal position).",
      "Now straighten your legs without locking the knees. This will be your starting position. (Note: For the purposes of this discussion we will use the medium stance described above which targets overall development; however you can choose any of the three stances described in the foot positioning section).",
      "Begin to slowly lower the unit by bending the knees as you maintain a straight posture with the head up (back on the pad at all times). Continue down until the angle between the upper leg and the calves becomes slightly less than 90-degrees (which is the point in which the upper legs are below parallel to the floor). Inhale as you perform this portion of the movement. Tip: If you performed the exercise correctly, the front of the knees should make an imaginary straight line with the toes that is perpendicular to the front. If your knees are past that imaginary line (if they are past your toes) then you are placing undue stress on the knee and the exercise has been performed incorrectly.",
      "Begin to raise the unit as you exhale by pushing the floor with mainly with the heel of your foot as you straighten the legs again and go back to the starting position.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Hack_Squat/0.jpg"
  },
  {
    "id": "romanian-deadlift",
    "name": "Romanian Deadlift",
    "muscleGroup": "Hamstrings",
    "targetMuscles": [
      "hamstrings"
    ],
    "secondaryMuscles": [
      "calves",
      "glutes",
      "lower back"
    ],
    "equipment": "Barbell",
    "difficulty": "intermediate",
    "instructions": [
      "Put a barbell in front of you on the ground and grab it using a pronated (palms facing down) grip that a little wider than shoulder width. Tip: Depending on the weight used, you may need wrist wraps to perform the exercise and also a raised platform in order to allow for better range of motion.",
      "Bend the knees slightly and keep the shins vertical, hips back and back straight. This will be your starting position.",
      "Keeping your back and arms completely straight at all times, use your hips to lift the bar as you exhale. Tip: The movement should not be fast but steady and under control.",
      "Once you are standing completely straight up, lower the bar by pushing the hips back, only slightly bending the knees, unlike when squatting. Tip: Take a deep breath at the start of the movement and keep your chest up. Hold your breath as you lower and exhale as you complete the movement.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Romanian_Deadlift/0.jpg"
  },
  {
    "id": "leg-curl",
    "name": "Leg Curl",
    "muscleGroup": "Hamstrings",
    "targetMuscles": [
      "hamstrings"
    ],
    "secondaryMuscles": [],
    "equipment": "Machine",
    "difficulty": "beginner",
    "instructions": [
      "Adjust the machine lever to fit your height and sit on the machine with your back against the back support pad.",
      "Place the back of lower leg on top of padded lever (just a few inches under the calves) and secure the lap pad against your thighs, just above the knees. Then grasp the side handles on the machine as you point your toes straight (or you can also use any of the other two stances) and ensure that the legs are fully straight right in front of you. This will be your starting position.",
      "As you exhale, pull the machine lever as far as possible to the back of your thighs by flexing at the knees. Keep your torso stationary at all times. Hold the contracted position for a second.",
      "Slowly return to the starting position as you breathe in.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Leg_Curl/0.jpg"
  },
  {
    "id": "stiff-leg-deadlift",
    "name": "Stiff-Leg Deadlift",
    "muscleGroup": "Hamstrings",
    "targetMuscles": [
      "hamstrings"
    ],
    "secondaryMuscles": [
      "glutes",
      "lower back"
    ],
    "equipment": "Dumbbell",
    "difficulty": "beginner",
    "instructions": [
      "Grasp a couple of dumbbells holding them by your side at arm's length.",
      "Stand with your torso straight and your legs spaced using a shoulder width or narrower stance. The knees should be slightly bent. This is your starting position.",
      "Keeping the knees stationary, lower the dumbbells to over the top of your feet by bending at the waist while keeping your back straight. Keep moving forward as if you were going to pick something from the floor until you feel a stretch on the hamstrings. Exhale as you perform this movement",
      "Start bringing your torso up straight again by extending your hips and waist until you are back at the starting position. Inhale as you perform this movement.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Stiff-Legged_Dumbbell_Deadlift/0.jpg"
  },
  {
    "id": "sumo-deadlift",
    "name": "Sumo Deadlift",
    "muscleGroup": "Hamstrings",
    "targetMuscles": [
      "hamstrings"
    ],
    "secondaryMuscles": [
      "adductors",
      "forearms",
      "glutes",
      "lower back",
      "middle back",
      "quadriceps",
      "traps"
    ],
    "equipment": "Barbell",
    "difficulty": "intermediate",
    "instructions": [
      "Begin with a bar loaded on the ground. Approach the bar so that the bar intersects the middle of the feet. The feet should be set very wide, near the collars. Bend at the hips to grip the bar. The arms should be directly below the shoulders, inside the legs, and you can use a pronated grip, a mixed grip, or hook grip. Relax the shoulders, which in effect lengthens your arms.",
      "Take a breath, and then lower your hips, looking forward with your head with your chest up. Drive through the floor, spreading your feet apart, with your weight on the back half of your feet. Extend through the hips and knees.",
      "As the bar passes through the knees, lean back and drive the hips into the bar, pulling your shoulder blades together.",
      "Return the weight to the ground by bending at the hips and controlling the weight on the way down."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Sumo_Deadlift/0.jpg"
  },
  {
    "id": "glute-bridge",
    "name": "Glute Bridge",
    "muscleGroup": "Glutes",
    "targetMuscles": [
      "glutes"
    ],
    "secondaryMuscles": [
      "calves",
      "hamstrings"
    ],
    "equipment": "Barbell",
    "difficulty": "intermediate",
    "instructions": [
      "Begin seated on the ground with a loaded barbell over your legs. Using a fat bar or having a pad on the bar can greatly reduce the discomfort caused by this exercise. Roll the bar so that it is directly above your hips, and lay down flat on the floor.",
      "Begin the movement by driving through with your heels, extending your hips vertically through the bar. Your weight should be supported by your upper back and the heels of your feet.",
      "Extend as far as possible, then reverse the motion to return to the starting position."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Glute_Bridge/0.jpg"
  },
  {
    "id": "cable-kickback",
    "name": "Cable Kickback",
    "muscleGroup": "Glutes",
    "targetMuscles": [
      "glutes"
    ],
    "secondaryMuscles": [
      "hamstrings"
    ],
    "equipment": "Cable",
    "difficulty": "intermediate",
    "instructions": [
      "Hook a leather ankle cuff to a low cable pulley and then attach the cuff to your ankle.",
      "Face the weight stack from a distance of about two feet, grasping the steel frame for support.",
      "While keeping your knees and hips bent slightly and your abs tight, contract your glutes to slowly \"kick\" the working leg back in a semicircular arc as high as it will comfortably go as you breathe out. Tip: At full extension, squeeze your glutes for a second in order to achieve a peak contraction.",
      "Now slowly bring your working leg forward, resisting the pull of the cable until you reach the starting position.",
      "Repeat for the recommended amount of repetitions.",
      "Switch legs and repeat the movement for the other side."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/One-Legged_Cable_Kickback/0.jpg"
  },
  {
    "id": "sumo-squat",
    "name": "Sumo Squat",
    "muscleGroup": "Glutes",
    "targetMuscles": [
      "quadriceps"
    ],
    "secondaryMuscles": [
      "abdominals",
      "calves",
      "glutes",
      "hamstrings"
    ],
    "equipment": "Dumbbell",
    "difficulty": "beginner",
    "instructions": [
      "Hold a dumbbell at the base with both hands and stand straight up. Move your legs so that they are wider than shoulder width apart from each other with your knees slightly bent.",
      "Your toes should be facing out. Note: Your arms should be stationary while performing the exercise. This is the starting position.",
      "Slowly bend the knees and lower your legs until your thighs are parallel to the floor. Make sure to inhale as this is the eccentric part of the exercise.",
      "Press mainly with the heel of the foot to bring the body back to the starting position while exhaling.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Plie_Dumbbell_Squat/0.jpg"
  },
  {
    "id": "step-up",
    "name": "Step-Up",
    "muscleGroup": "Glutes",
    "targetMuscles": [
      "quadriceps"
    ],
    "secondaryMuscles": [
      "calves",
      "glutes",
      "hamstrings"
    ],
    "equipment": "Dumbbell",
    "difficulty": "intermediate",
    "instructions": [
      "Stand up straight while holding a dumbbell on each hand (palms facing the side of your legs).",
      "Place the right foot on the elevated platform. Step on the platform by extending the hip and the knee of your right leg. Use the heel mainly to lift the rest of your body up and place the foot of the left leg on the platform as well. Breathe out as you execute the force required to come up.",
      "Step down with the left leg by flexing the hip and knee of the right leg as you inhale. Return to the original standing position by placing the right foot of to next to the left foot on the initial position.",
      "Repeat with the right leg for the recommended amount of repetitions and then perform with the left leg."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Step_Ups/0.jpg"
  },
  {
    "id": "standing-calf-raise",
    "name": "Standing Calf Raise",
    "muscleGroup": "Calves",
    "targetMuscles": [
      "calves"
    ],
    "secondaryMuscles": [],
    "equipment": "Machine",
    "difficulty": "beginner",
    "instructions": [
      "Adjust the padded lever of the calf raise machine to fit your height.",
      "Place your shoulders under the pads provided and position your toes facing forward (or using any of the two other positions described at the beginning of the chapter). The balls of your feet should be secured on top of the calf block with the heels extending off it. Push the lever up by extending your hips and knees until your torso is standing erect. The knees should be kept with a slight bend; never locked. Toes should be facing forward, outwards or inwards as described at the beginning of the chapter. This will be your starting position.",
      "Raise your heels as you breathe out by extending your ankles as high as possible and flexing your calf. Ensure that the knee is kept stationary at all times. There should be no bending at any time. Hold the contracted position by a second before you start to go back down.",
      "Go back slowly to the starting position as you breathe in by lowering your heels as you bend the ankles until calves are stretched.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Calf_Raises/0.jpg"
  },
  {
    "id": "seated-calf-raise",
    "name": "Seated Calf Raise",
    "muscleGroup": "Calves",
    "targetMuscles": [
      "calves"
    ],
    "secondaryMuscles": [],
    "equipment": "Machine",
    "difficulty": "beginner",
    "instructions": [
      "Sit on the machine and place your toes on the lower portion of the platform provided with the heels extending off. Choose the toe positioning of your choice (forward, in, or out) as per the beginning of this chapter.",
      "Place your lower thighs under the lever pad, which will need to be adjusted according to the height of your thighs. Now place your hands on top of the lever pad in order to prevent it from slipping forward.",
      "Lift the lever slightly by pushing your heels up and release the safety bar. This will be your starting position.",
      "Slowly lower your heels by bending at the ankles until the calves are fully stretched. Inhale as you perform this movement.",
      "Raise the heels by extending the ankles as high as possible as you contract the calves and breathe out. Hold the top contraction for a second.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Calf_Raise/0.jpg"
  },
  {
    "id": "calf-press",
    "name": "Calf Press",
    "muscleGroup": "Calves",
    "targetMuscles": [
      "calves"
    ],
    "secondaryMuscles": [],
    "equipment": "Machine",
    "difficulty": "beginner",
    "instructions": [
      "Adjust the seat so that your legs are only slightly bent in the start position. The balls of your feet should be firmly on the platform.",
      "Select an appropriate weight, and grasp the handles. This will be your starting position.",
      "Straighten the legs by extending the knees, just barely lifting the weight from the stack. Your ankle should be fully flexed, toes pointing up. Execute the movement by pressing downward through the balls of your feet as far as possible.",
      "After a brief pause, reverse the motion and repeat."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Calf_Press/0.jpg"
  },
  {
    "id": "plank",
    "name": "Plank",
    "muscleGroup": "Core",
    "targetMuscles": [
      "abdominals"
    ],
    "secondaryMuscles": [],
    "equipment": "Bodyweight",
    "difficulty": "beginner",
    "instructions": [
      "Get into a prone position on the floor, supporting your weight on your toes and your forearms. Your arms are bent and directly below the shoulder.",
      "Keep your body straight at all times, and hold this position as long as possible. To increase difficulty, an arm or leg can be raised."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Plank/0.jpg"
  },
  {
    "id": "cable-crunch",
    "name": "Cable Crunch",
    "muscleGroup": "Core",
    "targetMuscles": [
      "abdominals"
    ],
    "secondaryMuscles": [],
    "equipment": "Cable",
    "difficulty": "beginner",
    "instructions": [
      "Kneel below a high pulley that contains a rope attachment.",
      "Grasp cable rope attachment and lower the rope until your hands are placed next to your face.",
      "Flex your hips slightly and allow the weight to hyperextend the lower back. This will be your starting position.",
      "With the hips stationary, flex the waist as you contract the abs so that the elbows travel towards the middle of the thighs. Exhale as you perform this portion of the movement and hold the contraction for a second.",
      "Slowly return to the starting position as you inhale. Tip: Make sure that you keep constant tension on the abs throughout the movement. Also, do not choose a weight so heavy that the lower back handles the brunt of the work.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Crunch/0.jpg"
  },
  {
    "id": "hanging-leg-raise",
    "name": "Hanging Leg Raise",
    "muscleGroup": "Core",
    "targetMuscles": [
      "abdominals"
    ],
    "secondaryMuscles": [],
    "equipment": "Bodyweight",
    "difficulty": "expert",
    "instructions": [
      "Hang from a chin-up bar with both arms extended at arms length in top of you using either a wide grip or a medium grip. The legs should be straight down with the pelvis rolled slightly backwards. This will be your starting position.",
      "Raise your legs until the torso makes a 90-degree angle with the legs. Exhale as you perform this movement and hold the contraction for a second or so.",
      "Go back slowly to the starting position as you breathe in.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Hanging_Leg_Raise/0.jpg"
  },
  {
    "id": "russian-twist",
    "name": "Russian Twist",
    "muscleGroup": "Core",
    "targetMuscles": [
      "abdominals"
    ],
    "secondaryMuscles": [
      "lower back"
    ],
    "equipment": "Bodyweight",
    "difficulty": "intermediate",
    "instructions": [
      "Lie down on the floor placing your feet either under something that will not move or by having a partner hold them. Your legs should be bent at the knees.",
      "Elevate your upper body so that it creates an imaginary V-shape with your thighs. Your arms should be fully extended in front of you perpendicular to your torso and with the hands clasped. This is the starting position.",
      "Twist your torso to the right side until your arms are parallel with the floor while breathing out.",
      "Hold the contraction for a second and move back to the starting position while breathing out. Now move to the opposite side performing the same techniques you applied to the right side.",
      "Repeat for the recommended amount of repetitions."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Russian_Twist/0.jpg"
  },
  {
    "id": "ab-wheel-rollout",
    "name": "Ab Wheel Rollout",
    "muscleGroup": "Core",
    "targetMuscles": [
      "abdominals"
    ],
    "secondaryMuscles": [
      "shoulders"
    ],
    "equipment": "Other",
    "difficulty": "intermediate",
    "instructions": [
      "Hold the Ab Roller with both hands and kneel on the floor.",
      "Now place the ab roller on the floor in front of you so that you are on all your hands and knees (as in a kneeling push up position). This will be your starting position.",
      "Slowly roll the ab roller straight forward, stretching your body into a straight position. Tip: Go down as far as you can without touching the floor with your body. Breathe in during this portion of the movement.",
      "After a pause at the stretched position, start pulling yourself back to the starting position as you breathe out. Tip: Go slowly and keep your abs tight at all times."
    ],
    "imageUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Ab_Roller/0.jpg"
  }
];

export const getExercisesByMuscleGroup = (group: string) => EXERCISES.filter(e => e.muscleGroup === group);
export const getExercisesByEquipment = (equipment: string) => EXERCISES.filter(e => e.equipment === equipment);
export const searchExercises = (query: string) => EXERCISES.filter(e => e.name.toLowerCase().includes(query.toLowerCase()) || e.muscleGroup.toLowerCase().includes(query.toLowerCase()));
