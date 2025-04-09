import { Playlist } from '../types';

// Playlist data for Focus Area Mastery feature (unlocked at level 9) ONLY USE THESE!
const playlists: Playlist[] = [
  {
    id: "post_leg_day_recovery",
    title: "Post Leg Day Recovery",
    description: "Focused relief for hips, legs, and glutes after a workout",
    duration: 15,
    focusArea: "Hips & Legs",
    image: { uri: 'https://images.pexels.com/photos/4056535/pexels-photo-4056535.jpeg?auto=compress&cs=tinysrgb&w=500' },
    stretchIds: [2, 3, 5, 6, 12, 21, 22, 23],
    stretchDurations: {
      2: 60, // Standing Quad Stretch (bilateral, 30s each side)
      3: 60, // Seated Hamstring Stretch (bilateral, 30s each side)
      5: 30, // Butterfly Stretch
      6: 60, // Pigeon Pose (bilateral, 30s each side)
      12: 60, // Supine Hamstring Stretch with Towel (bilateral, 30s each side)
      21: 60, // Seated Inner Thigh Reach (bilateral, 30s each side)
      22: 30, // Deep Desk Squat Stretch
      23: 60  // Split Prep with Desk (bilateral, 30s each side)
    }
  },
  {
    id: "morning_back_relief",
    title: "Morning Back Relief",
    description: "Lower and upper back stiffness relief after sleep",
    duration: 10,
    focusArea: "Lower Back",
    image: { uri: 'https://images.pexels.com/photos/3094230/pexels-photo-3094230.jpeg?auto=compress&cs=tinysrgb&w=500' },
    stretchIds: [25, 24, 26, 35, 39, 33],
    stretchDurations: {
      25: 60, // Cat-Cow Stretch
      24: 30, // Child's Pose
      26: 30, // Seated Forward Bend
      35: 30, // Standing Desk Lean
      39: 60, // Seated Lower Back Twist (bilateral, 30s each side)
      33: 60  // Threaded Supine Twist (bilateral, 30s each side)
    }
  },
  {
    id: "desk_posture_fix",
    title: "Desk Posture Fix",
    description: "Upper back, chest, and neck relief from slouching",
    duration: 15,
    focusArea: "Upper Back & Chest",
    image: { uri: 'https://images.pexels.com/photos/4498362/pexels-photo-4498362.jpeg?auto=compress&cs=tinysrgb&w=500' },
    stretchIds: [42, 53, 56, 47, 58, 61, 96, 90],
    stretchDurations: {
      42: 30, // Thoracic Extension (15s x 2)
      53: 30, // Desk Edge Chest Stretch
      56: 30, // Seated Rhomboid Squeeze (15s x 2)
      47: 60, // Eagle Arms (bilateral, 30s each side)
      58: 60, // Desk Rhomboid Stretch (bilateral, 30s each side)
      61: 30, // Reverse Desk Arch
      96: 60, // Upper Trap Desk Stretch (bilateral, 30s each side)
      90: 30  // Deep Neck Flexor Stretch
    }
  },
  {
    id: "typing_fatigue_relief",
    title: "Typing Fatigue Relief",
    description: "Shoulders, arms, and wrists relief from desk work",
    duration: 10,
    focusArea: "Shoulders & Arms",
    image: { uri: 'https://images.pexels.com/photos/4065158/pexels-photo-4065158.jpeg?auto=compress&cs=tinysrgb&w=500' },
    stretchIds: [62, 63, 65, 66, 67, 75],
    stretchDurations: {
      62: 30, // Shoulder Rolls
      63: 60, // Overhead Tricep Stretch (bilateral, 30s each side)
      65: 60, // Wrist Flexor Stretch (bilateral, 30s each side)
      66: 60, // Wrist Extensor Stretch (bilateral, 30s each side)
      67: 60, // Cross-Body Shoulder Stretch (bilateral, 30s each side)
      75: 60  // Wrist Twist with Desk (bilateral, 30s each side)
    }
  },
  {
    id: "full_body_reset",
    title: "Full Body Reset",
    description: "Whole-body refresh for complete rejuvenation",
    duration: 15,
    focusArea: "Full Body",
    image: { uri: 'https://images.pexels.com/photos/3822906/pexels-photo-3822906.jpeg?auto=compress&cs=tinysrgb&w=500' },
    stretchIds: [99, 101, 103, 105, 106, 108, 109],
    stretchDurations: {
      99: 30,  // Downward Dog
      101: 30, // Standing Forward Fold with Shoulder Opener
      103: 60, // Reclining Bound Angle Pose
      105: 60, // World's Greatest Stretch (bilateral, 30s each side)
      106: 60, // Seated Twist (bilateral, 30s each side)
      108: 30, // Deep Downward Dog
      109: 60  // Twisted Lunge (bilateral, 30s each side)
    }
  }
];

