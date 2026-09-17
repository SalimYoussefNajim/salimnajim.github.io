export type BookCategory = 'physics' | 'ai' | 'other';
export interface BookFormat { label: string; asin: string; url: string }
export interface Book {
  id: string;
  title: string;
  subtitle?: string;
  category: BookCategory;
  description: string;
  formats: BookFormat[];
  cover?: { src: string; width: number; height: number };
  spineColor: string;
}

const formats = (kindle?: string, paperback?: string, hardcover?: string): BookFormat[] =>
  ([['Kindle', kindle], ['Paperback', paperback], ['Hardcover', hardcover]] as const)
    .flatMap(([label, asin]) => asin ? [{ label, asin, url: `https://www.amazon.com/dp/${asin}` }] : []);

export const books: Book[] = [
  {
    id: 'built-from-physics',
    title: 'Built from Physics',
    subtitle: 'How Humanity Shapes Matter, Harnesses Energy, and Engineers the Future',
    category: 'physics',
    description: 'An accessible journey from the principles of physics to the engineering that shapes our world. Eight parts and forty chapters connect matter, energy and the things we build.',
    formats: formats('B0HHFB8J2M', 'B0HHGF1DYJ', 'B0HHG8LF8J'),
    cover: { src: '/images/books/physics-feature.webp', width: 720, height: 1080 },
    spineColor: '#152631',
  },
  {
    id: 'hidden-system',
    title: 'Talk to AI Like a Pro',
    subtitle: 'The Hidden System Behind Perfect Prompts',
    category: 'ai',
    description: 'The foundation of the series: how AI interprets instructions, why prompts fall short, and how the C.O.R.E. framework brings structure to the conversation.',
    formats: formats('B0GT2HDLPQ', 'B0GT5BZ9K1', 'B0GT5BSYT8'),
    cover: { src: '/images/books/hidden-system.webp', width: 720, height: 1151 },
    spineColor: '#143340',
  },
  {
    id: 'professional-prompt-toolkit',
    title: 'Talk to AI Like a Pro',
    subtitle: 'The Professional Prompt Toolkit',
    category: 'ai',
    description: 'Tools and structure for professional prompting.',
    formats: formats('B0HJBC7CW9', 'B0HJCVCD87', 'B0HJB9GZHJ'),
    cover: { src: '/images/books/prompt-toolkit.webp', width: 720, height: 1151 },
    spineColor: '#304344',
  },
  {
    id: 'reasoning-workflows',
    title: 'Talk to AI Like a Pro',
    subtitle: 'Reasoning and Multi-Step Workflows',
    category: 'ai',
    description: 'Reasoning and the design of workflows that unfold across multiple steps.',
    formats: formats('B0HJB42BRZ', 'B0HJB74BFL', 'B0HJB92K56'),
    cover: { src: '/images/books/reasoning-workflows.webp', width: 720, height: 1151 },
    spineColor: '#414b39',
  },
  {
    id: 'context-memory',
    title: 'Talk to AI Like a Pro',
    subtitle: 'Context Engineering and Memory Systems',
    category: 'ai',
    description: 'A closer look at context and memory in AI systems.',
    formats: formats('B0HJB7JJKM', 'B0HJCYZY6M', 'B0HJ9VHMJW'),
    cover: { src: '/images/books/context-memory.webp', width: 720, height: 1151 },
    spineColor: '#384e5c',
  },
  {
    id: 'industry-playbooks',
    title: 'Talk to AI Like a Pro',
    subtitle: 'Industry Playbooks and High-Stakes Prompting',
    category: 'ai',
    description: 'Prompting in industry settings, with a focus on consequential applications.',
    formats: formats('B0HJB2YYQT', 'B0HJCXTBXP', 'B0HJB73D34'),
    cover: { src: '/images/books/industry-playbooks.webp', width: 720, height: 1151 },
    spineColor: '#614a39',
  },
  {
    id: 'production-systems',
    title: 'Talk to AI Like a Pro',
    subtitle: 'Prompt Systems in Production',
    category: 'ai',
    description: 'Prompt systems beyond individual conversations.',
    formats: formats('B0HJ9S9RCP', 'B0HJCX7CT9', 'B0HJD7CPWC'),
    cover: { src: '/images/books/production-systems.webp', width: 720, height: 1151 },
    spineColor: '#283e4f',
  },
  {
    id: 'security-safety-regulation',
    title: 'Talk to AI Like a Pro',
    subtitle: 'Security, Safety, and Regulation',
    category: 'ai',
    description: 'Security, safety and regulation in the practice of working with AI.',
    formats: formats('B0HJ9ZHYKL', 'B0HJ9XS7QV', 'B0HJ9Y2JZ8'),
    cover: { src: '/images/books/security-safety.webp', width: 720, height: 1151 },
    spineColor: '#4d423b',
  },
  {
    id: 'prompt-architect',
    title: 'Talk to AI Like a Pro',
    subtitle: 'Becoming a Prompt Architect',
    category: 'ai',
    description: 'The practice of thinking about prompts as systems to be designed.',
    formats: formats('B0HJBHCTJL', 'B0HJ9ZY41H', 'B0HJ9YF23C'),
    cover: { src: '/images/books/prompt-architect.webp', width: 720, height: 1151 },
    spineColor: '#284b43',
  },
  {
    id: 'creator-code',
    title: 'The Creator Code',
    subtitle: 'Unlocking Viral Growth in 2025',
    category: 'other',
    description: 'A title on content creation and audience growth.',
    formats: formats('B0GSRTT5Z9'),
    cover: { src: '/images/books/creator-code.webp', width: 720, height: 720 },
    spineColor: '#96422c',
  },
  {
    id: 'startup-idea-lab-planner',
    title: 'The Startup Idea Lab Planner',
    category: 'other',
    description: 'A planner for exploring startup ideas.',
    formats: formats(undefined, 'B0GSWJW4XR'),
    cover: { src: '/images/books/startup-planner.webp', width: 720, height: 931 },
    spineColor: '#c4ae71',
  },
];

export const physicsBook = books[0];
export const aiBooks = books.filter(book => book.category === 'ai');
export const otherBooks = books.filter(book => book.category === 'other');
