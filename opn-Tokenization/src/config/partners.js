// src/config/partners.js
// Partner Configuration for Tonino Lamborghini & Mansory

export const PARTNERS = {
  'tonino-lamborghini': {
    id: 'tonino-lamborghini',
    name: 'Tonino Lamborghini Residences',
    displayName: 'Tonino Lamborghini',
    tagline: 'Where Italian Excellence Meets Luxury Living',
    description: 'Luxury residences embodying the Lamborghini legacy of Italian excellence, performance, and uncompromising style.',
    
    // Branding - Lamborghini Red
    colors: {
      primary: '#C8102E',      // Lamborghini Red
      secondary: '#1a1a1a',    // Carbon Black
      accent: '#FFD700',       // Gold
      background: '#0a0a0a',   // Deep Black
      text: '#ffffff',
      textMuted: '#a3a3a3',
    },
    
    // Visual Theme
    theme: {
      carbonFiber: true,
      pattern: 'hexagonal',
      luxuryFont: "'Montserrat', sans-serif",
      gradientOverlay: 'linear-gradient(135deg, rgba(200, 16, 46, 0.1) 0%, rgba(0, 0, 0, 0.9) 100%)',
    },
    
    // Asset Categories
    categories: ['apartment'],
    
    // Apartment Specifications
    apartmentTypes: [
      { value: '1BR', label: '1 Bedroom', icon: '🛏️' },
      { value: '2BR', label: '2 Bedrooms', icon: '🛏️🛏️' },
      { value: '3BR', label: '3 Bedrooms', icon: '🏠' },
      { value: '4BR', label: '4 Bedrooms', icon: '🏰' },
    ],
    
    standardAmenities: [
      'Private Elevator Access',
      'Floor-to-Ceiling Windows',
      'Smart Home Automation',
      'Premium Italian Finishes',
      '24/7 Concierge Service',
      'Lamborghini Design Elements',
      'Private Balcony',
      'High-End Appliances',
    ],
    
    // Media
    logo: '/images/partners/tonino-logo.png',
    heroImage: '/images/partners/tonino-hero.jpg',
    backgroundPattern: '/images/patterns/carbon-hexagonal.png',
    
    // Links
    website: 'https://www.toninolambo.com',
    social: {
      instagram: '@tonino_lamborghini',
      twitter: '@ToninoLambo',
    },
  },
  
  mansory: {
    id: 'mansory',
    name: 'Mansory Collection',
    displayName: 'Mansory',
    tagline: 'The Pinnacle of Luxury & Customization',
    description: 'Ultra-luxury residences and bespoke vehicles representing unparalleled craftsmanship and exclusive customization.',
    
    // Branding - Mansory Gold/Bronze
    colors: {
      primary: '#D4AF37',      // Mansory Gold
      secondary: '#1a1a1a',    // Carbon Black
      accent: '#8B7355',       // Bronze
      background: '#0a0a0a',   // Deep Black
      text: '#ffffff',
      textMuted: '#a3a3a3',
    },
    
    // Visual Theme
    theme: {
      carbonFiber: true,
      pattern: 'diagonal-weave',
      luxuryFont: "'Playfair Display', serif",
      gradientOverlay: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(0, 0, 0, 0.9) 100%)',
    },
    
    // Asset Categories
    categories: ['apartment', 'vehicle'],
    
    // Apartment Specifications
    apartmentTypes: [
      { value: '1BR', label: '1 Bedroom', icon: '🛏️' },
      { value: '2BR', label: '2 Bedrooms', icon: '🛏️🛏️' },
      { value: '3BR', label: '3 Bedrooms', icon: '🏠' },
      { value: '4BR', label: '4 Bedrooms', icon: '🏰' },
      { value: 'Penthouse', label: 'Penthouse', icon: '👑' },
    ],
    
    standardAmenities: [
      'Mansory-Designed Interiors',
      'Carbon Fiber Accent Walls',
      'Private Garage Access',
      'Rooftop Terrace Access',
      '24/7 Concierge Service',
      'Bespoke Furniture Options',
      'Smart Home Integration',
      'Premium Security System',
    ],
    
    // Vehicle Specifications
    vehicleCategories: [
      { value: 'supercar', label: 'Supercar', icon: '🏎️' },
      { value: 'luxury-suv', label: 'Luxury SUV', icon: '🚙' },
      { value: 'hypercar', label: 'Hypercar', icon: '⚡' },
      { value: 'limited-edition', label: 'Limited Edition', icon: '💎' },
    ],
    
    vehicleFeatures: [
      'Bespoke Carbon Fiber Bodywork',
      'Custom Interior Leather & Alcantara',
      'Performance Tuning & Upgrades',
      'Limited Production Run',
      'Certificate of Authenticity',
      'Exclusive Paint Finishes',
      'Personalized Badging',
      'Lifetime Warranty on Modifications',
    ],
    
    // Media
    logo: '/images/partners/mansory-logo.png',
    heroImage: '/images/partners/mansory-hero.jpg',
    backgroundPattern: '/images/patterns/carbon-diagonal.png',
    
    // Links
    website: 'https://mansory-residences.com',
    social: {
      instagram: '@mansory',
      twitter: '@Mansory',
    },
  },
};

// Helper Functions
export const getPartner = (partnerId) => {
  return PARTNERS[partnerId] || null;
};

export const getAllPartners = () => {
  return Object.values(PARTNERS);
};

export const getPartnersByCategory = (category) => {
  return Object.values(PARTNERS).filter(partner => 
    partner.categories.includes(category)
  );
};

// Asset category definitions
export const ASSET_CATEGORIES = {
  apartment: {
    label: 'Apartment',
    icon: '🏢',
    fields: ['bedrooms', 'squareFootage', 'floor', 'amenities', 'view'],
  },
  vehicle: {
    label: 'Vehicle',
    icon: '🏎️',
    fields: ['make', 'model', 'year', 'category', 'modifications', 'performanceSpecs', 'productionNumber'],
  },
};

export default PARTNERS;