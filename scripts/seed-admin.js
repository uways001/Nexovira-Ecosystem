import admin from 'firebase-admin';
import config from '../firebase-applet-config.json' with { type: 'json' };

const projectId = config.projectId;
const databaseId = config.firestoreDatabaseId;

console.log(`Initializing Firebase Admin for project ${projectId}, db ${databaseId}...`);

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: projectId,
  });
}

const db = admin.firestore();
if (databaseId && databaseId !== '(default)') {
  // @ts-ignore
  db.settings({ databaseId: databaseId });
}

async function seedAdminAndDatabase() {
  const adminEmail = 'nexovirasupport@gmail.com';
  console.log(`Setting admin claim for user with email: ${adminEmail}...`);

  try {
    const user = await admin.auth().getUserByEmail(adminEmail);
    await admin.auth().setCustomUserClaims(user.uid, { role: 'admin' });
    
    // Also record in Firestore /users collection
    await db.collection('users').doc(user.uid).set({
      email: adminEmail,
      role: 'admin',
      updatedAt: new Date().toISOString()
    }, { merge: true });

    console.log(`Successfully granted admin claim to ${adminEmail} (${user.uid})`);
  } catch (err) {
    console.log(`User ${adminEmail} not found in Auth yet. Will set role upon first login or registration.`);
  }

  // Seed default categories
  const categories = [
    { id: 'refrigerators', name: 'Refrigerators & Freezers', group: 'appliances', icon: 'Refrigerator', description: 'Smart French door, side-by-side, inverter, and chest freezers.', slug: 'refrigerators' },
    { id: 'air-conditioners', name: 'Air Conditioners & Cooling', group: 'appliances', icon: 'Wind', description: 'Dual inverter split ACs, portable cooling, and quiet tower fans.', slug: 'air-conditioners' },
    { id: 'washing-machines', name: 'Washing Machines & Care', group: 'appliances', icon: 'WashingMachine', description: 'Front-load washer-dryers, top-load steam agitators, and eco-dryers.', slug: 'washing-machines' },
    { id: 'microwaves', name: 'Microwaves & Ovens', group: 'appliances', icon: 'Microwave', description: 'Smart convection microwaves, built-in ovens, and air-fry microwave combos.', slug: 'microwaves' },
    { id: 'cookers', name: 'Cookers & Ranges', group: 'appliances', icon: 'Flame', description: 'Induction cooktops, dual-fuel gas ranges, and smart pressure cookers.', slug: 'cookers' },
    { id: 'blenders', name: 'Blenders & Air Fryers', group: 'appliances', icon: 'CookingPot', description: 'High-speed professional blenders, dual-basket air fryers, and food processors.', slug: 'blenders' },
    { id: 'tvs', name: 'OLED & QLED Smart TVs', group: 'electronics', icon: 'Tv', description: '4K & 8K Neo QLED, OLED Motion 120Hz displays, and cinema laser projectors.', slug: 'tvs' },
    { id: 'audio', name: 'Audio Systems & Headphones', group: 'electronics', icon: 'Headphones', description: 'Dolby Atmos soundbars, active noise canceling headphones, and party towers.', slug: 'audio' },
    { id: 'laptops', name: 'Computing & Workstations', group: 'electronics', icon: 'Laptop', description: 'AI workstation laptops, gaming powerhouses, and ultra-light OLED ultrabooks.', slug: 'laptops' },
    { id: 'accessories', name: 'Smart Power & Solar', group: 'smart-home', icon: 'Zap', description: 'Inverter power stations, LiFePO4 solar generators, and smart home hubs.', slug: 'accessories' }
  ];

  console.log('Seeding categories...');
  for (const cat of categories) {
    await db.collection('categories').doc(cat.id).set(cat, { merge: true });
  }

  // Seed default settings document
  console.log('Seeding settings...');
  await db.collection('settings').doc('store_config').set({
    exchangeRate: 1600,
    storePhone: '+234 911 044 3054',
    whatsappPhone: '2348129595134',
    contactEmail: 'nexovirasupport@gmail.com',
    storeAddress: '14 Admiralty Way, Victoria Island, Lagos, Nigeria',
    flashDealBannerText: 'FLASH SALE: Up to 20% OFF NEXOVIRA Smart Inverter ACs & Solar Generators - Fast Lagos Delivery!',
    updatedAt: new Date().toISOString()
  }, { merge: true });

  console.log('Seeding completed successfully!');
}

seedAdminAndDatabase().catch(console.error);
