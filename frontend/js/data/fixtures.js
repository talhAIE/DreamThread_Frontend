export const art = {
  house: 'assets/figma/5c7ec.png', ocean: 'assets/figma/93ad7.png',
  stranger: 'assets/figma/99bae.png', door: 'assets/figma/4a7c5.png', forest: 'assets/figma/65e27.png',
};

export const dreams = [
  { id: '01', title: 'The house in the forest', date: '2026-10-26', type: 'Voice', art: 'house', tags: ['House','Forest'], emotions: ['Fear','Curious'],
    excerpt: 'I keep returning to the same house, tucked in a forest. This time the windows were lit…',
    original: 'I keep returning to the same house, tucked in a forest. This time the windows were lit, and I could hear someone calling my name from inside. I wanted to go in, but I stayed on the path.',
    reading: 'The lit windows may suggest something inviting beneath the unease. This is tentative.' },
  { id: '02', title: 'An ocean without edges', date: '2026-10-21', type: 'Text', art: 'ocean', tags: ['Ocean','Freedom'], emotions: ['Calm'],
    excerpt: 'I was floating in an endless ocean. The water was warm and full of light…' },
  { id: '03', title: 'The familiar stranger', date: '2026-10-14', type: 'Voice', art: 'stranger', tags: ['Stranger','Mystery'], emotions: ['Curious'],
    excerpt: "A person I don't know, but feel I've always known. We walked together but never spoke…" },
  { id: '04', title: 'A knock at the front door', date: '2026-09-30', type: 'Voice', art: 'door', tags: ['Doors','Fear'], emotions: ['Fear','Uneasy'],
    excerpt: 'Somebody kept calling my name from behind a door that would not open…' },
  { id: '05', title: 'Paths between the pines', date: '2026-09-12', type: 'Text', art: 'forest', tags: ['Forest','Calm'], emotions: ['Calm'],
    excerpt: 'The trail kept splitting, and each fork led back toward a glowing window…' },
  { id: '06', title: 'A bright, quiet house', date: '2026-08-30', type: 'Voice', art: 'ocean', tags: ['House','Calm'], emotions: ['Calm'],
    excerpt: 'The same house, but sunlit. I felt calm and walked from room to room…' },
  // This entry is shown in citations, not among the six Journal reference cards.
  { id: '09', title: 'Rooms that keep changing', date: '2026-08-18', type: 'Voice', art: 'forest', tags: ['House','Forest'], emotions: ['Fear'],
    excerpt: 'A house with no stairs.', sourceOnly: true },
];

export const motifs = {
  house: { label: 'House', count: 3, heading: 'A familiar place', summary: 'The house appears in 3 dreams.', ids: ['01','04','09'] },
  ocean: { label: 'Ocean', count: 2, heading: 'An ocean without edges', summary: 'The ocean appears in 2 dreams.', ids: ['02'] },
  stranger: { label: 'Stranger', count: 3, heading: 'A familiar stranger', summary: 'A stranger appears in 3 dreams.', ids: ['03'] },
  forest: { label: 'Forest', count: 2, heading: 'Paths through the forest', summary: 'The forest appears in 2 dreams.', ids: ['01','05'] },
  door: { label: 'Doors', count: 2, heading: 'Beyond the doorway', summary: 'Doors appear in 2 dreams.', ids: ['04','09'] },
};

export const chapters = [
  { id: '09', date: 'Aug 18', title: 'Chapter 1 · A dark house', text: 'An abandoned house and someone at the window.', emotion: 'Fear', art: 'door' },
  { id: '04', date: 'Sep 30', title: 'Chapter 2 · A familiar detail', text: 'Somebody calls her name inside.', emotion: 'Uneasy', art: 'forest' },
  { id: '01', date: 'Oct 26', title: 'Chapter 3 · The lights are on', text: 'The house is bright. She feels calm.', emotion: 'Calm', art: 'house' },
];
