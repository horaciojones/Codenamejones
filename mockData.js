export const STREET_HISTORY_STATES = [
  { year: 2024, label: 'Current' },
  { year: 2021, label: 'Before redevelopment' },
  { year: 2018, label: 'Early streetscape' }
];

export const DEFAULT_PLACE_LISTS = [
  { id: 'brunch', name: 'Favorite Brunch Spots', items: [] },
  { id: 'study', name: 'Hidden Study Places', items: [] },
  { id: 'late', name: 'Best Late Night Food', items: [] },
  { id: 'travel', name: 'Future Travel Ideas', items: [] }
];

export const MOCK_INDOOR_LOCATIONS = [
  {
    id: 'hospital_demo',
    name: 'Bayside Medical Campus',
    floors: [
      { id: 'f1', name: 'Floor 1', rooms: ['ER', 'Pharmacy', 'Radiology'] },
      { id: 'f2', name: 'Floor 2', rooms: ['ICU', 'Lab', 'Nurse Station'] },
      { id: 'f3', name: 'Floor 3', rooms: ['Surgery', 'Recovery', 'Admin'] }
    ]
  }
];

export const MOCK_POPULAR_TIMES = {
  brunch: [25, 40, 60, 78, 90, 75, 62, 58, 50, 44, 38, 30],
  gym: [22, 18, 16, 30, 48, 65, 78, 88, 92, 72, 45, 28]
};

export const MOCK_CONTACTS = [
  { id: 'c1', name: 'Alex' },
  { id: 'c2', name: 'Taylor' },
  { id: 'c3', name: 'Sam' }
];

export const CONTRIBUTION_BADGES = [
  { threshold: 5, badge: 'Scout' },
  { threshold: 20, badge: 'Mapper' },
  { threshold: 50, badge: 'Guide Pro' }
];
