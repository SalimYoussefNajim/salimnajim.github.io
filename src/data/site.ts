export const site = {
  name: 'Salim Youssef Najim',
  url: 'https://salimyoussefnajim.com',
  email: 'salim.najim.06@gmail.com', // Public contact address confirmed by the owner.
  github: 'https://github.com/SalimYoussefNajim',
  description: 'Aerospace Engineering, entrepreneurship and ideas put into practice. The selected work and perspective of Salim Youssef Najim.'
};
export const navigation = [
  { label: 'Work', href: '/projects/' },
  { label: 'Aerospace', href: '/aerospace/' },
  { label: 'Ventures', href: '/ventures/' },
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
  { category: 'Academic path', title: 'Aerospace Engineering', context: 'Khalifa University', detail: 'Building a foundation in the physics and systems behind flight.' },
  { category: 'Engineering & leadership', title: 'Leading LUMOS', context: 'Student engineering concept', detail: 'Team leadership on a decentralized urban lighting concept oriented around SDG 7.' }
];
