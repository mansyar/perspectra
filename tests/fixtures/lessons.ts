export const HEART_LESSON = {
  description: 'A guided tour of cardiac anatomy through six interactive landmarks.',
  hotspots: [
    'left_ventricle',
    'right_ventricle',
    'aorta',
    'pulmonary_artery',
    'mitral_valve',
    'aortic_valve',
  ],
  id: 'heart',
  path: '/lessons/heart',
  title: 'The Human Heart',
} as const;

export const EARTH_LESSON = {
  description:
    "A guided tour of Earth's layered interior, from the rigid surface to the solid inner core.",
  hotspots: ['crust', 'upper_mantle', 'lower_mantle', 'outer_core', 'inner_core', 'lithosphere'],
  id: 'earth-interior',
  path: '/lessons/earth-interior',
  title: 'Inside Earth',
} as const;
