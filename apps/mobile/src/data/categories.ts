export interface Category {
  id: string;
  name: string;
  emoji: string;
  count: number;
}

export const categories: Category[] = [
  { id: "travel", name: "Travel", emoji: "✈️", count: 96 },
  { id: "technology", name: "Technology", emoji: "💻", count: 20 },
  { id: "shopping", name: "Shopping", emoji: "🛒", count: 34 },
  { id: "rentals", name: "Rentals", emoji: "🔑", count: 10 },
  { id: "lifestyle", name: "Lifestyle", emoji: "💄", count: 28 },
  { id: "health", name: "Health", emoji: "⚕️", count: 47 },
  { id: "education", name: "Education", emoji: "🎓", count: 207 },
  { id: "construction", name: "Construction", emoji: "🔨", count: 225 },
  { id: "automotive", name: "Automotive", emoji: "🚗", count: 145 },
  { id: "business", name: "Business", emoji: "💼", count: 143 },
  { id: "services", name: "Services", emoji: "🔧", count: 356 },
  { id: "real-estate", name: "Real Estate", emoji: "🏡", count: 145 },
  { id: "ac-appliances", name: "AC & Appliances", emoji: "❄️", count: 247 },
  { id: "agriculture", name: "Agriculture", emoji: "🌾", count: 437 },
  { id: "fashion", name: "Apparel & Fashion", emoji: "👗", count: 311 },
  { id: "food", name: "Food & Dining", emoji: "🍽️", count: 189 },
  { id: "events", name: "Events", emoji: "🎉", count: 78 },
  { id: "legal", name: "Legal", emoji: "⚖️", count: 52 },
];

export const sampleBusinessCards = [
  {
    id: "1",
    name: "Sharma Electronics",
    category: "AC & Appliances",
    rating: 4.5,
    location: "Andheri West, Mumbai",
    phone: "+91 98765 43210",
    services: ["AC Repair", "TV Installation", "Appliance Service"],
    offer: "20% off on first service",
  },
  {
    id: "2",
    name: "Green Farms Organic",
    category: "Agriculture",
    rating: 4.8,
    location: "Pune, Maharashtra",
    phone: "+91 98765 12345",
    services: ["Organic Vegetables", "Farm Fresh Fruits", "Dairy Products"],
    offer: "Free delivery on orders above ₹500",
  },
  {
    id: "3",
    name: "TechVista Solutions",
    category: "Technology",
    rating: 4.6,
    location: "Bandra, Mumbai",
    phone: "+91 91234 56789",
    services: ["Web Development", "App Development", "IT Consulting"],
    offer: null,
  },
];

export interface VoucherItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  originalPrice: number;
  discountedPrice: number;
  discountLabel: string;
  image: string;
  isPopular: boolean;
  expiresIn: string;
}

export const voucherCategories = [
  { id: "food", name: "Food", icon: "🍽️" },
  { id: "beauty", name: "Beauty", icon: "💆" },
  { id: "travel", name: "Travel", icon: "✈️" },
  { id: "shopping", name: "Shopping", icon: "🛍️" },
  { id: "entertainment", name: "Fun", icon: "🎬" },
  { id: "health", name: "Health", icon: "💪" },
  { id: "activities", name: "Activities", icon: "🏄" },
  { id: "education", name: "Learn", icon: "📚" },
];

export const sampleVouchers: VoucherItem[] = [
  {
    id: "1",
    title: "Kasara Resort Weekend Getaway",
    subtitle: "Luxury stay with breakfast included",
    category: "travel",
    originalPrice: 10000,
    discountedPrice: 3000,
    discountLabel: "70% OFF",
    image: "",
    isPopular: true,
    expiresIn: "5 days left",
  },
  {
    id: "2",
    title: "Spa Luxe Full Body Massage",
    subtitle: "90-min premium spa experience",
    category: "beauty",
    originalPrice: 5000,
    discountedPrice: 2500,
    discountLabel: "50% OFF",
    image: "",
    isPopular: true,
    expiresIn: "12 days left",
  },
  {
    id: "3",
    title: "Thomas Cook Holiday Package",
    subtitle: "3N/4D Goa trip with flights",
    category: "travel",
    originalPrice: 25000,
    discountedPrice: 18000,
    discountLabel: "28% OFF",
    image: "",
    isPopular: true,
    expiresIn: "20 days left",
  },
  {
    id: "4",
    title: "Bistro 49 Dinner for Two",
    subtitle: "3-course meal with wine",
    category: "food",
    originalPrice: 3500,
    discountedPrice: 1750,
    discountLabel: "50% OFF",
    image: "",
    isPopular: false,
    expiresIn: "8 days left",
  },
  {
    id: "5",
    title: "FitLife Gym 3-Month Pass",
    subtitle: "Unlimited access + trainer",
    category: "health",
    originalPrice: 9000,
    discountedPrice: 4500,
    discountLabel: "50% OFF",
    image: "",
    isPopular: true,
    expiresIn: "15 days left",
  },
  {
    id: "6",
    title: "StyleHub Fashion Voucher",
    subtitle: "₹2000 shopping credit",
    category: "shopping",
    originalPrice: 2000,
    discountedPrice: 1200,
    discountLabel: "40% OFF",
    image: "",
    isPopular: false,
    expiresIn: "3 days left",
  },
];

export const sampleEvents = [
  {
    id: "1",
    title: "Maharashtra Shree Samman 2026",
    venue: "Mayor Hall, Juhu Lane, Andheri (W)",
    date: "17 April 2026",
    time: "7:00pm",
    category: "Awards",
  },
  {
    id: "2",
    title: "Digital Marketing Summit",
    venue: "Jio Convention Centre, Mumbai",
    date: "25 April 2026",
    time: "10:00am",
    category: "Conference",
  },
  {
    id: "3",
    title: "Startup India Meetup",
    venue: "WeWork, BKC Mumbai",
    date: "5 May 2026",
    time: "6:30pm",
    category: "Networking",
  },
];
