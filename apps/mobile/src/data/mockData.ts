// Consolidated mock data for all modules

export type SubscriptionTier = "free" | "basic" | "premium" | "enterprise";
export type ServiceType = "home" | "store" | "both";

export interface BusinessCard {
  id: string;
  name: string;
  category: string;
  subCategory: string;
  phone: string;
  email: string;
  location: string;
  services: string[];
  offer: string | null;
  rating: number;
  reviewCount: number;
  logo: string;
  website: string | null;
  description: string;
  createdAt: string;
  tier: SubscriptionTier;
  serviceType: ServiceType;
  distance?: number; // km
}

export const mockMyCards: BusinessCard[] = [
  {
    id: "my-1",
    name: "Sharma Electronics",
    category: "AC & Appliances",
    subCategory: "Services",
    phone: "+91 98765 43210",
    email: "info@sharmaelectronics.in",
    location: "Andheri West, Mumbai",
    services: ["AC Repair", "TV Installation", "Appliance Service"],
    offer: "20% off on first service",
    rating: 4.5,
    reviewCount: 128,
    logo: "⚡",
    website: "www.sharmaelectronics.in",
    description: "Premium electronics repair and installation services in Mumbai since 2010.",
    createdAt: "2026-01-15",
    tier: "premium",
    serviceType: "home",
    distance: 2.3,
  },
];

