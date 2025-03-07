import { Stretch } from '../types';

const stretches: Stretch[] = [
  {
    id: 1,
    name: "Cat-Cow Stretch",
    description: "Great for spinal mobility and back pain relief",
    duration: 60,
    tags: ["back", "full body"],
    level: "beginner",
    image: { uri: 'https://via.placeholder.com/200/4CAF50/FFFFFF?text=Cat-Cow' }
  },
  {
    id: 2,
    name: "Seated Twist",
    description: "Relieves tension in the spine and shoulders",
    duration: 45,
    tags: ["back", "shoulders", "full body"],
    level: "beginner",
    image: { uri: 'https://via.placeholder.com/200/2196F3/FFFFFF?text=Seated+Twist' }
  },
  {
    id: 3,
    name: "Neck Rolls",
    description: "Releases tension in the neck and upper shoulders",
    duration: 30,
    tags: ["neck", "shoulders", "full body"],
    level: "beginner",
    image: { uri: 'https://via.placeholder.com/200/FF9800/FFFFFF?text=Neck+Rolls' }
  },
  {
    id: 4,
    name: "Hip Flexor Stretch",
    description: "Opens tight hip flexors from prolonged sitting",
    duration: 60,
    tags: ["hips", "full body"],
    level: "intermediate",
    image: { uri: 'https://via.placeholder.com/200/9C27B0/FFFFFF?text=Hip+Flexor' }
  },
  {
    id: 5,
    name: "Shoulder Rolls",
    description: "Relieves tension in shoulders and upper back",
    duration: 30,
    tags: ["shoulders", "full body"],
    level: "beginner",
    image: { uri: 'https://via.placeholder.com/200/F44336/FFFFFF?text=Shoulder+Rolls' }
  },
  // Add more stretches as needed to reach 30
];

export default stretches; 