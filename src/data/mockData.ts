import { 
  Category, 
  Product, 
  Store, 
  Order, 
  Review, 
  TechService, 
  Course, 
  DigitalProduct, 
  AffiliateData, 
  FinancialLedgerItem, 
  GlobalBrandSettings, 
  HomepageSection 
} from '../types';

export const CATEGORIES: Category[] = [
  { id: 'refrigerators', name: 'Refrigerators & Freezers', group: 'appliances', icon: 'Refrigerator', itemCount: 0, description: 'Smart French door, side-by-side, inverter, and chest freezers.' },
  { id: 'air-conditioners', name: 'Air Conditioners & Cooling', group: 'appliances', icon: 'Wind', itemCount: 0, description: 'Dual inverter split ACs, portable cooling, and quiet tower fans.' },
  { id: 'washing-machines', name: 'Washing Machines & Care', group: 'appliances', icon: 'WashingMachine', itemCount: 0, description: 'Front-load washer-dryers, top-load steam agitators, and eco-dryers.' },
  { id: 'microwaves', name: 'Microwaves & Ovens', group: 'appliances', icon: 'Microwave', itemCount: 0, description: 'Smart convection microwaves, built-in ovens, and air-fry microwave combos.' },
  { id: 'cookers', name: 'Cookers & Ranges', group: 'appliances', icon: 'Flame', itemCount: 0, description: 'Induction cooktops, dual-fuel gas ranges, and smart pressure cookers.' },
  { id: 'blenders', name: 'Blenders & Air Fryers', group: 'appliances', icon: 'CookingPot', itemCount: 0, description: 'High-speed professional blenders, dual-basket air fryers, and food processors.' },
  { id: 'vacuums', name: 'Robotic & Home Vacuums', group: 'appliances', icon: 'Sparkles', itemCount: 0, description: 'LiDAR AI mapping robot vacuums, wet-dry cordless sticks, and carpet washers.' },
  { id: 'tvs', name: 'OLED & QLED Smart TVs', group: 'electronics', icon: 'Tv', itemCount: 0, description: '4K & 8K Neo QLED, OLED Motion 120Hz displays, and cinema laser projectors.' },
  { id: 'audio', name: 'Audio Systems & Headphones', group: 'electronics', icon: 'Headphones', itemCount: 0, description: 'Dolby Atmos soundbars, active noise canceling headphones, and party towers.' },
  { id: 'laptops', name: 'Computing & Workstations', group: 'electronics', icon: 'Laptop', itemCount: 0, description: 'AI workstation laptops, gaming powerhouses, and ultra-light OLED ultrabooks.' },
  { id: 'gaming', name: 'Gaming Consoles & Gear', group: 'electronics', icon: 'Gamepad2', itemCount: 0, description: 'Next-gen consoles, VR headsets, mechanical RGB gear, and 240Hz monitors.' },
  { id: 'accessories', name: 'Smart Power & Solar', group: 'smart-home', icon: 'Zap', itemCount: 0, description: 'Inverter power stations, LiFePO4 solar generators, and smart home hubs.' },
  { id: 'ebooks', name: 'Digital E-books & Guides', group: 'electronics', icon: 'BookOpen', itemCount: 0, description: 'Technical manuals, engineering guides, solar installation handbooks, and tech blueprints in PDF.' },
];

