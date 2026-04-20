/**
 * TechTrack — Users seed script (Demo branch)
 *
 * Creates two Firebase Auth accounts + Firestore profiles:
 *   • superAdmin  danielsantacruz0288@gmail.com
 *   • demo        demo@techtrack.app
 *
 * Usage (from project root):
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json node scripts/seedUsers.cjs
 *
 * If a user already exists in Auth the script reuses their UID and
 * overwrites the Firestore profile (safe to run multiple times).
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const admin = require('../functions/node_modules/firebase-admin')

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
if (!credPath) {
  console.error('\nError: GOOGLE_APPLICATION_CREDENTIALS is not set.')
  console.error('Get a key at: Firebase Console → Project Settings → Service accounts → Generate new private key')
  console.error('Then run: GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json node scripts/seedUsers.cjs\n')
  process.exit(1)
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const serviceAccount = require(credPath)
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })

const auth = admin.auth()
const db   = admin.firestore()

// ── User definitions ─────────────────────────────────────────────────────────

const USERS = [
  {
    email:       'danielsantacruz0288@gmail.com',
    displayName: 'Daniel Santa Cruz',
    password:    'TechTrack2024!',
    role:        'superAdmin',
  },
  {
    email:       'demo@techtrack.app',
    displayName: 'Demo User',
    password:    'userdemo123',
    role:        'demo',
  },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getOrCreateAuthUser({ email, displayName, password }) {
  try {
    const existing = await auth.getUserByEmail(email)
    await auth.updateUser(existing.uid, { displayName, password })
    console.log(`  → Auth user updated: ${email} (uid: ${existing.uid})`)
    return existing.uid
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err
    const created = await auth.createUser({ email, displayName, password })
    console.log(`  ✓ Auth user created: ${email} (uid: ${created.uid})`)
    return created.uid
  }
}

async function setFirestoreProfile(uid, { email, displayName, role }) {
  await db.collection('users').doc(uid).set({
    uid,
    email,
    displayName,
    role,
    isActive:    true,
    permissions: [],
    createdAt:   admin.firestore.FieldValue.serverTimestamp(),
    updatedAt:   admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true })
  console.log(`  ✓ Firestore profile set for ${email} — role: ${role}`)
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\nTechTrack — seeding demo users...\n')

  for (const user of USERS) {
    console.log(`Processing: ${user.email}`)
    const uid = await getOrCreateAuthUser(user)
    await setFirestoreProfile(uid, user)
    console.log()
  }

  console.log('Done! Users seeded.\n')
  console.log('Credentials:')
  for (const user of USERS) {
    console.log(`  ${user.role.padEnd(12)} ${user.email}  /  ${user.password}`)
  }
  console.log('\nRemember to change passwords after first login.\n')

  process.exit(0)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
