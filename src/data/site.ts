export const site = {
  name: 'Salim Youssef Najim',
  url: 'https://salimyoussefnajim.com',
  email: 'salim.najim.06@gmail.com', // Public contact address confirmed by the owner.
  github: 'https://github.com/SalimYoussefNajim',
  description: 'Engineering, books and ideas by Salim Youssef Najim. Aerospace Engineering at Khalifa University, student projects, and writing on physics and AI.'
};
export const navigation = [
  { label: 'Work', href: '/projects/' },
  { label: 'Books', href: '/books/' },
  { label: 'Profile', href: '/about/' }
];
export const projects = [{
  slug: 'lumos', title: 'LUMOS', category: 'Energy / Student engineering',
  status: 'Student concept', role: 'Team lead',
  description: 'Exploring how the movement of a city could become a source of light.',
  href: '/projects/lumos/'
}];
// New entries require owner-confirmed facts and a real destination. No speculative ventures.
export interface Venture { slug: string; name: string; category: string; status: string; thesis: string; role: string; url: string }
export const ventures: Venture[] = [];
export const milestones = [
  { category: 'Writing', title: 'Built from Physics', context: 'Published book', detail: 'An exploration of how physical principles connect to materials, energy, technology and the engineered world.' },
  { category: 'Academic path', title: 'Aerospace Engineering', context: 'Khalifa University', detail: 'Building a foundation in the physics and systems behind flight.' },
  { category: 'Engineering & leadership', title: 'Leading LUMOS', context: 'Student engineering concept', detail: 'Team leadership on a decentralized urban lighting concept oriented around SDG 7.' }
];