export const STORES: Store[] = [
  {
    id: 'store-1',
    name: 'NexaTech Global Store',
    logo: '/nexovira.jpeg',
    banner: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&auto=format&fit=crop&q=80',
    verified: true,
    status: 'verified',
    rating: 4.9,
    reviewCount: 142,
    joinedDate: '2023-01-15',
    productsCount: 0,
    description: 'Direct store partner for smart home appliances, inverter air conditioners, and premium OLED displays.',
    location: 'Lagos Hub / Victoria Island',
    country: 'Nigeria',
    currency: 'NGN',
    contactEmail: 'nexovirasupport@gmail.com',
    contactPhone: '+234 911 044 3054',
    payoutMethod: 'Bank Transfer / Paystack',
  },
  {
    id: 'store-2',
    name: 'ElectraHome Hub',
    logo: 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=150&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&auto=format&fit=crop&q=80',
    verified: true,
    status: 'verified',
    rating: 4.8,
    reviewCount: 95,
    joinedDate: '2023-04-10',
    productsCount: 0,
    description: 'Premier supplier of energy-efficient washing machines, side-by-side refrigerators, and heavy-duty kitchen equipment.',
    location: 'Lagos Hub / Ikeja',
    country: 'Nigeria',
    currency: 'NGN',
    contactEmail: 'sales@electrahome.io',
    contactPhone: '+234 812 959 5134',
    payoutMethod: 'Paystack Direct / Wire',
  },
  {
    id: 'store-3',
    name: 'Apex Computing & Energy',
    logo: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=150&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80',
    verified: true,
    status: 'verified',
    rating: 4.95,
    reviewCount: 210,
    joinedDate: '2022-11-01',
    productsCount: 0,
    description: 'Specializing in high-performance workstation laptops, solar generator power stations, and next-gen hardware.',
    location: 'Lagos Hub / Lekki',
    country: 'Nigeria',
    currency: 'NGN',
    contactEmail: 'orders@apexcomputing.com',
    contactPhone: '+234 911 044 3054',
    payoutMethod: 'Paystack Automated',
  },
];

export const PRODUCTS: Product[] = [];

export const TECH_SERVICES: TechService[] = [];

export const COURSES: Course[] = [];

export const DIGITAL_PRODUCTS: DigitalProduct[] = [];

export const INITIAL_ORDERS: Order[] = [];

export const INITIAL_REVIEWS: Review[] = [];

export const INITIAL_AFFILIATE_DATA: AffiliateData = {
  affiliateCode: '',
  totalClicks: 0,
  conversions: 0,
  pendingCommission: 0,
  approvedCommission: 0,
  withdrawableBalance: 0,
  totalWithdrawn: 0,
  currency: 'NGN',
  links: [],
  recentCommissions: []
};

export const INITIAL_LEDGER: FinancialLedgerItem[] = [];

export const INITIAL_BRAND_SETTINGS: GlobalBrandSettings = {
  brandName: 'NEXOVIRA',
  tagline: 'Innovation begins with vision. Smart living, better every day.',
  whatsappPhone: '+2348006392832',
  contactEmail: 'support@nexovira.com',
  defaultCurrency: 'NGN',
  ownerProfile: {
    name: 'NEXOVIRA Executive Owner',
    email: 'owner@nexovira.com',
    phone: '+234 800 NEXOVIRA',
    country: 'Nigeria',
    city: 'Lagos',
    hubAddress: 'NEXOVIRA Innovation Center, Victoria Island, Lagos, Nigeria',
    verified: true
  }
};

export const DEFAULT_HOMEPAGE_SECTIONS: HomepageSection[] = [
  { id: 'sec-1', type: 'hero', title: 'Main Hero AI Search', enabled: true, order: 1 },
  { id: 'sec-2', type: 'ecosystem-cards', title: 'Six Ecosystem Core Cards', enabled: true, order: 2 },
  { id: 'sec-3', type: 'categories', title: 'Appliance & Tech Categories', enabled: true, order: 3 },
  { id: 'sec-4', type: 'flash-deals', title: 'NEXOVIRA Flash Deals', enabled: true, order: 4 },
  { id: 'sec-5', type: 'featured-products', title: 'Marketplace Showcase', enabled: true, order: 5 },
  { id: 'sec-6', type: 'services-showcase', title: 'Tech & Digital Services Spotlight', enabled: true, order: 6 },
  { id: 'sec-7', type: 'academy-showcase', title: 'NEXOVIRA Academy Courses', enabled: true, order: 7 },
  { id: 'sec-8', type: 'library-showcase', title: 'Digital Library & Resources', enabled: true, order: 8 },
  { id: 'sec-9', type: 'top-sellers', title: 'Verified Storefront Showcase', enabled: true, order: 9 }
];