export const mockDirectoryCards: BusinessCard[] = [
  {
    id: "dir-1",
    name: "Sharma Electronics",
    category: "AC & Appliances",
    subCategory: "Services",
    phone: "+91 98765 43210",
    email: "info@sharmaelectronics.in",
    location: "Andheri West, Mumbai",
    services: ["AC Repair", "TV Installation", "Appliance Service"],
    offer: "20% off on first service",
    rating: 4.5,
    reviewCount: 128,
    logo: "⚡",
    website: "www.sharmaelectronics.in",
    description: "Premium electronics repair and installation services in Mumbai since 2010.",
    createdAt: "2026-01-15",
    tier: "enterprise",
    serviceType: "home",
    distance: 2.3,
  },
  {
    id: "dir-2",
    name: "Green Farms Organic",
    category: "Agriculture",
    subCategory: "Food",
    phone: "+91 98765 12345",
    email: "hello@greenfarms.in",
    location: "Pune, Maharashtra",
    services: ["Organic Vegetables", "Farm Fresh Fruits", "Dairy Products"],
    offer: "Free delivery on orders above ₹500",
    rating: 4.8,
    reviewCount: 256,
    logo: "🌿",
    website: "www.greenfarms.in",
    description: "100% organic farm produce delivered fresh to your doorstep across Pune.",
    createdAt: "2025-11-20",
    tier: "premium",
    serviceType: "both",
    distance: 5.1,
  },
  {
    id: "dir-3",
    name: "TechVista Solutions",
    category: "Technology",
    subCategory: "B2B",
    phone: "+91 91234 56789",
    email: "contact@techvista.io",
    location: "Bandra, Mumbai",
    services: ["Web Development", "App Development", "IT Consulting"],
    offer: null,
    rating: 4.6,
    reviewCount: 89,
    logo: "💻",
    website: "www.techvista.io",
    description: "Full-stack digital agency specializing in modern web and mobile applications.",
    createdAt: "2025-12-01",
    tier: "premium",
    serviceType: "store",
    distance: 3.7,
  },
  {
    id: "dir-4",
    name: "Kapoor Legal Associates",
    category: "Legal",
    subCategory: "Services",
    phone: "+91 98123 45678",
    email: "legal@kapoorassociates.com",
    location: "Fort, Mumbai",
    services: ["Corporate Law", "Property Law", "Family Law"],
    offer: "Free first consultation",
    rating: 4.7,
    reviewCount: 67,
    logo: "⚖️",
    website: null,
    description: "Trusted legal services for businesses and individuals across Maharashtra.",
    createdAt: "2025-10-10",
    tier: "basic",
    serviceType: "store",
    distance: 8.2,
  },
  {
    id: "dir-5",
    name: "FitZone Gym & Wellness",
    category: "Health",
    subCategory: "Wellness",
    phone: "+91 99876 54321",
    email: "join@fitzone.in",
    location: "Powai, Mumbai",
    services: ["Personal Training", "Group Classes", "Nutrition Plans"],
    offer: "50% off first month",
    rating: 4.4,
    reviewCount: 312,
    logo: "💪",
    website: "www.fitzone.in",
    description: "Premium fitness center with state-of-the-art equipment and certified trainers.",
    createdAt: "2026-02-05",
    tier: "enterprise",
    serviceType: "store",
    distance: 1.5,
  },
  {
    id: "dir-6",
    name: "Wanderlust Travels",
    category: "Travel",
    subCategory: "Services",
    phone: "+91 97654 32100",
    email: "book@wanderlust.in",
    location: "Juhu, Mumbai",
    services: ["Holiday Packages", "Flight Booking", "Visa Assistance"],
    offer: "Early bird 15% off on summer packages",
    rating: 4.3,
    reviewCount: 198,
    logo: "✈️",
    website: "www.wanderlust.in",
    description: "Crafting unforgettable travel experiences for families and solo adventurers.",
    createdAt: "2026-01-28",
    tier: "free",
    serviceType: "store",
    distance: 4.0,
  },
  {
    id: "dir-7",
    name: "Glow Beauty Salon",
    category: "Lifestyle",
    subCategory: "Wellness",
    phone: "+91 99887 76655",
    email: "book@glowsalon.in",
    location: "Malad West, Mumbai",
    services: ["Hair Styling", "Facial", "Bridal Makeup"],
    offer: "Flat ₹200 off on first visit",
    rating: 4.6,
    reviewCount: 410,
    logo: "💇",
    website: null,
    description: "Your neighbourhood beauty destination for all grooming needs.",
    createdAt: "2026-02-10",
    tier: "premium",
    serviceType: "both",
    distance: 3.2,
  },
  {
    id: "dir-8",
    name: "QuickFix Plumbing",
    category: "Services",
    subCategory: "Services",
    phone: "+91 98001 23456",
    email: "help@quickfix.in",
    location: "Goregaon, Mumbai",
    services: ["Pipe Repair", "Drain Cleaning", "Water Heater Install"],
    offer: null,
    rating: 4.2,
    reviewCount: 75,
    logo: "🔧",
    website: null,
    description: "Reliable home plumbing services across Mumbai suburbs.",
    createdAt: "2026-03-01",
    tier: "free",
    serviceType: "home",
    distance: 6.0,
  },
  {
    id: "dir-9",
    name: "Desi Bites Kitchen",
    category: "Food & Dining",
    subCategory: "Food",
    phone: "+91 91234 00001",
    email: "order@desibites.in",
    location: "Vile Parle, Mumbai",
    services: ["Tiffin Service", "Catering", "Party Orders"],
    offer: "Free trial tiffin!",
    rating: 4.9,
    reviewCount: 540,
    logo: "🍛",
    website: "www.desibites.in",
    description: "Homestyle meals delivered fresh, daily tiffin and bulk catering.",
    createdAt: "2025-12-15",
    tier: "enterprise",
    serviceType: "home",
    distance: 1.8,
  },
  {
    id: "dir-10",
    name: "BuildRight Construction",
    category: "Construction",
    subCategory: "B2B",
    phone: "+91 98001 99887",
    email: "projects@buildright.in",
    location: "Thane, Mumbai",
    services: ["Residential", "Commercial", "Interior Design"],
    offer: "Free site visit & estimation",
    rating: 4.5,
    reviewCount: 92,
    logo: "🏗️",
    website: "www.buildright.in",
    description: "End-to-end construction solutions for residential and commercial projects.",
    createdAt: "2026-01-05",
    tier: "basic",
    serviceType: "store",
    distance: 12.5,
  },
  {
    id: "dir-11",
    name: "EduSpark Academy",
    category: "Education",
    subCategory: "Services",
    phone: "+91 99001 22334",
    email: "admissions@eduspark.in",
    location: "Dadar, Mumbai",
    services: ["Board Exams", "Competitive Exams", "Coding Classes"],
    offer: "1 week free trial",
    rating: 4.7,
    reviewCount: 320,
    logo: "📚",
    website: "www.eduspark.in",
    description: "Top-rated coaching institute for school and competitive exam preparation.",
    createdAt: "2026-02-20",
    tier: "premium",
    serviceType: "both",
    distance: 7.0,
  },
  {
    id: "dir-12",
    name: "StyleStreet Boutique",
    category: "Apparel & Fashion",
    subCategory: "Retail",
    phone: "+91 98765 00011",
    email: "shop@stylestreet.in",
    location: "Linking Road, Mumbai",
    services: ["Women's Wear", "Men's Fashion", "Custom Tailoring"],
    offer: "Buy 2 Get 1 Free",
    rating: 4.3,
    reviewCount: 180,
    logo: "👗",
    website: "www.stylestreet.in",
    description: "Trendy fashion store with curated collections and custom tailoring.",
    createdAt: "2026-01-20",
    tier: "basic",
    serviceType: "store",
    distance: 4.5,
  },
];

// Tier ranking order for sorting (higher = ranked higher)
export const tierRank: Record<SubscriptionTier, number> = {
  enterprise: 4,
  premium: 3,
  basic: 2,
  free: 1,
};

// Sub-category definitions
export const subCategories = [
  { id: "all", name: "All", emoji: "📋" },
  { id: "wellness", name: "Wellness", emoji: "🧘" },
  { id: "food", name: "Food", emoji: "🍽️" },
  { id: "retail", name: "Retail", emoji: "🛍️" },
  { id: "services", name: "Services", emoji: "🔧" },
  { id: "b2b", name: "B2B", emoji: "🤝" },
];

