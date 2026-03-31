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

const ts = (dateStr) => admin.firestore.Timestamp.fromDate(new Date(dateStr))
const now = admin.firestore.FieldValue.serverTimestamp()

// ── Categories ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'cat-macbooks',    name: 'MacBooks',    icon: 'pi pi-desktop', colorKey: 'blue'   },
  { id: 'cat-macpros',     name: 'Mac Pros',    icon: 'pi pi-server',  colorKey: 'cyan'   },
  { id: 'cat-chromebooks', name: 'Chromebooks', icon: 'pi pi-desktop', colorKey: 'green'  },
  { id: 'cat-projectors',  name: 'Projectors',  icon: 'pi pi-video',   colorKey: 'orange' },
  { id: 'cat-accessories', name: 'Accessories', icon: 'pi pi-box',     colorKey: 'purple' },
]

// ── Assets ────────────────────────────────────────────────────────────────────
// Purchase dates are spread so some show as good/aging/replace in the lifespan bar

const ASSETS = [
  // MacBooks
  {
    name: 'MacBook Pro 14"', brand: 'Apple', model: 'MBP14-M3', categoryId: 'cat-macbooks',
    status: 'active', serialNumber: 'C02ZK1ABMD6N', assetTag: 'TT-0001',
    purchaseDate: ts('2023-08-15'), purchasePrice: 1999, lifespanYears: 4,
    assignedTo: 'Ms. Rodriguez — Room 201', notes: 'Teacher device. M3 chip.',
  },
  {
    name: 'MacBook Air 13"', brand: 'Apple', model: 'MBA13-M2', categoryId: 'cat-macbooks',
    status: 'active', serialNumber: 'C02WL3DXMD6T', assetTag: 'TT-0002',
    purchaseDate: ts('2022-01-10'), purchasePrice: 1299, lifespanYears: 4,
    assignedTo: 'Mr. Thompson — Room 105', notes: '',
  },
  {
    name: 'MacBook Pro 13"', brand: 'Apple', model: 'MBP13-M1', categoryId: 'cat-macbooks',
    status: 'maintenance', serialNumber: 'C02YP4AXMD6R', assetTag: 'TT-0003',
    purchaseDate: ts('2020-09-20'), purchasePrice: 1299, lifespanYears: 4,
    assignedTo: '', notes: 'Battery replacement in progress.',
  },
  {
    name: 'MacBook Air 15"', brand: 'Apple', model: 'MBA15-M2', categoryId: 'cat-macbooks',
    status: 'active', serialNumber: 'C03AB5LXMD6Q', assetTag: 'TT-0004',
    purchaseDate: ts('2023-06-01'), purchasePrice: 1499, lifespanYears: 4,
    assignedTo: 'Library — Desk 1', notes: '',
  },
  {
    name: 'MacBook Pro 16"', brand: 'Apple', model: 'MBP16-M2Pro', categoryId: 'cat-macbooks',
    status: 'active', serialNumber: 'C02MN8AWMD6V', assetTag: 'TT-0005',
    purchaseDate: ts('2019-11-05'), purchasePrice: 2499, lifespanYears: 5,
    assignedTo: 'IT Office', notes: 'Admin workstation. Due for replacement soon.',
  },

  // Mac Pros
  {
    name: 'Mac Pro Tower', brand: 'Apple', model: 'Mac Pro 2023', categoryId: 'cat-macpros',
    status: 'active', serialNumber: 'F2AZMP1AXMD6C', assetTag: 'TT-0006',
    purchaseDate: ts('2023-12-01'), purchasePrice: 6999, lifespanYears: 6,
    assignedTo: 'Media Lab', notes: 'Video editing workstation.',
  },
  {
    name: 'Mac Pro Rack', brand: 'Apple', model: 'Mac Pro 2019', categoryId: 'cat-macpros',
    status: 'storage', serialNumber: 'F2AZMR2BXMD6D', assetTag: 'TT-0007',
    purchaseDate: ts('2019-12-10'), purchasePrice: 5999, lifespanYears: 6,
    assignedTo: '', notes: 'Replaced by 2023 Mac Pro. In storage pending auction.',
  },

  // Chromebooks
  {
    name: 'Chromebook 314', brand: 'Acer', model: 'CB314-2H', categoryId: 'cat-chromebooks',
    status: 'active', serialNumber: 'HQ3CK0012345', assetTag: 'TT-0008',
    purchaseDate: ts('2022-08-20'), purchasePrice: 349, lifespanYears: 3,
    assignedTo: 'Classroom Set A — Unit 1', notes: '',
  },
  {
    name: 'Chromebook 314', brand: 'Acer', model: 'CB314-2H', categoryId: 'cat-chromebooks',
    status: 'active', serialNumber: 'HQ3CK0012346', assetTag: 'TT-0009',
    purchaseDate: ts('2022-08-20'), purchasePrice: 349, lifespanYears: 3,
    assignedTo: 'Classroom Set A — Unit 2', notes: '',
  },
  {
    name: 'Chromebook Plus', brand: 'HP', model: 'HP Chromebook Plus 15', categoryId: 'cat-chromebooks',
    status: 'active', serialNumber: 'HQ3CK0099001', assetTag: 'TT-0010',
    purchaseDate: ts('2024-01-15'), purchasePrice: 499, lifespanYears: 4,
    assignedTo: 'Classroom Set B — Unit 1', notes: '',
  },
  {
    name: 'Chromebook Spin 713', brand: 'Acer', model: 'CP713-3W', categoryId: 'cat-chromebooks',
    status: 'maintenance', serialNumber: 'HQ3CK0054321', assetTag: 'TT-0011',
    purchaseDate: ts('2021-03-10'), purchasePrice: 629, lifespanYears: 3,
    assignedTo: '', notes: 'Cracked screen. Awaiting repair quote.',
  },

  // Projectors
  {
    name: 'Laser Projector XL', brand: 'Epson', model: 'EB-L615U', categoryId: 'cat-projectors',
    status: 'active', serialNumber: 'EPSNL61500023', assetTag: 'TT-0012',
    purchaseDate: ts('2021-07-01'), purchasePrice: 1899, lifespanYears: 5,
    assignedTo: 'Auditorium', notes: '6000 lumens. Ceiling mounted.',
  },
  {
    name: 'Short-Throw Projector', brand: 'BenQ', model: 'MW560', categoryId: 'cat-projectors',
    status: 'active', serialNumber: 'BENQMW56000117', assetTag: 'TT-0013',
    purchaseDate: ts('2020-02-14'), purchasePrice: 699, lifespanYears: 5,
    assignedTo: 'Room 301', notes: '',
  },
  {
    name: 'Short-Throw Projector', brand: 'BenQ', model: 'MW560', categoryId: 'cat-projectors',
    status: 'active', serialNumber: 'BENQMW56000118', assetTag: 'TT-0014',
    purchaseDate: ts('2020-02-14'), purchasePrice: 699, lifespanYears: 5,
    assignedTo: 'Room 302', notes: '',
  },

  // Accessories
  {
    name: 'Magic Keyboard', brand: 'Apple', model: 'MK2C3LL/A', categoryId: 'cat-accessories',
    status: 'active', serialNumber: 'C1MGK0011122', assetTag: 'TT-0015',
    purchaseDate: ts('2023-08-15'), purchasePrice: 99, lifespanYears: 5,
    assignedTo: 'Ms. Rodriguez — Room 201', notes: 'Paired with TT-0001',
  },
  {
    name: 'USB-C Hub 7-in-1', brand: 'Anker', model: 'A8346', categoryId: 'cat-accessories',
    status: 'active', serialNumber: 'ANKR84600045', assetTag: 'TT-0016',
    purchaseDate: ts('2022-05-10'), purchasePrice: 45, lifespanYears: 3,
    assignedTo: 'IT Office', notes: '',
  },
  {
    name: 'Dell 27" Monitor', brand: 'Dell', model: 'U2722D', categoryId: 'cat-accessories',
    status: 'active', serialNumber: 'DELLU272200089', assetTag: 'TT-0017',
    purchaseDate: ts('2021-10-01'), purchasePrice: 569, lifespanYears: 6,
    assignedTo: 'Media Lab', notes: 'Connected to Mac Pro TT-0006',
  },
  {
    name: 'Magic Mouse', brand: 'Apple', model: 'MK2E3LL/A', categoryId: 'cat-accessories',
    status: 'retired', serialNumber: 'C1MMO0099831', assetTag: 'TT-0018',
    purchaseDate: ts('2018-06-01'), purchasePrice: 79, lifespanYears: 4,
    assignedTo: '', notes: 'Retired. Scroll wheel non-functional.',
  },
]

// ── Seed functions ────────────────────────────────────────────────────────────

async function seedCategories() {
  console.log('Seeding categories...')
  const batch = db.batch()
  for (const cat of CATEGORIES) {
    const ref = db.collection('categories').doc(cat.id)
    batch.set(ref, {
      name:      cat.name,
      icon:      cat.icon,
      colorKey:  cat.colorKey,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
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
      name:          asset.name,
      brand:         asset.brand,
      model:         asset.model,
      categoryId:    asset.categoryId,
      status:        asset.status,
      serialNumber:  asset.serialNumber,
      assetTag:      asset.assetTag,
      purchaseDate:  asset.purchaseDate,
      purchasePrice: asset.purchasePrice,
      lifespanYears: asset.lifespanYears,
      assignedTo:    asset.assignedTo,
      notes:         asset.notes,
      isDeleted:     false,
      createdAt:     now,
      updatedAt:     now,
    })
  }
  await batch.commit()
  console.log(`  ✓ ${ASSETS.length} assets written`)
}

// ── Run ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\nTechTrack seed starting...\n')
  await seedCategories()
  await seedAssets()
  console.log('\nDone! All collections seeded.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
