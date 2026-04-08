import { useState } from 'react'
import { Button } from 'primereact/button'
import { collection, doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '../firebase/config'

// ── Helpers ───────────────────────────────────────────────────────────────────
const ts  = (dateStr: string) => Timestamp.fromDate(new Date(dateStr))
const now = () => serverTimestamp()

// ── Categories (15 from prototype) ───────────────────────────────────────────
const CATEGORIES = [
  { id: 'mac', name: 'MacBooks', icon: 'pi pi-desktop', colorKey: 'blue',
    subcategories: ['MacBook Air', 'MacBook Pro 13"', 'MacBook Pro 14"', 'MacBook Pro 16"'],
    careTasks: [
      { id: 'mac_1', task: 'Clean screen & keyboard', freq: 'monthly',   description: 'Use microfiber cloth' },
      { id: 'mac_2', task: 'Software updates',        freq: 'monthly',   description: '' },
      { id: 'mac_3', task: 'Battery health check',    freq: 'quarterly', description: '' },
      { id: 'mac_4', task: 'Full backup check',       freq: 'quarterly', description: '' },
    ] },
  { id: 'macpro', name: 'Mac Pros', icon: 'pi pi-server', colorKey: 'blue',
    subcategories: ['Mac Pro', 'Mac Mini', 'Mac Studio'],
    careTasks: [
      { id: 'macpro_1', task: 'Dust interior / clean vents', freq: 'quarterly', description: '' },
      { id: 'macpro_2', task: 'Software & firmware updates',  freq: 'monthly',   description: '' },
      { id: 'macpro_3', task: 'Run diagnostics',              freq: 'annually',  description: '' },
    ] },
  { id: 'ipad', name: 'iPads', icon: 'pi pi-tablet', colorKey: 'purple',
    subcategories: ['iPad (Standard)', 'iPad Air', 'iPad Pro 11"', 'iPad Pro 12.9"', 'iPad Mini'],
    careTasks: [
      { id: 'ipad_1', task: 'Clean screen & body',         freq: 'monthly',   description: '' },
      { id: 'ipad_2', task: 'iOS updates',                 freq: 'monthly',   description: '' },
      { id: 'ipad_3', task: 'Battery health check',        freq: 'quarterly', description: '' },
      { id: 'ipad_4', task: 'Case/screen protector check', freq: 'quarterly', description: '' },
    ] },
  { id: 'chromebook', name: 'Chromebooks', icon: 'pi pi-book', colorKey: 'green',
    subcategories: ['HP Chromebook', 'Lenovo Chromebook', 'Dell Chromebook', 'Acer Chromebook', 'Samsung Chromebook'],
    careTasks: [
      { id: 'cb_1', task: 'Clean screen & keyboard', freq: 'monthly',   description: '' },
      { id: 'cb_2', task: 'ChromeOS updates',        freq: 'monthly',   description: '' },
      { id: 'cb_3', task: 'Battery health check',    freq: 'quarterly', description: '' },
    ] },
  { id: 'chargingcart', name: 'Charging Carts', icon: 'pi pi-bolt', colorKey: 'yellow',
    subcategories: ['Laptop Cart', 'iPad Cart', 'Chromebook Cart', 'Mixed Device Cart'],
    careTasks: [
      { id: 'cart_1', task: 'Check cables & connections',  freq: 'monthly',   description: '' },
      { id: 'cart_2', task: 'Clean interior',              freq: 'quarterly', description: '' },
      { id: 'cart_3', task: 'Inspect wheels & locks',      freq: 'quarterly', description: '' },
      { id: 'cart_4', task: 'Test charging for all slots', freq: 'monthly',   description: '' },
    ] },
  { id: 'projector', name: 'Projectors', icon: 'pi pi-video', colorKey: 'purple',
    subcategories: ['Epson BrightLink', 'Epson PowerLite', 'BenQ', 'Sony', 'Optoma'],
    careTasks: [
      { id: 'proj_1', task: 'Clean lens',       freq: 'monthly',   description: 'Use lens cloth only' },
      { id: 'proj_2', task: 'Check lamp hours', freq: 'monthly',   description: 'Replace at 4000hrs normal / 6000hrs eco' },
      { id: 'proj_3', task: 'Clean air filter', freq: 'quarterly', description: '' },
      { id: 'proj_4', task: 'Dust vents',       freq: 'quarterly', description: '' },
    ] },
  { id: 'printer', name: 'Printers', icon: 'pi pi-print', colorKey: 'blue',
    subcategories: ['Laser Printer', 'Inkjet Printer', 'Label Printer', 'Wide Format', 'Copier/MFP'],
    careTasks: [
      { id: 'prt_1', task: 'Clean heads / rollers',  freq: 'monthly',   description: '' },
      { id: 'prt_2', task: 'Check toner/ink levels', freq: 'weekly',    description: '' },
      { id: 'prt_3', task: 'Firmware update',        freq: 'quarterly', description: '' },
      { id: 'prt_4', task: 'Full cleaning cycle',    freq: 'quarterly', description: '' },
    ] },
  { id: 'network', name: 'Network', icon: 'pi pi-wifi', colorKey: 'cyan',
    subcategories: ['Unifi Access Point', 'Unifi Switch', 'Unifi Gateway', 'Firewall', 'Router', 'Patch Panel'],
    careTasks: [
      { id: 'net_1', task: 'Firmware updates',         freq: 'quarterly', description: '' },
      { id: 'net_2', task: 'Check indicator lights',   freq: 'monthly',   description: '' },
      { id: 'net_3', task: 'Review connected devices', freq: 'quarterly', description: '' },
      { id: 'net_4', task: 'Reboot/power cycle',       freq: 'quarterly', description: '' },
    ] },
  { id: 'security', name: 'Security / Cameras', icon: 'pi pi-camera', colorKey: 'orange',
    subcategories: ['Hikvision', 'Dahua', 'Axis', 'NVR/DVR', 'Door Access', 'Intercom'],
    careTasks: [
      { id: 'sec_1', task: 'Clean camera lenses',        freq: 'monthly',   description: '' },
      { id: 'sec_2', task: 'Check recording continuity', freq: 'monthly',   description: '' },
      { id: 'sec_3', task: 'Firmware updates',           freq: 'quarterly', description: '' },
      { id: 'sec_4', task: 'Test motion detection',      freq: 'quarterly', description: '' },
    ] },
  { id: 'power', name: 'Power / UPS', icon: 'pi pi-database', colorKey: 'yellow',
    subcategories: ['Smart-UPS', 'Back-UPS', 'PDU', 'Generator', 'Surge Protector'],
    careTasks: [
      { id: 'pwr_1', task: 'Self-test run',        freq: 'monthly',   description: 'Most UPS have a self-test button' },
      { id: 'pwr_2', task: 'Battery health check', freq: 'quarterly', description: '' },
      { id: 'pwr_3', task: 'Replace battery',      freq: 'annually',  description: 'Check manufacturer schedule' },
      { id: 'pwr_4', task: 'Inspect connections',  freq: 'quarterly', description: '' },
    ] },
  { id: 'av', name: 'AV / PA', icon: 'pi pi-headphones', colorKey: 'purple',
    subcategories: ['PA System', 'Amplifier', 'Speaker', 'Microphone', 'AV Receiver', 'Mixer'],
    careTasks: [
      { id: 'av_1', task: 'Clean speakers & grilles',   freq: 'quarterly', description: '' },
      { id: 'av_2', task: 'Check cables & connections', freq: 'monthly',   description: '' },
      { id: 'av_3', task: 'Test full system',            freq: 'monthly',   description: '' },
      { id: 'av_4', task: 'Firmware update',             freq: 'annually',  description: '' },
    ] },
  { id: 'hvac', name: 'HVAC / Climate', icon: 'pi pi-sun', colorKey: 'cyan',
    subcategories: ['Ductless Split System', 'Window AC', 'Portable AC', 'ERV System', 'Boiler', 'HVAC Unit', 'Thermostat'],
    careTasks: [
      { id: 'hvac_1', task: 'Replace/clean air filter',  freq: 'monthly',   description: '' },
      { id: 'hvac_2', task: 'Clean coils',               freq: 'quarterly', description: '' },
      { id: 'hvac_3', task: 'Inspect refrigerant lines', freq: 'annually',  description: '' },
      { id: 'hvac_4', task: 'Professional service',      freq: 'annually',  description: 'Pre-season recommended' },
      { id: 'hvac_5', task: 'Clean condensate drain',    freq: 'quarterly', description: '' },
    ] },
  { id: 'facilities', name: 'Facilities Equipment', icon: 'pi pi-building', colorKey: 'orange',
    subcategories: ['Floor Machine', 'Leaf Blower', 'Snowblower', 'Pressure Washer', 'Wet/Dry Vac', 'Generator'],
    careTasks: [
      { id: 'fac_1', task: 'Clean after each use',   freq: 'asneeded',  description: '' },
      { id: 'fac_2', task: 'Inspect blades / belts', freq: 'monthly',   description: '' },
      { id: 'fac_3', task: 'Oil / lubricate',        freq: 'quarterly', description: '' },
      { id: 'fac_4', task: 'Tune-up / service',      freq: 'annually',  description: 'Pre-season' },
    ] },
  { id: 'powertools', name: 'Power Tools', icon: 'pi pi-wrench', colorKey: 'red',
    subcategories: ['Drill', 'Circular Saw', 'Reciprocating Saw', 'Grinder', 'Sander', 'Impact Driver', 'Jigsaw'],
    careTasks: [
      { id: 'pt_1', task: 'Inspect cords & guards',      freq: 'monthly',   description: '' },
      { id: 'pt_2', task: 'Clean & lubricate',           freq: 'quarterly', description: '' },
      { id: 'pt_3', task: 'Blade/bit replacement check', freq: 'monthly',   description: '' },
      { id: 'pt_4', task: 'Annual service',              freq: 'annually',  description: '' },
    ] },
  { id: 'accessory', name: 'Accessories', icon: 'pi pi-box', colorKey: 'blue',
    subcategories: ['Keyboard', 'Mouse', 'Hub/Dock', 'Cable', 'Monitor', 'Headphones', 'Stylus/Pen', 'Case/Cover'],
    careTasks: [
      { id: 'acc_1', task: 'Clean & inspect',    freq: 'quarterly', description: '' },
      { id: 'acc_2', task: 'Replace worn items', freq: 'asneeded',  description: '' },
    ] },
]

// ── Assets (exact 18 from prototype) ─────────────────────────────────────────
const ASSETS = [
  { id: 'a01', name: 'MacBook Pro 14" — Room 101',     brand: 'Apple',     model: 'MacBook Pro M3 Pro',          categoryId: 'mac',          subcategoryId: 'MacBook Pro 14"',      school: 'school_a', status: 'active',  serialNumber: 'C02XK1LF1GH5', assetTag: '',  purchaseDate: '2023-04-05', purchasePrice: 1999, estimatedValue: 1999, lifespanYears: 4,  warrantyExpiry: null,         assignedTo: 'Ms. Torres',  location: 'Room 101',       notes: '' },
  { id: 'a02', name: 'iPad Pro — Cart A #01',           brand: 'Apple',     model: 'iPad Pro M2 11"',             categoryId: 'ipad',         subcategoryId: 'iPad Pro 11"',         school: 'school_a', status: 'active',  serialNumber: 'DMPH01A123',    assetTag: '',  purchaseDate: '2025-04-05', purchasePrice: 799,  estimatedValue: 799,  lifespanYears: 5,  warrantyExpiry: null,         assignedTo: 'Cart A',      location: 'Library',        notes: '' },
  { id: 'a03', name: 'Chromebook Cart 1 — Library',    brand: 'Bretford',  model: 'Chromebook Cart 36',          categoryId: 'chargingcart', subcategoryId: 'Chromebook Cart',      school: 'school_a', status: 'active',  serialNumber: 'CC-LIB-001',    assetTag: '',  purchaseDate: '2024-04-05', purchasePrice: 1200, estimatedValue: 1200, lifespanYears: 10, warrantyExpiry: null,         assignedTo: 'Library',     location: 'Library',        notes: '36 slot' },
  { id: 'a04', name: 'Epson BrightLink 595Wi — Room 204', brand: 'Epson',  model: 'Epson BrightLink 595Wi',      categoryId: 'projector',    subcategoryId: 'Epson BrightLink',     school: 'school_a', status: 'active',  serialNumber: 'EPX2247204',    assetTag: '',  purchaseDate: '2021-07-01', purchasePrice: 1799, estimatedValue: 1799, lifespanYears: 7,  warrantyExpiry: null,         assignedTo: 'Room 204',    location: 'Room 204',       notes: 'Lamp hours: 3200' },
  { id: 'a05', name: 'HP LaserJet Pro — Office',        brand: 'HP',        model: 'HP LaserJet Pro M404dn',      categoryId: 'printer',      subcategoryId: 'Laser Printer',        school: 'school_a', status: 'active',  serialNumber: 'VNB3M03217',    assetTag: '',  purchaseDate: '2024-04-05', purchasePrice: 450,  estimatedValue: 450,  lifespanYears: 6,  warrantyExpiry: null,         assignedTo: 'Main Office', location: 'Main Office',    notes: '' },
  { id: 'a06', name: 'Unifi AP — Gym',                  brand: 'Ubiquiti',  model: 'UniFi U6-LR',                 categoryId: 'network',      subcategoryId: 'Unifi Access Point',   school: 'school_a', status: 'active',  serialNumber: '789ABC123',     assetTag: '',  purchaseDate: '2024-10-05', purchasePrice: 199,  estimatedValue: 199,  lifespanYears: 7,  warrantyExpiry: null,         assignedTo: 'IT Dept',     location: 'Gymnasium',      notes: '' },
  { id: 'a07', name: 'Firewall — Server Room',           brand: 'Fortinet',  model: 'Fortinet FortiGate 60F',      categoryId: 'network',      subcategoryId: 'Firewall',             school: 'school_a', status: 'active',  serialNumber: 'FG60FTK22',     assetTag: '',  purchaseDate: '2024-04-05', purchasePrice: 895,  estimatedValue: 895,  lifespanYears: 5,  warrantyExpiry: null,         assignedTo: 'IT Dept',     location: 'Server Room',    notes: '' },
  { id: 'a08', name: 'Hikvision NVR — Security',        brand: 'Hikvision', model: 'Hikvision DS-7716NI-K4',      categoryId: 'security',     subcategoryId: 'NVR/DVR',              school: 'school_a', status: 'active',  serialNumber: 'HIK7716001',    assetTag: '',  purchaseDate: '2023-04-05', purchasePrice: 600,  estimatedValue: 600,  lifespanYears: 7,  warrantyExpiry: null,         assignedTo: 'Facilities',  location: 'Security Office',notes: '16 channel' },
  { id: 'a09', name: 'Hikvision Camera — Entrance',     brand: 'Hikvision', model: 'Hikvision DS-2CD2347G2',      categoryId: 'security',     subcategoryId: 'Hikvision',            school: 'school_b', status: 'active',  serialNumber: 'HIK-CAM-ENT',   assetTag: '',  purchaseDate: '2023-04-05', purchasePrice: 180,  estimatedValue: 180,  lifespanYears: 7,  warrantyExpiry: null,         assignedTo: 'Facilities',  location: 'Main Entrance',  notes: '4MP outdoor' },
  { id: 'a10', name: 'Smart-UPS 1500 — Server Room',    brand: 'APC',       model: 'APC Smart-UPS 1500VA',        categoryId: 'power',        subcategoryId: 'Smart-UPS',            school: 'school_b', status: 'active',  serialNumber: 'AS1805001',     assetTag: '',  purchaseDate: '2022-04-05', purchasePrice: 750,  estimatedValue: 750,  lifespanYears: 6,  warrantyExpiry: null,         assignedTo: 'IT Dept',     location: 'Server Room',    notes: 'Battery replaced 2023' },
  { id: 'a11', name: 'PA System — Auditorium',           brand: 'QSC',       model: 'QSC K12.2 System',            categoryId: 'av',           subcategoryId: 'PA System',            school: 'school_b', status: 'active',  serialNumber: 'QSCPA2024',     assetTag: '',  purchaseDate: '2023-04-05', purchasePrice: 2400, estimatedValue: 2400, lifespanYears: 10, warrantyExpiry: null,         assignedTo: 'Facilities',  location: 'Auditorium',     notes: '' },
  { id: 'a12', name: 'Ductless Split — Gym',             brand: 'Mitsubishi',model: 'Mitsubishi MXZ-4C36',         categoryId: 'hvac',         subcategoryId: 'Ductless Split System', school: 'school_b', status: 'active',  serialNumber: 'MSY36GYM',      assetTag: '',  purchaseDate: '2021-04-05', purchasePrice: 3200, estimatedValue: 3200, lifespanYears: 15, warrantyExpiry: null,         assignedTo: 'Facilities',  location: 'Gymnasium',      notes: 'Annual service due' },
  { id: 'a13', name: 'Window AC — Room 105',             brand: 'LG',        model: 'LG LW8017ERSM',               categoryId: 'hvac',         subcategoryId: 'Window AC',            school: 'school_b', status: 'storage', serialNumber: 'LG-AC-105',     assetTag: '',  purchaseDate: '2023-04-05', purchasePrice: 350,  estimatedValue: 350,  lifespanYears: 10, warrantyExpiry: null,         assignedTo: 'Unassigned',  location: 'Storage',        notes: 'Stored off-season' },
  { id: 'a14', name: 'ERV System — Main Building',       brand: 'Renewaire', model: 'Renewaire EV90',              categoryId: 'hvac',         subcategoryId: 'ERV System',           school: 'school_b', status: 'active',  serialNumber: 'ERV-MAIN-01',   assetTag: '',  purchaseDate: '2022-04-05', purchasePrice: 4500, estimatedValue: 4500, lifespanYears: 20, warrantyExpiry: null,         assignedTo: 'Facilities',  location: 'Mechanical Room',notes: '' },
  { id: 'a15', name: 'Floor Scrubber — Facilities',      brand: 'Tennant',   model: 'Tennant T5e',                 categoryId: 'facilities',   subcategoryId: 'Floor Machine',        school: 'school_b', status: 'active',  serialNumber: 'TEN5E2021',     assetTag: '',  purchaseDate: '2024-04-05', purchasePrice: 3500, estimatedValue: 3500, lifespanYears: 8,  warrantyExpiry: null,         assignedTo: 'Custodial',   location: 'Custodial Closet',notes: '' },
  { id: 'a16', name: 'Leaf Blower — Grounds',            brand: 'ECHO',      model: 'ECHO PB-770T',                categoryId: 'facilities',   subcategoryId: 'Leaf Blower',          school: 'school_a', status: 'active',  serialNumber: 'ECHO2023LB',    assetTag: '',  purchaseDate: '2025-04-05', purchasePrice: 480,  estimatedValue: 480,  lifespanYears: 7,  warrantyExpiry: null,         assignedTo: 'Grounds',     location: 'Equipment Shed', notes: '' },
  { id: 'a17', name: 'Snowblower — Grounds',             brand: 'Ariens',    model: 'Ariens Deluxe 30"',           categoryId: 'facilities',   subcategoryId: 'Snowblower',           school: 'school_a', status: 'storage', serialNumber: 'ARI2022SB',     assetTag: '',  purchaseDate: '2024-04-05', purchasePrice: 1200, estimatedValue: 1200, lifespanYears: 12, warrantyExpiry: null,         assignedTo: 'Grounds',     location: 'Equipment Shed', notes: 'Pre-season service needed' },
  { id: 'a18', name: 'Cordless Drill Set — Maintenance', brand: 'DeWalt',    model: 'DeWalt DCK299P2',             categoryId: 'powertools',   subcategoryId: 'Drill',                school: 'school_b', status: 'active',  serialNumber: 'DW-DRILL-01',   assetTag: '',  purchaseDate: '2025-04-05', purchasePrice: 350,  estimatedValue: 350,  lifespanYears: 6,  warrantyExpiry: null,         assignedTo: 'Maintenance', location: 'Maintenance Shop',notes: '2-pack kit' },
]

// ── Work Orders (exact 4 from prototype) ─────────────────────────────────────
const WORK_ORDERS = [
  { id: 'wo01', title: 'Replace HVAC filter — Gymnasium',         category: 'Maintenance', priority: 'high',   status: 'open',       assignedTo: 'Facilities Dept', assetId: 'a12', dueDate: '2026-04-08', notes: 'Monthly filter replacement due. Order filters from supplier.' },
  { id: 'wo02', title: 'Projector lamp replacement — Room 204',   category: 'Repair',      priority: 'medium', status: 'inprogress', assignedTo: 'IT Dept',         assetId: 'a04', dueDate: '2026-04-12', notes: 'Lamp hours exceeded 3200. Replacement lamp ordered.' },
  { id: 'wo03', title: 'Snowblower pre-season tune-up',           category: 'Maintenance', priority: 'low',    status: 'open',       assignedTo: 'Grounds',         assetId: 'a17', dueDate: '2026-05-05', notes: 'Annual pre-season service before first snowfall.' },
  { id: 'wo04', title: 'UPS battery self-test — Server Room',     category: 'Inspection',  priority: 'medium', status: 'completed',  assignedTo: 'IT Dept',         assetId: 'a10', dueDate: '2026-03-29', notes: 'Monthly self-test completed. Battery health 94%.' },
]

// ── IT Tickets ────────────────────────────────────────────────────────────────
const IT_TICKETS = [
  { id: 'it01', title: 'MacBook not connecting to school WiFi',   category: 'network',  priority: 'high',     status: 'open',       reportedBy: 'Ms. Torres',      location: 'Room 101',        assetId: 'a01', description: 'MacBook Pro can see the network but fails to authenticate.' },
  { id: 'it02', title: 'Projector display flickering',            category: 'hardware', priority: 'critical', status: 'inprogress', reportedBy: 'Room 204 Teacher', location: 'Room 204',        assetId: 'a04', description: 'Display flickers intermittently during presentations.' },
  { id: 'it03', title: 'iPad app not updating from MDM',          category: 'software', priority: 'medium',   status: 'open',       reportedBy: 'Library Staff',   location: 'Library',         assetId: 'a02', description: 'Mosyle MDM push not installing new apps on iPad Pro.' },
  { id: 'it04', title: 'Printer offline — cannot print',          category: 'printer',  priority: 'high',     status: 'resolved',   reportedBy: 'Office Staff',    location: 'Main Office',     assetId: 'a05', description: 'HP LaserJet shows offline in print queue. Fixed by reinstalling driver.' },
  { id: 'it05', title: 'Chromebook cart slot not charging',       category: 'hardware', priority: 'medium',   status: 'open',       reportedBy: 'Teacher Aide',    location: 'Library',         assetId: 'a03', description: 'Slot #12 in Chromebook Cart not providing power.' },
  { id: 'it06', title: 'Student account password reset',          category: 'account',  priority: 'low',      status: 'resolved',   reportedBy: 'School Secretary',location: 'Main Office',     assetId: '',    description: 'Student forgot Google account password. Reset via admin console.' },
  { id: 'it07', title: 'Firewall alert — unusual traffic',        category: 'network',  priority: 'critical', status: 'inprogress', reportedBy: 'IT Dept',         location: 'Server Room',     assetId: 'a07', description: 'FortiGate flagged unusual outbound traffic on port 4444.' },
  { id: 'it08', title: 'Camera recording gap detected',           category: 'setup',    priority: 'high',     status: 'open',       reportedBy: 'Facilities',      location: 'Main Entrance',   assetId: 'a09', description: 'NVR shows 2-hour gap in recording from 2am–4am on April 1st.' },
  { id: 'it09', title: 'PA system feedback noise',                category: 'hardware', priority: 'low',      status: 'closed',     reportedBy: 'Facilities',      location: 'Auditorium',      assetId: 'a11', description: 'High-pitched feedback during morning announcements. Resolved by adjusting gain.' },
]

// ── Inventory ─────────────────────────────────────────────────────────────────
const INVENTORY = [
  { id: 'inv01', name: 'Lightning to USB Cables',     categoryId: 'accessory', unit: 'cable',     inStock: 24, lowStockThreshold: 5,  notes: 'For iPad charging' },
  { id: 'inv02', name: 'USB-C Charging Cables (6ft)', categoryId: 'accessory', unit: 'cable',     inStock: 18, lowStockThreshold: 5,  notes: 'MacBook & Chromebook' },
  { id: 'inv03', name: 'Projector Lamp — Epson 695', categoryId: 'projector',  unit: 'lamp',      inStock: 2,  lowStockThreshold: 2,  notes: 'ELPLP96 replacement lamp' },
  { id: 'inv04', name: 'HP LaserJet Toner (CF258A)',  categoryId: 'printer',    unit: 'cartridge', inStock: 3,  lowStockThreshold: 2,  notes: 'Black toner for M404n' },
  { id: 'inv05', name: 'HVAC Air Filters 16x25x1',   categoryId: 'hvac',       unit: 'filter',    inStock: 12, lowStockThreshold: 4,  notes: 'MERV 11 rated' },
  { id: 'inv06', name: 'iPad Screen Protectors',      categoryId: 'ipad',       unit: 'piece',     inStock: 30, lowStockThreshold: 10, notes: 'Fits iPad Pro 11" and Air' },
  { id: 'inv07', name: 'Microfiber Cleaning Cloths',  categoryId: 'accessory',  unit: 'pack',      inStock: 8,  lowStockThreshold: 3,  notes: '10-pack boxes' },
  { id: 'inv08', name: 'AA Batteries',                categoryId: 'accessory',  unit: 'pack',      inStock: 6,  lowStockThreshold: 4,  notes: '24-count packs for keyboards/mice' },
  { id: 'inv09', name: 'Cat6 Ethernet Cable 10ft',   categoryId: 'network',    unit: 'cable',     inStock: 15, lowStockThreshold: 5,  notes: 'Patch cables for network closet' },
  { id: 'inv10', name: 'iPad Cases (11" Pro)',        categoryId: 'ipad',       unit: 'case',      inStock: 7,  lowStockThreshold: 5,  notes: 'Rugged student cases' },
  { id: 'inv11', name: 'UPS Replacement Battery',    categoryId: 'power',      unit: 'battery',   inStock: 1,  lowStockThreshold: 1,  notes: 'APC RBC48 compatible' },
  { id: 'inv12', name: 'Wireless Keyboard & Mouse',  categoryId: 'accessory',  unit: 'set',       inStock: 4,  lowStockThreshold: 2,  notes: 'Spare sets for desktop labs' },
]

// ── Map Rooms ─────────────────────────────────────────────────────────────────
const MAP_ROOMS = [
  { id: 'room01', label: 'Room 101 — Grade 5',  icon: '🏫', color: 'blue',   floor: 'Floor 1', x: 20,  y: 20,  w: 160, h: 90 },
  { id: 'room02', label: 'Room 204 — Science',  icon: '🔬', color: 'green',  floor: 'Floor 2', x: 200, y: 20,  w: 160, h: 90 },
  { id: 'room03', label: 'Art Room',            icon: '🎨', color: 'purple', floor: 'Floor 1', x: 20,  y: 130, w: 140, h: 80 },
  { id: 'room04', label: 'Library',             icon: '📚', color: 'blue',   floor: 'Floor 1', x: 180, y: 130, w: 180, h: 80 },
  { id: 'room05', label: 'Tech Lab',            icon: '💻', color: 'blue',   floor: 'Floor 2', x: 20,  y: 230, w: 160, h: 90 },
  { id: 'room06', label: 'Main Office',         icon: '🏢', color: 'orange', floor: 'Floor 1', x: 380, y: 20,  w: 140, h: 80 },
  { id: 'room07', label: 'Auditorium',          icon: '🎭', color: 'purple', floor: 'Floor 1', x: 380, y: 120, w: 200, h: 120 },
  { id: 'room08', label: 'Server Room',         icon: '🖥',  color: 'blue',   floor: 'Floor 1', x: 200, y: 230, w: 120, h: 70 },
]

// ── Settings ──────────────────────────────────────────────────────────────────
const SETTINGS = {
  appTitle:    'TechTrack',
  appSubtitle: 'Asset Management',
  schoolAName: 'Lincoln Elementary',
  schoolBName: 'Roosevelt Middle School',
}

// ── Component ─────────────────────────────────────────────────────────────────
type Status = 'idle' | 'running' | 'done' | 'error'

interface Section {
  key:  string
  name: string
  count: number
}

const SECTIONS: Section[] = [
  { key: 'categories', name: 'Categories',  count: CATEGORIES.length  },
  { key: 'assets',     name: 'Assets',      count: ASSETS.length      },
  { key: 'workOrders', name: 'Work Orders', count: WORK_ORDERS.length },
  { key: 'tickets',    name: 'IT Tickets',  count: IT_TICKETS.length  },
  { key: 'inventory',  name: 'Inventory',   count: INVENTORY.length   },
  { key: 'mapRooms',   name: 'Map Rooms',   count: MAP_ROOMS.length   },
  { key: 'settings',   name: 'Settings',    count: 1                  },
]

const SeedPage = () => {
  const [status, setStatus]     = useState<Status>('idle')
  const [log, setLog]           = useState<string[]>([])
  const [progress, setProgress] = useState(0)
  const [total, setTotal]       = useState(0)
  const [done, setDone]         = useState(0)

  const addLog = (msg: string) => setLog(p => [...p, msg])

  const runSeed = async () => {
    setStatus('running')
    setLog([])

    const totalItems = SECTIONS.reduce((s, sec) => s + sec.count, 0)
    setTotal(totalItems)
    let completed = 0

    const tick = () => { completed++; setDone(completed); setProgress(Math.round((completed / totalItems) * 100)) }
    let errors = 0

    try {
      // 1. Categories
      addLog('📂 Seeding Categories…')
      for (const cat of CATEGORIES) {
        try {
          await setDoc(doc(collection(db, 'categories'), cat.id), {
            name: cat.name, icon: cat.icon, colorKey: cat.colorKey,
            subcategories: cat.subcategories, careTasks: cat.careTasks,
            isDeleted: false, createdAt: now(), updatedAt: now(),
          })
          tick()
        } catch (e) { addLog(`  ❌ ${cat.name}: ${(e as Error).message}`); errors++; tick() }
      }
      addLog(`  ✅ ${CATEGORIES.length} categories seeded`)

      // 2. Assets
      addLog('📦 Seeding Assets…')
      for (const a of ASSETS) {
        try {
          await setDoc(doc(collection(db, 'assets'), a.id), {
            name: a.name, brand: a.brand, model: a.model,
            categoryId: a.categoryId, subcategoryId: a.subcategoryId ?? '',
            school: a.school, status: a.status,
            serialNumber: a.serialNumber, assetTag: a.assetTag,
            purchaseDate: ts(a.purchaseDate),
            purchasePrice: a.purchasePrice, estimatedValue: a.estimatedValue,
            lifespanYears: a.lifespanYears,
            warrantyExpiry: a.warrantyExpiry ? ts(a.warrantyExpiry) : null,
            assignedTo: a.assignedTo, location: a.location, notes: a.notes,
            careCompletions: {}, isDeleted: false, createdAt: now(), updatedAt: now(),
          })
          tick()
        } catch (e) { addLog(`  ❌ ${a.name}: ${(e as Error).message}`); errors++; tick() }
      }
      addLog(`  ✅ ${ASSETS.length} assets seeded`)

      // 3. Work Orders
      addLog('📋 Seeding Work Orders…')
      for (const wo of WORK_ORDERS) {
        try {
          await setDoc(doc(db, 'workOrders', wo.id), {
            title: wo.title, category: wo.category, priority: wo.priority,
            status: wo.status, assignedTo: wo.assignedTo,
            assetId: wo.assetId, notes: wo.notes,
            dueDate: ts(wo.dueDate),
            createdAt: now(), updatedAt: now(),
          })
          tick()
        } catch (e) { addLog(`  ❌ ${wo.title}: ${(e as Error).message}`); errors++; tick() }
      }
      addLog(`  ✅ ${WORK_ORDERS.length} work orders seeded`)

      // 4. IT Tickets
      addLog('🎫 Seeding IT Tickets…')
      for (const t of IT_TICKETS) {
        try {
          await setDoc(doc(db, 'itTickets', t.id), {
            title: t.title, category: t.category, priority: t.priority,
            status: t.status, reportedBy: t.reportedBy,
            location: t.location, assetId: t.assetId, description: t.description,
            createdAt: now(), updatedAt: now(),
          })
          tick()
        } catch (e) { addLog(`  ❌ ${t.title}: ${(e as Error).message}`); errors++; tick() }
      }
      addLog(`  ✅ ${IT_TICKETS.length} IT tickets seeded`)

      // 5. Inventory
      addLog('🗃 Seeding Inventory…')
      for (const item of INVENTORY) {
        try {
          await setDoc(doc(db, 'inventory', item.id), {
            name: item.name, categoryId: item.categoryId, unit: item.unit,
            inStock: item.inStock, lowStockThreshold: item.lowStockThreshold,
            notes: item.notes, isDeleted: false, createdAt: now(), updatedAt: now(),
          })
          tick()
        } catch (e) { addLog(`  ❌ ${item.name}: ${(e as Error).message}`); errors++; tick() }
      }
      addLog(`  ✅ ${INVENTORY.length} inventory items seeded`)

      // 6. Map Rooms
      addLog('🗺 Seeding Map Rooms…')
      for (const room of MAP_ROOMS) {
        try {
          await setDoc(doc(db, 'mapRooms', room.id), {
            label: room.label, icon: room.icon, color: room.color,
            floor: room.floor, x: room.x, y: room.y, w: room.w, h: room.h,
            createdAt: now(),
          })
          tick()
        } catch (e) { addLog(`  ❌ ${room.label}: ${(e as Error).message}`); errors++; tick() }
      }
      addLog(`  ✅ ${MAP_ROOMS.length} map rooms seeded`)

      // 7. Settings
      addLog('⚙️ Seeding Settings…')
      try {
        await setDoc(doc(db, 'settings', 'app'), { ...SETTINGS, updatedAt: now() })
        addLog('  ✅ App settings saved')
        tick()
      } catch (e) { addLog(`  ❌ Settings: ${(e as Error).message}`); errors++; tick() }

    } catch (e) {
      addLog(`\n💥 Fatal error: ${(e as Error).message}`)
      setStatus('error')
      return
    }

    if (errors === 0) {
      addLog(`\n🎉 All ${totalItems} records seeded successfully!`)
      setStatus('done')
    } else {
      addLog(`\n⚠️ Completed with ${errors} error(s). Check Firestore rules if needed.`)
      setStatus('error')
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="font-serif text-2xl font-bold text-900 mb-1">🌱 Seed Database</div>
      <p className="text-sm mb-4" style={{ color: 'var(--text-color-secondary)' }}>
        Populates all Firestore collections with realistic demo data. Existing documents with the same ID will be overwritten.
      </p>

      {/* Sections preview */}
      {status === 'idle' && (
        <div className="flex flex-column gap-3">
          <div className="surface-card border-round-xl p-4 border-1 border-white-alpha-10">
            <div className="font-mono text-xs text-500 uppercase mb-3" style={{ letterSpacing: 2 }}>What will be seeded</div>
            <div className="flex flex-column gap-2">
              {SECTIONS.map(s => (
                <div key={s.key} className="flex align-items-center justify-content-between">
                  <span className="text-sm">{s.name}</span>
                  <span className="font-mono text-xs surface-hover border-round px-2 py-1" style={{ color: 'var(--text-color-secondary)' }}>{s.count} records</span>
                </div>
              ))}
              <div className="border-top-1 border-white-alpha-10 mt-1 pt-2 flex justify-content-between">
                <span className="text-sm font-semibold">Total</span>
                <span className="font-mono text-xs font-semibold">{SECTIONS.reduce((s, x) => s + x.count, 0)} records</span>
              </div>
            </div>
          </div>
          <Button label="Seed All Collections" icon="pi pi-database" onClick={runSeed} />
        </div>
      )}

      {/* Progress */}
      {status === 'running' && (
        <div className="flex flex-column gap-3">
          <div className="flex align-items-center gap-3">
            <i className="pi pi-spin pi-spinner text-primary" />
            <span className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>Seeding… {done}/{total} ({progress}%)</span>
          </div>
          <div style={{ height: 6, background: 'var(--surface-border)', borderRadius: 99 }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--primary-color)', borderRadius: 99, transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      {/* Log output */}
      {log.length > 0 && (
        <div className="surface-card border-round-xl p-4 border-1 border-white-alpha-10 mt-4">
          <pre className="text-sm m-0" style={{ fontFamily: 'var(--font-family)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
            {log.join('\n')}
          </pre>
        </div>
      )}

      {/* Done */}
      {(status === 'done' || status === 'error') && (
        <div className="mt-4 flex gap-2">
          <Button label="Go to Assets" icon="pi pi-arrow-right" onClick={() => window.location.href = '/assets'} />
          <Button label="Run Again" icon="pi pi-refresh" severity="secondary" outlined onClick={() => { setStatus('idle'); setLog([]); setProgress(0); setDone(0) }} />
        </div>
      )}
    </div>
  )
}

export default SeedPage