export interface Conversation {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isGroup: boolean;
  members?: string[];
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  isMe: boolean;
  type: "text" | "card";
  cardData?: { name: string; category: string };
}

export const mockConversations: Conversation[] = [
  {
    id: "conv-1",
    name: "Rahul Sharma",
    avatar: "RS",
    lastMessage: "Thanks for the business card!",
    timestamp: "2m ago",
    unreadCount: 2,
    isGroup: false,
  },
  {
    id: "conv-2",
    name: "Mumbai Entrepreneurs",
    avatar: "ME",
    lastMessage: "Priya: Anyone need a web developer?",
    timestamp: "15m ago",
    unreadCount: 5,
    isGroup: true,
    members: ["Rahul", "Priya", "Amit", "Neha", "You"],
  },
  {
    id: "conv-3",
    name: "Priya Patel",
    avatar: "PP",
    lastMessage: "Let's meet at the networking event",
    timestamp: "1h ago",
    unreadCount: 0,
    isGroup: false,
  },
  {
    id: "conv-4",
    name: "Tech Founders Group",
    avatar: "TF",
    lastMessage: "Amit: Check out this new tool!",
    timestamp: "3h ago",
    unreadCount: 12,
    isGroup: true,
    members: ["Amit", "Vikram", "Sneha", "You"],
  },
  {
    id: "conv-5",
    name: "Neha Gupta",
    avatar: "NG",
    lastMessage: "Your voucher code is applied ✅",
    timestamp: "Yesterday",
    unreadCount: 0,
    isGroup: false,
  },
];

export const mockMessages: Message[] = [
  { id: "m1", senderId: "other", text: "Hi! I saw your business card on the platform", timestamp: "10:30 AM", isMe: false, type: "text" },
  { id: "m2", senderId: "me", text: "Hey Rahul! Yes, glad you found it useful", timestamp: "10:31 AM", isMe: true, type: "text" },
  { id: "m3", senderId: "other", text: "I'm looking for AC repair services in Andheri", timestamp: "10:32 AM", isMe: false, type: "text" },
  { id: "m4", senderId: "me", text: "Sure! Here's my card with all the details", timestamp: "10:33 AM", isMe: true, type: "card", cardData: { name: "Sharma Electronics", category: "AC & Appliances" } },
  { id: "m5", senderId: "other", text: "Thanks for the business card!", timestamp: "10:34 AM", isMe: false, type: "text" },
];

export interface Ad {
  id: string;
  title: string;
  type: "banner" | "featured" | "sponsored";
  status: "active" | "paused" | "completed";
  impressions: number;
  clicks: number;
  budget: number;
  spent: number;
  startDate: string;
  endDate: string;
  targetAudience: string;
  creative: string;
}

export const mockAds: Ad[] = [
  {
    id: "ad-1",
    title: "Summer AC Service Campaign",
    type: "banner",
    status: "active",
    impressions: 12500,
    clicks: 340,
    budget: 5000,
    spent: 3200,
    startDate: "2026-03-01",
    endDate: "2026-04-01",
    targetAudience: "Mumbai, 25-45",
    creative: "🌡️",
  },
  {
    id: "ad-2",
    title: "Organic Veggies Promo",
    type: "featured",
    status: "active",
    impressions: 8900,
    clicks: 220,
    budget: 3000,
    spent: 1800,
    startDate: "2026-03-10",
    endDate: "2026-04-10",
    targetAudience: "Pune, Health-conscious",
    creative: "🥬",
  },
  {
    id: "ad-3",
    title: "Diwali Special Offer",
    type: "sponsored",
    status: "completed",
    impressions: 45000,
    clicks: 1200,
    budget: 10000,
    spent: 10000,
    startDate: "2025-10-15",
    endDate: "2025-11-15",
    targetAudience: "All India",
    creative: "🎆",
  },
];

export const mockBannerAds = [
  {
    id: "banner-1",
    title: "Get 50% off on AC Service",
    subtitle: "Sharma Electronics",
    cta: "Book Now",
    emoji: "❄️",
    gradient: "from-primary/10 to-accent/10",
  },
  {
    id: "banner-2",
    title: "Fresh Organic Produce",
    subtitle: "Green Farms — Free Delivery",
    cta: "Order Now",
    emoji: "🌿",
    gradient: "from-success/10 to-primary/10",
  },
  {
    id: "banner-3",
    title: "Build Your Dream App",
    subtitle: "TechVista Solutions",
    cta: "Get Quote",
    emoji: "🚀",
    gradient: "from-accent/10 to-warning/10",
  },
];

export interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

export const mockReviews: Review[] = [
  { id: "r1", userName: "Amit K.", rating: 5, comment: "Excellent service! Very professional and timely.", date: "2 days ago" },
  { id: "r2", userName: "Priya S.", rating: 4, comment: "Good quality work. Slightly late but did a great job.", date: "1 week ago" },
  { id: "r3", userName: "Vikram M.", rating: 5, comment: "Best in the area. Highly recommend!", date: "2 weeks ago" },
];