// Sample playlists data DO NOT USE THESE! 
const samplePlaylists: Playlist[] = [
  {
    id: 'desk_worker_relief',
    title: 'Desk Worker Relief',
    description: 'Targeted stretches to relieve tension from long hours of sitting',
    duration: 10,
    focusArea: 'Lower Back',
    image: { uri: 'https://images.unsplash.com/photo-1593476087123-36d1de271411?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60' },
    stretchIds: [3, 7, 14, 18, 22],
    stretchDurations: {
      3: 45,
      7: 60,
      14: 45,
      18: 60,
      22: 45
    }
  },
  {
    id: 'neck_shoulder_tension',
    title: 'Neck & Shoulder Relief',
    description: 'Release tension in the upper body after computer work',
    duration: 5,
    focusArea: 'Neck',
    image: { uri: 'https://images.unsplash.com/photo-1616699002805-0741e1e4a9c5?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60' },
    stretchIds: [2, 6, 10, 15],
    stretchDurations: {
      2: 40,
      6: 40,
      10: 40,
      15: 40
    }
  },
  {
    id: 'morning_energizer',
    title: 'Morning Energizer',
    description: 'Start your day with full-body mobility to wake up your muscles',
    duration: 15,
    focusArea: 'Full Body',
    image: { uri: 'https://images.unsplash.com/photo-1611072965169-ebfcffa534c2?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60' },
    stretchIds: [1, 5, 8, 12, 17, 19, 24],
    stretchDurations: {
      1: 60,
      5: 45,
      8: 45,
      12: 60,
      17: 45,
      19: 45,
      24: 60
    }
  },
  {
    id: 'lower_body_mobility',
    title: 'Lower Body Mobility',
    description: 'Improve hip and leg flexibility for better posture',
    duration: 10,
    focusArea: 'Hips & Legs',
    image: { uri: 'https://images.unsplash.com/photo-1562771379-2b8c042f7223?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60' },
    stretchIds: [4, 9, 13, 21],
    stretchDurations: {
      4: 60,
      9: 60,
      13: 60,
      21: 60
    }
  },
  {
    id: 'upper_body_flow',
    title: 'Upper Body Flow',
    description: 'Improve shoulder and chest mobility for better posture',
    duration: 10,
    focusArea: 'Upper Back & Chest',
    image: { uri: 'https://images.unsplash.com/photo-1549576490-b0b4831ef60a?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60' },
    stretchIds: [11, 16, 20, 23],
    stretchDurations: {
      11: 60,
      16: 60,
      20: 60,
      23: 60
    }
  },
  {
    id: 'wrist_hand_recovery',
    title: 'Wrist & Hand Recovery',
    description: 'Relieve tension in hands and wrists from typing and mouse use',
    duration: 5,
    focusArea: 'Shoulders & Arms',
    image: { uri: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60' },
    stretchIds: [5, 10, 15, 20],
    stretchDurations: {
      5: 30,
      10: 30,
      15: 30,
      20: 30
    }
  },
  {
    id: 'evening_relaxation',
    title: 'Evening Relaxation',
    description: 'Gentle stretches to help you wind down before bed',
    duration: 15,
    focusArea: 'Full Body',
    image: { uri: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60' },
    stretchIds: [2, 7, 11, 14, 18, 22],
    stretchDurations: {
      2: 60,
      7: 60,
      11: 60,
      14: 60,
      18: 60,
      22: 60
    }
  }
];

export default playlists; 