/**
 * TechTrack — Firestore seed script
 *
 * Usage (from project root):
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json node scripts/seed.cjs
 *
 * To get a service account key:
 *   Firebase Console → Project Settings → Service accounts → Generate new private key
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const admin = require('../functions/node_modules/firebase-admin')

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
if (!credPath) {
  console.error('\nError: GOOGLE_APPLICATION_CREDENTIALS is not set.')
  console.error('Get a key at: Firebase Console → Project Settings → Service accounts → Generate new private key')
  console.error('Then run: GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json node scripts/seed.cjs\n')
  process.exit(1)
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const serviceAccount = require(credPath)
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
const db = admin.firestore()

// ── Helpers ─────────────────────────────────────────────────────────────────

const ts  = (dateStr) => admin.firestore.Timestamp.fromDate(new Date(dateStr))
const now = admin.firestore.FieldValue.serverTimestamp()

// ── Categories ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    id: 'cat-macbooks', name: 'MacBooks', icon: 'pi pi-desktop', colorKey: 'blue',
    subcategories: ['MacBook Air', 'MacBook Pro 13"', 'MacBook Pro 14"', 'MacBook Pro 16"'],
  },
  {
    id: 'cat-macpros', name: 'Mac Pros', icon: 'pi pi-server', colorKey: 'cyan',
    subcategories: ['Mac Pro Tower', 'Mac Pro Rack'],
  },
  {
    id: 'cat-ipads', name: 'iPads', icon: 'pi pi-tablet', colorKey: 'indigo',
    subcategories: ['iPad Air', 'iPad Pro 11"', 'iPad Pro 12.9"', 'iPad mini'],
  },
  {
    id: 'cat-chromebooks', name: 'Chromebooks', icon: 'pi pi-desktop', colorKey: 'green',
    subcategories: ['Acer 314', 'Acer Spin 713', 'HP Chromebook Plus', 'Lenovo Duet'],
  },
  {
    id: 'cat-projectors', name: 'Projectors', icon: 'pi pi-video', colorKey: 'orange',
    subcategories: ['Short-Throw', 'Long-Throw', 'Laser', 'Interactive'],
  },
  {
    id: 'cat-network', name: 'Network', icon: 'pi pi-wifi', colorKey: 'purple',
    subcategories: ['Router', 'Switch', 'Access Point', 'Firewall'],
  },
  {
    id: 'cat-printers', name: 'Printers', icon: 'pi pi-print', colorKey: 'pink',
    subcategories: ['Laser', 'Inkjet', 'Label', '3D Printer'],
  },
  {
    id: 'cat-accessories', name: 'Accessories', icon: 'pi pi-box', colorKey: 'gray',
    subcategories: ['Keyboard', 'Mouse', 'Monitor', 'Hub / Dock', 'Headphones', 'Webcam'],
  },
]

// ── Assets ────────────────────────────────────────────────────────────────────
// school_a = main campus, school_b = second campus
// purchaseDates spread so lifespan bar shows good/aging/replace variety

const ASSETS = [

  // ── MacBooks — School A ────────────────────────────────────────────────────
  {
    name: 'MacBook Pro 14"', brand: 'Apple', model: 'MBP14-M3',
    categoryId: 'cat-macbooks', subcategoryId: 'MacBook Pro 14"',
    school: 'school_a', status: 'active',
    serialNumber: 'C02ZK1ABMD6N', assetTag: 'TT-0001',
    purchaseDate: ts('2023-08-15'), purchasePrice: 1999, estimatedValue: 1999,
    lifespanYears: 4, warrantyExpiry: ts('2026-08-15'),
    assignedTo: 'Ms. Rodriguez — Room 201', location: 'Room 201',
    notes: 'Teacher device. M3 chip.',
  },
  {
    name: 'MacBook Air 13"', brand: 'Apple', model: 'MBA13-M2',
    categoryId: 'cat-macbooks', subcategoryId: 'MacBook Air',
    school: 'school_a', status: 'active',
    serialNumber: 'C02WL3DXMD6T', assetTag: 'TT-0002',
    purchaseDate: ts('2022-01-10'), purchasePrice: 1299, estimatedValue: 1299,
    lifespanYears: 4, warrantyExpiry: ts('2025-01-10'),
    assignedTo: 'Mr. Thompson — Room 105', location: 'Room 105',
    notes: '',
  },
  {
    name: 'MacBook Pro 13"', brand: 'Apple', model: 'MBP13-M1',
    categoryId: 'cat-macbooks', subcategoryId: 'MacBook Pro 13"',
    school: 'school_a', status: 'maintenance',
    serialNumber: 'C02YP4AXMD6R', assetTag: 'TT-0003',
    purchaseDate: ts('2020-09-20'), purchasePrice: 1299, estimatedValue: 800,
    lifespanYears: 4, warrantyExpiry: null,
    assignedTo: '', location: 'IT Office',
    notes: 'Battery replacement in progress.',
  },
  {
    name: 'MacBook Air 15"', brand: 'Apple', model: 'MBA15-M2',
    categoryId: 'cat-macbooks', subcategoryId: 'MacBook Air',
    school: 'school_a', status: 'active',
    serialNumber: 'C03AB5LXMD6Q', assetTag: 'TT-0004',
    purchaseDate: ts('2023-06-01'), purchasePrice: 1499, estimatedValue: 1499,
    lifespanYears: 4, warrantyExpiry: ts('2026-06-01'),
    assignedTo: 'Library — Desk 1', location: 'Library',
    notes: '',
  },
  {
    name: 'MacBook Pro 16"', brand: 'Apple', model: 'MBP16-M2Pro',
    categoryId: 'cat-macbooks', subcategoryId: 'MacBook Pro 16"',
    school: 'school_a', status: 'active',
    serialNumber: 'C02MN8AWMD6V', assetTag: 'TT-0005',
    purchaseDate: ts('2019-11-05'), purchasePrice: 2499, estimatedValue: 1200,
    lifespanYears: 5, warrantyExpiry: null,
    assignedTo: 'IT Office', location: 'IT Office',
    notes: 'Admin workstation. Due for replacement soon.',
  },

  // ── MacBooks — School B ────────────────────────────────────────────────────
  {
    name: 'MacBook Air 13" (B)', brand: 'Apple', model: 'MBA13-M2',
    categoryId: 'cat-macbooks', subcategoryId: 'MacBook Air',
    school: 'school_b', status: 'active',
    serialNumber: 'C02WL3DXB001', assetTag: 'TT-B001',
    purchaseDate: ts('2022-09-01'), purchasePrice: 1299, estimatedValue: 1299,
    lifespanYears: 4, warrantyExpiry: ts('2025-09-01'),
    assignedTo: 'Ms. Patel — Room B-101', location: 'Room B-101',
    notes: '',
  },
  {
    name: 'MacBook Pro 14" (B)', brand: 'Apple', model: 'MBP14-M3',
    categoryId: 'cat-macbooks', subcategoryId: 'MacBook Pro 14"',
    school: 'school_b', status: 'active',
    serialNumber: 'C02ZK1ABB002', assetTag: 'TT-B002',
    purchaseDate: ts('2024-01-10'), purchasePrice: 1999, estimatedValue: 1999,
    lifespanYears: 4, warrantyExpiry: ts('2027-01-10'),
    assignedTo: 'Mr. Kim — Room B-203', location: 'Room B-203',
    notes: 'M3 Pro chip.',
  },

  // ── Mac Pros ───────────────────────────────────────────────────────────────
  {
    name: 'Mac Pro Tower', brand: 'Apple', model: 'Mac Pro 2023',
    categoryId: 'cat-macpros', subcategoryId: 'Mac Pro Tower',
    school: 'school_a', status: 'active',
    serialNumber: 'F2AZMP1AXMD6C', assetTag: 'TT-0006',
    purchaseDate: ts('2023-12-01'), purchasePrice: 6999, estimatedValue: 6999,
    lifespanYears: 6, warrantyExpiry: ts('2026-12-01'),
    assignedTo: 'Media Lab', location: 'Media Lab',
    notes: 'Video editing workstation.',
  },
  {
    name: 'Mac Pro Rack', brand: 'Apple', model: 'Mac Pro 2019',
    categoryId: 'cat-macpros', subcategoryId: 'Mac Pro Rack',
    school: 'school_a', status: 'storage',
    serialNumber: 'F2AZMR2BXMD6D', assetTag: 'TT-0007',
    purchaseDate: ts('2019-12-10'), purchasePrice: 5999, estimatedValue: 1500,
    lifespanYears: 6, warrantyExpiry: null,
    assignedTo: '', location: 'Storage Room A',
    notes: 'Replaced by 2023 Mac Pro. In storage pending auction.',
  },

  // ── iPads ─────────────────────────────────────────────────────────────────
  {
    name: 'iPad Air 5th Gen', brand: 'Apple', model: 'iPad Air (5th gen)',
    categoryId: 'cat-ipads', subcategoryId: 'iPad Air',
    school: 'school_a', status: 'active',
    serialNumber: 'DMPGQ2ABMD6A', assetTag: 'TT-0020',
    purchaseDate: ts('2022-05-01'), purchasePrice: 749, estimatedValue: 749,
    lifespanYears: 4, warrantyExpiry: ts('2025-05-01'),
    assignedTo: 'Art Class — Set 1', location: 'Room 110',
    notes: '',
  },
  {
    name: 'iPad Pro 11"', brand: 'Apple', model: 'iPad Pro 11" (4th gen)',
    categoryId: 'cat-ipads', subcategoryId: 'iPad Pro 11"',
    school: 'school_b', status: 'active',
    serialNumber: 'DMPGQ3BCMD6B', assetTag: 'TT-B010',
    purchaseDate: ts('2023-03-15'), purchasePrice: 1099, estimatedValue: 1099,
    lifespanYears: 5, warrantyExpiry: ts('2026-03-15'),
    assignedTo: 'Ms. Nguyen — Room B-115', location: 'Room B-115',
    notes: 'Used for digital art curriculum.',
  },

  // ── Chromebooks — School A ─────────────────────────────────────────────────
  {
    name: 'Chromebook 314 #1', brand: 'Acer', model: 'CB314-2H',
    categoryId: 'cat-chromebooks', subcategoryId: 'Acer 314',
    school: 'school_a', status: 'active',
    serialNumber: 'HQ3CK0012345', assetTag: 'TT-0008',
    purchaseDate: ts('2022-08-20'), purchasePrice: 349, estimatedValue: 349,
    lifespanYears: 3, warrantyExpiry: ts('2025-08-20'),
    assignedTo: 'Classroom Set A — Unit 1', location: 'Room 205',
    notes: '',
  },
  {
    name: 'Chromebook 314 #2', brand: 'Acer', model: 'CB314-2H',
    categoryId: 'cat-chromebooks', subcategoryId: 'Acer 314',
    school: 'school_a', status: 'active',
    serialNumber: 'HQ3CK0012346', assetTag: 'TT-0009',
    purchaseDate: ts('2022-08-20'), purchasePrice: 349, estimatedValue: 349,
    lifespanYears: 3, warrantyExpiry: ts('2025-08-20'),
    assignedTo: 'Classroom Set A — Unit 2', location: 'Room 205',
    notes: '',
  },
  {
    name: 'Chromebook Plus', brand: 'HP', model: 'HP Chromebook Plus 15',
    categoryId: 'cat-chromebooks', subcategoryId: 'HP Chromebook Plus',
    school: 'school_a', status: 'active',
    serialNumber: 'HQ3CK0099001', assetTag: 'TT-0010',
    purchaseDate: ts('2024-01-15'), purchasePrice: 499, estimatedValue: 499,
    lifespanYears: 4, warrantyExpiry: ts('2027-01-15'),
    assignedTo: 'Classroom Set B — Unit 1', location: 'Room 206',
    notes: '',
  },
  {
    name: 'Chromebook Spin 713', brand: 'Acer', model: 'CP713-3W',
    categoryId: 'cat-chromebooks', subcategoryId: 'Acer Spin 713',
    school: 'school_a', status: 'maintenance',
    serialNumber: 'HQ3CK0054321', assetTag: 'TT-0011',
    purchaseDate: ts('2021-03-10'), purchasePrice: 629, estimatedValue: 300,
    lifespanYears: 3, warrantyExpiry: null,
    assignedTo: '', location: 'IT Office',
    notes: 'Cracked screen. Awaiting repair quote.',
  },

  // ── Chromebooks — School B ─────────────────────────────────────────────────
  {
    name: 'Chromebook 314 #3', brand: 'Acer', model: 'CB314-2H',
    categoryId: 'cat-chromebooks', subcategoryId: 'Acer 314',
    school: 'school_b', status: 'active',
    serialNumber: 'HQ3CKB00001', assetTag: 'TT-B020',
    purchaseDate: ts('2023-08-10'), purchasePrice: 349, estimatedValue: 349,
    lifespanYears: 3, warrantyExpiry: ts('2026-08-10'),
    assignedTo: 'Classroom Set C — Unit 1', location: 'Room B-301',
    notes: '',
  },

  // ── Projectors ────────────────────────────────────────────────────────────
  {
    name: 'Laser Projector XL', brand: 'Epson', model: 'EB-L615U',
    categoryId: 'cat-projectors', subcategoryId: 'Laser',
    school: 'school_a', status: 'active',
    serialNumber: 'EPSNL61500023', assetTag: 'TT-0012',
    purchaseDate: ts('2021-07-01'), purchasePrice: 1899, estimatedValue: 1899,
    lifespanYears: 5, warrantyExpiry: ts('2026-07-01'),
    assignedTo: 'Auditorium', location: 'Auditorium',
    notes: '6000 lumens. Ceiling mounted.',
  },
  {
    name: 'Short-Throw Projector — Rm 301', brand: 'BenQ', model: 'MW560',
    categoryId: 'cat-projectors', subcategoryId: 'Short-Throw',
    school: 'school_a', status: 'active',
    serialNumber: 'BENQMW56000117', assetTag: 'TT-0013',
    purchaseDate: ts('2020-02-14'), purchasePrice: 699, estimatedValue: 699,
    lifespanYears: 5, warrantyExpiry: null,
    assignedTo: 'Room 301', location: 'Room 301',
    notes: '',
  },
  {
    name: 'Short-Throw Projector — Rm 302', brand: 'BenQ', model: 'MW560',
    categoryId: 'cat-projectors', subcategoryId: 'Short-Throw',
    school: 'school_a', status: 'active',
    serialNumber: 'BENQMW56000118', assetTag: 'TT-0014',
    purchaseDate: ts('2020-02-14'), purchasePrice: 699, estimatedValue: 699,
    lifespanYears: 5, warrantyExpiry: null,
    assignedTo: 'Room 302', location: 'Room 302',
    notes: '',
  },
  {
    name: 'Interactive Projector', brand: 'Epson', model: 'BrightLink 595Wi',
    categoryId: 'cat-projectors', subcategoryId: 'Interactive',
    school: 'school_b', status: 'active',
    serialNumber: 'EPSNBL59500044', assetTag: 'TT-B030',
    purchaseDate: ts('2022-04-10'), purchasePrice: 1299, estimatedValue: 1299,
    lifespanYears: 5, warrantyExpiry: ts('2025-04-10'),
    assignedTo: 'Room B-204', location: 'Room B-204',
    notes: 'Wall-mounted interactive whiteboard projector.',
  },

  // ── Network ───────────────────────────────────────────────────────────────
  {
    name: 'Core Switch', brand: 'Cisco', model: 'Catalyst 2960-X',
    categoryId: 'cat-network', subcategoryId: 'Switch',
    school: 'school_a', status: 'active',
    serialNumber: 'FOC1234X0001', assetTag: 'TT-N001',
    purchaseDate: ts('2020-06-15'), purchasePrice: 2400, estimatedValue: 2400,
    lifespanYears: 7, warrantyExpiry: ts('2027-06-15'),
    assignedTo: 'Server Room', location: 'Server Room',
    notes: '48-port PoE switch.',
  },
  {
    name: 'WiFi Access Point — Hall A', brand: 'Ubiquiti', model: 'UniFi U6-Pro',
    categoryId: 'cat-network', subcategoryId: 'Access Point',
    school: 'school_a', status: 'active',
    serialNumber: 'UBNT-U6P-00123', assetTag: 'TT-N002',
    purchaseDate: ts('2023-01-20'), purchasePrice: 180, estimatedValue: 180,
    lifespanYears: 5, warrantyExpiry: ts('2026-01-20'),
    assignedTo: 'Hallway A', location: 'Hallway A — Ceiling',
    notes: '',
  },
  {
    name: 'WiFi Access Point — Library', brand: 'Ubiquiti', model: 'UniFi U6-Pro',
    categoryId: 'cat-network', subcategoryId: 'Access Point',
    school: 'school_a', status: 'active',
    serialNumber: 'UBNT-U6P-00124', assetTag: 'TT-N003',
    purchaseDate: ts('2023-01-20'), purchasePrice: 180, estimatedValue: 180,
    lifespanYears: 5, warrantyExpiry: ts('2026-01-20'),
    assignedTo: 'Library', location: 'Library — Ceiling',
    notes: '',
  },
  {
    name: 'Firewall', brand: 'Fortinet', model: 'FortiGate 60F',
    categoryId: 'cat-network', subcategoryId: 'Firewall',
    school: 'school_a', status: 'active',
    serialNumber: 'FG60FAABC00001', assetTag: 'TT-N004',
    purchaseDate: ts('2021-09-01'), purchasePrice: 895, estimatedValue: 895,
    lifespanYears: 5, warrantyExpiry: ts('2026-09-01'),
    assignedTo: 'Server Room', location: 'Server Room',
    notes: 'UTM license expires 2026-09-01.',
  },

  // ── Printers ──────────────────────────────────────────────────────────────
  {
    name: 'Office Laser Printer', brand: 'HP', model: 'LaserJet Pro M404dn',
    categoryId: 'cat-printers', subcategoryId: 'Laser',
    school: 'school_a', status: 'active',
    serialNumber: 'PHBGH10001', assetTag: 'TT-P001',
    purchaseDate: ts('2021-11-01'), purchasePrice: 349, estimatedValue: 349,
    lifespanYears: 5, warrantyExpiry: ts('2024-11-01'),
    assignedTo: 'Main Office', location: 'Main Office',
    notes: '',
  },
  {
    name: '3D Printer', brand: 'Bambu Lab', model: 'X1 Carbon',
    categoryId: 'cat-printers', subcategoryId: '3D Printer',
    school: 'school_b', status: 'active',
    serialNumber: 'BLABX1C00055', assetTag: 'TT-B040',
    purchaseDate: ts('2024-02-20'), purchasePrice: 1449, estimatedValue: 1449,
    lifespanYears: 5, warrantyExpiry: ts('2026-02-20'),
    assignedTo: 'STEM Lab', location: 'STEM Lab',
    notes: 'Multi-color capable. AMS unit included.',
  },

  // ── Accessories ───────────────────────────────────────────────────────────
  {
    name: 'Magic Keyboard', brand: 'Apple', model: 'MK2C3LL/A',
    categoryId: 'cat-accessories', subcategoryId: 'Keyboard',
    school: 'school_a', status: 'active',
    serialNumber: 'C1MGK0011122', assetTag: 'TT-0015',
    purchaseDate: ts('2023-08-15'), purchasePrice: 99, estimatedValue: 99,
    lifespanYears: 5, warrantyExpiry: null,
    assignedTo: 'Ms. Rodriguez — Room 201', location: 'Room 201',
    notes: 'Paired with TT-0001',
  },
  {
    name: 'USB-C Hub 7-in-1', brand: 'Anker', model: 'A8346',
    categoryId: 'cat-accessories', subcategoryId: 'Hub / Dock',
    school: 'school_a', status: 'active',
    serialNumber: 'ANKR84600045', assetTag: 'TT-0016',
    purchaseDate: ts('2022-05-10'), purchasePrice: 45, estimatedValue: 45,
    lifespanYears: 3, warrantyExpiry: null,
    assignedTo: 'IT Office', location: 'IT Office',
    notes: '',
  },
  {
    name: 'Dell 27" Monitor', brand: 'Dell', model: 'U2722D',
    categoryId: 'cat-accessories', subcategoryId: 'Monitor',
    school: 'school_a', status: 'active',
    serialNumber: 'DELLU272200089', assetTag: 'TT-0017',
    purchaseDate: ts('2021-10-01'), purchasePrice: 569, estimatedValue: 569,
    lifespanYears: 6, warrantyExpiry: ts('2024-10-01'),
    assignedTo: 'Media Lab', location: 'Media Lab',
    notes: 'Connected to Mac Pro TT-0006',
  },
  {
    name: 'Magic Mouse', brand: 'Apple', model: 'MK2E3LL/A',
    categoryId: 'cat-accessories', subcategoryId: 'Mouse',
    school: 'school_a', status: 'retired',
    serialNumber: 'C1MMO0099831', assetTag: 'TT-0018',
    purchaseDate: ts('2018-06-01'), purchasePrice: 79, estimatedValue: 0,
    lifespanYears: 4, warrantyExpiry: null,
    assignedTo: '', location: '',
    notes: 'Retired. Scroll wheel non-functional.',
  },
  {
    name: 'Sony WH-1000XM5 Headphones', brand: 'Sony', model: 'WH-1000XM5',
    categoryId: 'cat-accessories', subcategoryId: 'Headphones',
    school: 'school_b', status: 'active',
    serialNumber: 'SONYMX500099', assetTag: 'TT-B050',
    purchaseDate: ts('2023-10-05'), purchasePrice: 349, estimatedValue: 349,
    lifespanYears: 4, warrantyExpiry: ts('2025-10-05'),
    assignedTo: 'Recording Studio', location: 'Room B-120',
    notes: '',
  },
]

// ── Seed functions ────────────────────────────────────────────────────────────

async function seedCategories() {
  console.log('Seeding categories...')
  const batch = db.batch()
  for (const cat of CATEGORIES) {
    const ref = db.collection('categories').doc(cat.id)
    batch.set(ref, {
      name:           cat.name,
      icon:           cat.icon,
      colorKey:       cat.colorKey,
      subcategories:  cat.subcategories,
      careTasks:      [],
      isDeleted:      false,
      createdAt:      now,
      updatedAt:      now,
    })
  }
  await batch.commit()
  console.log(`  ✓ ${CATEGORIES.length} categories written`)
}

async function seedAssets() {
  console.log('Seeding assets...')
  const batch = db.batch()
  for (const asset of ASSETS) {
    const ref = db.collection('assets').doc()
    batch.set(ref, {
      name:           asset.name,
      brand:          asset.brand,
      model:          asset.model,
      categoryId:     asset.categoryId,
      subcategoryId:  asset.subcategoryId,
      school:         asset.school,
      status:         asset.status,
      serialNumber:   asset.serialNumber,
      assetTag:       asset.assetTag,
      purchaseDate:   asset.purchaseDate,
      purchasePrice:  asset.purchasePrice,
      estimatedValue: asset.estimatedValue,
      lifespanYears:  asset.lifespanYears,
      warrantyExpiry: asset.warrantyExpiry,
      assignedTo:     asset.assignedTo,
      location:       asset.location,
      notes:          asset.notes,
      careCompletions: {},
      isDeleted:      false,
      createdAt:      now,
      updatedAt:      now,
    })
  }
  await batch.commit()
  console.log(`  ✓ ${ASSETS.length} assets written`)
}

// ── Settings ──────────────────────────────────────────────────────────────────

async function seedSettings() {
  console.log('Seeding settings...')
  await db.collection('settings').doc('app').set({
    appTitle:    'TechTrack',
    appSubtitle: 'Asset Management',
    schoolAName: 'Maplewood Academy',
    schoolBName: 'Riverside Preparatory School',
  }, { merge: true })
  console.log('  ✓ Settings written')
}

// ── Run ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\nTechTrack seed starting...\n')
  await seedSettings()
  await seedCategories()
  await seedAssets()
  console.log('\nDone! All collections seeded.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
