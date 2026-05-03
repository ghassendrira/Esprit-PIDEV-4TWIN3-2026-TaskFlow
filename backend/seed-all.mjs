/**
 * MEGA SEED SCRIPT — Remplit toutes les bases de données TaskFlow
 * avec des données réalistes entre 2022 et avril 2026.
 *
 * Usage: node backend/seed-all.mjs
 */

import pg from 'pg';
const { Pool } = pg;
import { randomUUID } from 'crypto';

// ─── DB connections ─────────────────────────────────────────────────────────
const BASE = 'postgresql://postgres:taskflow2026@localhost:5432';
const pools = {
  tenant:       new Pool({ connectionString: `${BASE}/taskflow_tenant` }),
  auth:         new Pool({ connectionString: `${BASE}/taskflow_auth` }),
  business:     new Pool({ connectionString: `${BASE}/taskflow_business` }),
  invoice:      new Pool({ connectionString: `${BASE}/taskflow_invoice` }),
  expense:      new Pool({ connectionString: `${BASE}/taskflow_expense` }),
  notification: new Pool({ connectionString: `${BASE}/taskflow_notification` }),
  audit:        new Pool({ connectionString: `${BASE}/taskflow_audit` }),
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const uuid = () => randomUUID();
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max) => +(Math.random() * (max - min) + min).toFixed(2);
const randDate = (start, end) => {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return new Date(s + Math.random() * (e - s));
};
const fmt = (d) => d.toISOString();

// Existing password hash for "Admin1234!"
const PWD_HASH = '$2b$10$YhL1S9ehk9hv0sS/jUlejOywMXVcVgeqjf197iqQiXjEPWMwxzsKO';

// Existing IDs to keep
const EXISTING_TENANT = '34a9e451-8fc5-400e-b152-5464d8930c20';
const EXISTING_USER = 'fbeea01f-5423-415a-8eda-d9bfb7d6c5bc';
const EXISTING_BIZ_OR = 'ed730947-5c63-4ba0-84b2-c59c10c31921';
const EXISTING_BIZ_REP = 'f92e41f7-b1a3-487c-b4b5-112a61dd4405';

// ─── REALISTIC DATA POOLS ──────────────────────────────────────────────────
const FIRST_NAMES = ['Aziz','Mohamed','Ahmed','Sami','Youssef','Karim','Nour','Ines','Rania','Amira',
  'Mehdi','Omar','Fares','Slim','Hichem','Mariam','Salma','Fatma','Yasmine','Rym',
  'Amine','Bilel','Wael','Hamza','Zied','Sofiane','Aymen','Skander','Anis','Lotfi',
  'Houssem','Chiheb','Moez','Farid','Nabil','Tarek','Hatem','Riadh','Khaled','Mondher',
  'Nesrine','Sarra','Meriem','Asma','Hanen','Dorra','Emna','Olfa','Syrine','Lamia',
  'Hiba','Malek','Raed','Issam','Walid','Nizar','Wassim','Ghassen','Oussama','Ramzi'];

const LAST_NAMES = ['Douagi','Ben Ali','Trabelsi','Bouazizi','Gharbi','Chtourou','Hamdi','Khelifi',
  'Meddeb','Drira','Jebali','Mansouri','Chaabane','Saidi','Rezgui','Maalej','Bouzid',
  'Ferchichi','Haddad','Sfaxi','Daly','Hammami','Riahi','Ayari','Belhadj','Cherni',
  'Guesmi','Karoui','Mejri','Nasr','Oueslati','Sassi','Tlili','Zouari','Amri','Baccouche',
  'Dhahbi','Guizani','Khedher','Mechergui','Rejeb','Selmi','Yacoubi','Zarrouk','Aloui'];

const TUNISIAN_CITIES = ['Tunis','Sfax','Sousse','Kairouan','Bizerte','Gabès','Ariana','Gafsa',
  'Monastir','Ben Arous','Kasserine','Médenine','Nabeul','Tataouine','Béja','Jendouba',
  'Mahdia','Sidi Bouzid','Siliana','Zaghouan','Tozeur','Kébili','La Manouba','La Marsa',
  'Hammamet','Djerba','El Kef','Douz','Carthage','Rades'];

const COMPANY_CATEGORIES = ['Technology','Commerce','Services','Construction','Santé','Éducation',
  'Transport','Agriculture','Tourisme','Finance','Restauration','Textile','Immobilier'];

const COMPANY_NAMES_POOL = [
  'TechVision Tunisie','DataSoft Solutions','MéditerranéeIT','Carthage Digital','Olive Grove Trading',
  'Sahel Logistics','Jasmin Consulting','Atlas Construction','MedPharma','TunisFoodCo',
  'SunEnergy Tunisia','SmartBuild SARL','AgroTech Sousse','Maritime Express','EduPlus Academy',
  'FinanceFirst','CyberShield TN','GreenValley Farms','TunisPack','MobiConnect',
  'Starlight Media','InnovaDesign','PharmaVie','TransMaghreb','BuildPro Engineering',
  'CloudNet Tunisia','FreshMarket','LuxeHotel Group','SafeGuard Security','AquaPure Water',
  'ElectroMax','BioLab Tunisia','SpeedCourier','TextilePlus','RealEstate Premium',
  'AutoParts TN','WellnessSpa','CulinaryArt','LogiTrans','NetBank Solutions'];

const CLIENT_COMPANIES = [
  'Société ABC','Groupe Horizon','STIA Tunisie','Magasin Central','Pharmacie Pasteur',
  'Café de Paris','Hotel Majestic','Auto Express','Clinique Avicenne','Librairie Nationale',
  'Restaurant Le Gourmet','Boutique Élégance','Imprimerie Moderne','Agence Voyage Plus',
  'Cabinet Juridique BT','Plomberie Pro','Électricité Générale','Menuiserie Artisanale',
  'Pâtisserie Royale','Garage Central','Boucherie du Marché','Coiffure Style','Optique Vision',
  'Bijouterie Diamant','Cordonnerie Express','Quincaillerie du Sud','Bazar du Coin',
  'Studio Photo Pro','Pressing Express','Crèche Les Petits','Serrurerie Rapide',
  'Épicerie Fine','Pizzeria Napoli','Salon de Thé Jasmin','Droguerie Générale',
  'Décoration Intérieure','Fleuriste Tulipe','Parfumerie Orient','Agence Immobilière Lac',
  'Centre Sportif','Papeterie Moderne','Cabinet Dentaire Sourire','Laboratoire Bio',
  'Carrosserie Expert','Tapisserie Royale','Informatique Plus','Climatisation Pro',
  'Peinture Déco','Boulangerie Traditionnelle','Supermarché Frais'];

const EXPENSE_DESCRIPTIONS = [
  'Achat fournitures bureau','Facture électricité','Abonnement internet','Loyer mensuel bureau',
  'Carburant véhicule société','Réparation imprimante','Achat papier A4','Licence logiciel annuelle',
  'Formation employés','Frais déplacement client','Restaurant repas affaires','Hébergement mission Sfax',
  'Maintenance serveur','Publicité Facebook','Achat écran PC','Réparation climatiseur',
  'Abonnement téléphone','Frais comptable','Assurance véhicule','Nettoyage bureaux',
  'Achat cartouches encre','Frais bancaires','Timbre fiscal','Entretien véhicule',
  'Facture eau','Abonnement cloud AWS','Achat mobilier','Frais de livraison',
  'Frais juridiques','Cotisation sociale','Taxe municipale','Matériel informatique',
  'Frais marketing','Achat café/thé bureau','Réparation plomberie','Frais de parking',
  'Abonnement magazine pro','Décoration bureau','Frais de port colis','Achat EPI sécurité',
  'Facture gaz','Rénovation salle réunion','Service traiteur événement','Location salle conférence',
  'Achat serveur NAS','Mise à jour antivirus','Frais de douane import','Transport marchandises',
  'Achat matières premières','Frais de recrutement'];

const INVOICE_ITEMS_DESC = [
  'Consultation stratégique','Développement application web','Maintenance mensuelle',
  'Design graphique logo','Audit financier','Formation React/Angular','Installation réseau',
  'Migration cloud','Développement API REST','Tests qualité logiciel',
  'Rédaction contenu web','Gestion réseaux sociaux','Analyse données','Conseil juridique',
  'Développement mobile iOS','Développement mobile Android','Refonte site web',
  'Support technique mensuel','Intégration ERP','Configuration serveur',
  'Licence logiciel (1 an)','Hébergement web annuel','Certificat SSL','Backup cloud mensuel',
  'SEO / Référencement','Campagne publicitaire','Photographie produits','Vidéo promotionnelle',
  'Traduction documents','Impression supports marketing','Service de livraison',
  'Installation caméras','Câblage réseau','Réparation matériel','Fourniture bureau',
  'Nettoyage industriel','Gardiennage mensuel','Location équipement','Transport international'];

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 1: TENANTS
// ═══════════════════════════════════════════════════════════════════════════
const NEW_TENANTS = [];
const TENANT_NAMES = [
  { name: 'Groupe Douagi', slug: 'groupe-douagi', country: 'Tunisie', address: '15 Rue de la Liberté, Tunis', phone: '+216 71 234 567' },
  { name: 'TechStar Tunisia', slug: 'techstar-tn', country: 'Tunisie', address: '22 Avenue Habib Bourguiba, Sfax', phone: '+216 74 456 789' },
  { name: 'Médina Solutions', slug: 'medina-solutions', country: 'Tunisie', address: '8 Rue Ibn Khaldoun, Sousse', phone: '+216 73 678 901' },
  { name: 'Atlas Partners', slug: 'atlas-partners', country: 'Tunisie', address: '45 Avenue de Carthage, Tunis', phone: '+216 71 345 678' },
  { name: 'Sahara Digital', slug: 'sahara-digital', country: 'Tunisie', address: '3 Rue du Lac, Les Berges du Lac', phone: '+216 71 890 123' },
];

for (const t of TENANT_NAMES) {
  NEW_TENANTS.push({
    id: uuid(), name: t.name, slug: t.slug, address: t.address, country: t.country,
    phone: t.phone, logoUrl: '', website: `https://${t.slug}.tn`, matricule: `${rand(100000,999999)}/${rand(10,99)}`,
    branding: JSON.stringify({ primaryColor: '#' + rand(100000, 999999).toString(16).slice(0,6) }),
    createdAt: fmt(randDate('2022-01-01', '2023-06-01')),
    updatedAt: fmt(randDate('2023-06-01', '2026-04-15')),
  });
}

// Include existing tenant in our working set
const ALL_TENANT_IDS = [EXISTING_TENANT, ...NEW_TENANTS.map(t => t.id)];

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 2: ROLES & PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════════
const ROLE_NAMES_STD = ['SUPER_ADMIN','BUSINESS_OWNER','BUSINESS_ADMIN','ACCOUNTANT','TEAM_MEMBER','CLIENT'];
const EXISTING_ROLES = {
  'BUSINESS_OWNER': '27fbc5a4-d831-479f-a36b-b06c8bd79dfb',
  'OWNER': 'eace2e06-a877-472b-bac0-051f7c97e8dd',
  'ADMIN': '2265c829-a1ef-4f46-88d9-5d99dec9d0a4',
  'SUPER_ADMIN': 'f6f82653-a320-4d5f-bba6-bd84f17ffa20',
  'ACCOUNTANT': '516ac51c-2f4c-4df2-b2de-1361fd6e9cd0',
};

const NEW_ROLES = [];
const ROLE_MAP = { ...EXISTING_ROLES }; // name -> id

for (const rn of ROLE_NAMES_STD) {
  if (!ROLE_MAP[rn]) {
    const id = uuid();
    ROLE_MAP[rn] = id;
    NEW_ROLES.push({ id, name: rn, isStandard: true, createdAt: fmt(new Date('2022-01-01')), updatedAt: fmt(new Date('2022-01-01')) });
  }
}
// Add TEAM_MEMBER and CLIENT if missing
for (const rn of ['TEAM_MEMBER', 'CLIENT']) {
  if (!ROLE_MAP[rn]) {
    const id = uuid();
    ROLE_MAP[rn] = id;
    NEW_ROLES.push({ id, name: rn, isStandard: true, createdAt: fmt(new Date('2022-01-01')), updatedAt: fmt(new Date('2022-01-01')) });
  }
}

const PERMISSIONS_LIST = [
  'user:create','user:read','user:update','user:delete',
  'business:create','business:read','business:update','business:delete',
  'invoice:create','invoice:read','invoice:update','invoice:delete','invoice:send',
  'expense:create','expense:read','expense:update','expense:delete','expense:approve',
  'client:create','client:read','client:update','client:delete',
  'report:view','report:export','settings:manage','tenant:manage',
  'chat:send','chat:read','notification:send','audit:read',
];

const PERM_IDS = {};
const NEW_PERMS = [];
for (const p of PERMISSIONS_LIST) {
  const id = uuid();
  PERM_IDS[p] = id;
  NEW_PERMS.push({ id, name: p, description: `Permission to ${p.replace(':', ' ')}`, createdAt: fmt(new Date('2022-01-01')), updatedAt: fmt(new Date('2022-01-01')) });
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 3: USERS (100+)
// ═══════════════════════════════════════════════════════════════════════════
const PROVIDED_EMAILS = [
  'azizdouagi94@gmail.com','azizdouagi29@gmail.com','azizdouagi16@gmail.com',
  'azizdouagi93@gmail.com','azizdouagi92@gmail.com','aziz.douagi@esprit.tn',
  'azizdouagi6@gmail.com','azizdouagi44@gmail.com',
];

const NEW_USERS = [];
const ALL_USER_IDS = [EXISTING_USER];

// 8 provided email users
for (const email of PROVIDED_EMAILS) {
  const fn = pick(FIRST_NAMES);
  const ln = pick(LAST_NAMES);
  const id = uuid();
  ALL_USER_IDS.push(id);
  NEW_USERS.push({
    id, firstName: fn, lastName: ln, email,
    passwordHash: PWD_HASH, isActive: true, registrationStatus: 'ACTIVE',
    createdAt: fmt(randDate('2022-01-01', '2024-06-01')),
    updatedAt: fmt(randDate('2024-06-01', '2026-04-15')),
  });
}

// Generate 95 more realistic users
for (let i = 0; i < 95; i++) {
  const fn = pick(FIRST_NAMES);
  const ln = pick(LAST_NAMES);
  const emailDomain = pick(['gmail.com','yahoo.fr','outlook.com','esprit.tn','hotmail.com']);
  const email = `${fn.toLowerCase()}.${ln.toLowerCase().replace(/ /g,'')}${rand(1,99)}@${emailDomain}`;
  const id = uuid();
  ALL_USER_IDS.push(id);
  let status;
  if (Math.random() > 0.1) {
    status = 'ACTIVE';
  } else if (Math.random() > 0.5) {
    status = 'PENDING';
  } else {
    status = 'REJECTED';
  }
  const created = randDate('2022-01-01', '2026-04-15');
  NEW_USERS.push({
    id, firstName: fn, lastName: ln, email,
    passwordHash: PWD_HASH, isActive: status === 'ACTIVE',
    registrationStatus: status,
    createdAt: fmt(created),
    updatedAt: fmt(new Date(created.getTime() + rand(1, 365) * 86400000)),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 3b: USER-TENANT MEMBERSHIPS
// ═══════════════════════════════════════════════════════════════════════════
const NEW_MEMBERSHIPS = [];
const ASSIGNABLE_ROLES = ['BUSINESS_OWNER','ACCOUNTANT','TEAM_MEMBER','TEAM_MEMBER','TEAM_MEMBER'];

for (const uid of ALL_USER_IDS.slice(1)) { // skip existing admin
  const tid = pick(ALL_TENANT_IDS);
  const roleName = pick(ASSIGNABLE_ROLES);
  const roleId = ROLE_MAP[roleName] || ROLE_MAP['TEAM_MEMBER'];
  NEW_MEMBERSHIPS.push({
    id: uuid(), userId: uid, tenantId: tid, roleId,
    joinedAt: fmt(randDate('2022-03-01', '2026-04-15')),
    createdAt: fmt(randDate('2022-03-01', '2025-01-01')),
    updatedAt: fmt(randDate('2025-01-01', '2026-04-15')),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 3c: SECURITY QUESTIONS
// ═══════════════════════════════════════════════════════════════════════════
const SEC_QUESTIONS = [
  'Quel est le nom de votre premier animal de compagnie ?',
  'Dans quelle ville êtes-vous né(e) ?',
  'Quel est le prénom de votre meilleur ami d\'enfance ?',
  'Quel est le nom de votre école primaire ?',
  'Quel est votre plat préféré ?',
];
const NEW_SEC_Q = [];
for (const uid of ALL_USER_IDS.slice(0, 60)) {
  const q = pick(SEC_QUESTIONS);
  NEW_SEC_Q.push({ id: uuid(), userId: uid, question: q, answerHash: PWD_HASH, createdAt: fmt(randDate('2022-06-01','2026-01-01')), updatedAt: fmt(randDate('2026-01-01','2026-04-15')) });
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 3d: PASSWORD RESET REQUESTS
// ═══════════════════════════════════════════════════════════════════════════
const NEW_PWD_RESETS = [];
for (let i = 0; i < 30; i++) {
  const uid = pick(ALL_USER_IDS);
  const status = pick(['PENDING','APPROVED','REJECTED']);
  NEW_PWD_RESETS.push({
    id: uuid(), userId: uid, status,
    requestedAt: fmt(randDate('2023-01-01', '2026-04-15')),
    resolvedAt: status !== 'PENDING' ? fmt(randDate('2023-06-01', '2026-04-15')) : null,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 3e: INVITATIONS
// ═══════════════════════════════════════════════════════════════════════════
const NEW_INVITATIONS = [];
for (let i = 0; i < 50; i++) {
  const fn = pick(FIRST_NAMES).toLowerCase();
  const ln = pick(LAST_NAMES).toLowerCase().replace(/ /g, '');
  const email = `${fn}.${ln}${rand(1,50)}@${pick(['gmail.com','yahoo.fr','outlook.com'])}`;
  const status = pick(['PENDING','ACCEPTED','EXPIRED','REVOKED']);
  const created = randDate('2022-06-01', '2026-04-15');
  NEW_INVITATIONS.push({
    id: uuid(), tenantId: pick(ALL_TENANT_IDS), email, status,
    role: pick(['TEAM_MEMBER','ACCOUNTANT','BUSINESS_ADMIN']),
    token: uuid(), expiresAt: fmt(new Date(created.getTime() + 7 * 86400000)),
    createdAt: fmt(created),
    updatedAt: fmt(new Date(created.getTime() + rand(1,30) * 86400000)),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 4: BUSINESSES (15 new + keep 2 existing)
// ═══════════════════════════════════════════════════════════════════════════
const NEW_BUSINESSES = [];
const ALL_BIZ_IDS = [EXISTING_BIZ_OR, EXISTING_BIZ_REP];
const BIZ_TENANT_MAP = {};
BIZ_TENANT_MAP[EXISTING_BIZ_OR] = EXISTING_TENANT;
BIZ_TENANT_MAP[EXISTING_BIZ_REP] = EXISTING_TENANT;

for (let i = 0; i < 18; i++) {
  const id = uuid();
  const tid = pick(ALL_TENANT_IDS);
  ALL_BIZ_IDS.push(id);
  BIZ_TENANT_MAP[id] = tid;
  const name = COMPANY_NAMES_POOL[i] || `Enterprise ${i}`;
  NEW_BUSINESSES.push({
    id, tenantId: tid, name, logoUrl: '',
    currency: 'TND', taxRate: pick([7, 13, 19]),
    category: pick(COMPANY_CATEGORIES),
    createdAt: fmt(randDate('2022-01-15', '2025-06-01')),
    updatedAt: fmt(randDate('2025-06-01', '2026-04-15')),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 5: CLIENTS (120+)
// ═══════════════════════════════════════════════════════════════════════════
const NEW_CLIENTS = [];
const ALL_CLIENT_IDS = [];
const CLIENT_BIZ_MAP = {};

for (let i = 0; i < 120; i++) {
  const id = uuid();
  const bizId = pick(ALL_BIZ_IDS);
  ALL_CLIENT_IDS.push(id);
  CLIENT_BIZ_MAP[id] = bizId;
  const isCompany = Math.random() > 0.4;
  const name = isCompany ? pick(CLIENT_COMPANIES) + ` ${pick(TUNISIAN_CITIES)}` : `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
  const city = pick(TUNISIAN_CITIES);
  NEW_CLIENTS.push({
    id, businessId: bizId, name,
    email: `${name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15)}${rand(1,99)}@${pick(['gmail.com','yahoo.fr','outlook.com','entreprise.tn'])}`,
    phone: `+216 ${pick(['20','21','22','23','24','25','26','27','28','29','50','51','52','53','54','55','56','58','90','91','92','93','94','95','96','97','98','99'])} ${rand(100,999)} ${rand(100,999)}`,
    address: `${rand(1,200)} Rue ${pick(['de la République','Habib Bourguiba','Ibn Khaldoun','de Marseille','du 1er Juin','de la Liberté','Farhat Hached','Tahar Sfar','Ali Belhouane','Mongi Slim'])}, ${city}`,
    taxNumber: `${rand(1000000, 9999999)}/${pick(['A','B','C','D','M','N','P'])}/${rand(100,999)}/${rand(0,9)}`,
    createdAt: fmt(randDate('2022-01-01', '2026-03-01')),
    updatedAt: fmt(randDate('2025-01-01', '2026-04-15')),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 5b: CLIENT COMMUNICATIONS (150+)
// ═══════════════════════════════════════════════════════════════════════════
const NEW_CLIENT_COMMS = [];
const COMM_TYPES = ['email','phone','meeting','video_call','sms'];
const COMM_NOTES = [
  'Discussion sur le devis envoyé la semaine dernière',
  'Relance pour paiement facture en retard',
  'Présentation des nouveaux services',
  'Négociation des conditions de paiement',
  'Suivi de la livraison commande #12345',
  'Réclamation qualité produit - traitement en cours',
  'Demande de devis pour nouveau projet',
  'Confirmation de rendez-vous',
  'Mise à jour sur l\'avancement du projet',
  'Discussion des termes du contrat annuel',
  'Feedback positif sur la dernière prestation',
  'Demande d\'information sur les tarifs',
  'Planification de la prochaine réunion trimestrielle',
  'Résolution du problème technique signalé',
  'Proposition commerciale envoyée par email',
];

for (let i = 0; i < 150; i++) {
  const clientId = pick(ALL_CLIENT_IDS);
  NEW_CLIENT_COMMS.push({
    id: uuid(), clientId, type: pick(COMM_TYPES),
    date: fmt(randDate('2022-03-01', '2026-04-15')),
    notes: pick(COMM_NOTES),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 6: INVOICES (130+)
// ═══════════════════════════════════════════════════════════════════════════
const NEW_INVOICES = [];
const ALL_INVOICE_IDS = [];
const INVOICE_BIZ_MAP = {};
const INV_STATUSES = ['DRAFT','SENT','PAID','PAID','PAID','OVERDUE','CANCELED'];

for (let i = 0; i < 130; i++) {
  const id = uuid();
  const bizId = pick(ALL_BIZ_IDS);
  const clientsForBiz = ALL_CLIENT_IDS.filter(cid => CLIENT_BIZ_MAP[cid] === bizId);
  const clientId = clientsForBiz.length > 0 ? pick(clientsForBiz) : pick(ALL_CLIENT_IDS);
  const createdBy = pick(ALL_USER_IDS);
  const issueDate = randDate('2022-02-01', '2026-04-10');
  const dueDays = pick([15, 30, 45, 60, 90]);
  const dueDate = new Date(issueDate.getTime() + dueDays * 86400000);
  const status = pick(INV_STATUSES);
  const totalAmount = randFloat(50, 25000);
  const taxAmount = +(totalAmount * pick([0.07, 0.13, 0.19])).toFixed(2);
  const invNum = `INV-${issueDate.getFullYear()}-${String(i + 100).padStart(4, '0')}`;

  ALL_INVOICE_IDS.push(id);
  INVOICE_BIZ_MAP[id] = bizId;
  NEW_INVOICES.push({
    id, businessId: bizId, clientId, createdBy,
    invoiceNumber: invNum, status,
    issueDate: fmt(issueDate), dueDate: fmt(dueDate),
    totalAmount, taxAmount,
    pdfUrl: '', notes: pick(['', 'Paiement à 30 jours', 'Merci pour votre confiance', 'TVA incluse', 'Conditions net 30']),
    reminderCount: status === 'OVERDUE' ? rand(1, 5) : 0,
    createdAt: fmt(issueDate),
    updatedAt: fmt(new Date(issueDate.getTime() + rand(0,60) * 86400000)),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 6b: INVOICE ITEMS (300+)
// ═══════════════════════════════════════════════════════════════════════════
const NEW_INVOICE_ITEMS = [];
for (const inv of NEW_INVOICES) {
  const numItems = rand(1, 5);
  let remaining = inv.totalAmount;
  for (let j = 0; j < numItems; j++) {
    const isLast = j === numItems - 1;
    const qty = rand(1, 10);
    const unitPrice = isLast ? +(remaining / qty).toFixed(2) : randFloat(20, remaining / 2);
    const amount = isLast ? +remaining.toFixed(2) : +(qty * unitPrice).toFixed(2);
    remaining -= amount;
    if (remaining < 0) remaining = 0;
    NEW_INVOICE_ITEMS.push({
      id: uuid(), invoiceId: inv.id,
      description: pick(INVOICE_ITEMS_DESC),
      quantity: qty, unitPrice, amount,
      createdAt: inv.createdAt,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 6c: PAYMENTS (100+)
// ═══════════════════════════════════════════════════════════════════════════
const NEW_PAYMENTS = [];
const PAID_INVOICES = NEW_INVOICES.filter(inv => inv.status === 'PAID');
for (const inv of PAID_INVOICES) {
  const payDate = new Date(new Date(inv.issueDate).getTime() + rand(1, 45) * 86400000);
  NEW_PAYMENTS.push({
    id: uuid(), invoiceId: inv.id,
    amount: inv.totalAmount + inv.taxAmount,
    paymentDate: fmt(payDate),
    method: pick(['CASH', 'BANK_TRANSFER', 'CARD']),
    reference: `PAY-${payDate.getFullYear()}-${rand(10000, 99999)}`,
    createdAt: fmt(payDate),
  });
}
// Add partial payments for some OVERDUE invoices
const OVERDUE_INVOICES = NEW_INVOICES.filter(inv => inv.status === 'OVERDUE').slice(0, 15);
for (const inv of OVERDUE_INVOICES) {
  const payDate = new Date(new Date(inv.issueDate).getTime() + rand(10, 30) * 86400000);
  NEW_PAYMENTS.push({
    id: uuid(), invoiceId: inv.id,
    amount: +(inv.totalAmount * randFloat(0.2, 0.6)).toFixed(2),
    paymentDate: fmt(payDate),
    method: pick(['CASH', 'BANK_TRANSFER', 'CARD']),
    reference: `PAY-PART-${rand(10000, 99999)}`,
    createdAt: fmt(payDate),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 7: EXPENSE CATEGORIES (new per business)
// ═══════════════════════════════════════════════════════════════════════════
const EXTRA_CAT_NAMES = [
  'Marketing & Publicité','Salaires & Charges','Télécommunications','Assurances',
  'Entretien & Réparations','Voyages & Déplacements','Fournitures diverses',
  'Frais bancaires','Impôts & Taxes','Événements & Séminaires',
  'R&D Innovation','Sous-traitance','Licences & Brevets','Dons & Mécénat','Divers',
];
const NEW_EXP_CATS = [];
const ALL_CAT_IDS = [
  'c0000001-0001-4000-c000-000000000001','c0000001-0001-4000-c000-000000000002',
  'c0000001-0001-4000-c000-000000000003','c0000001-0001-4000-c000-000000000004',
  'c0000001-0001-4000-c000-000000000005','c0000001-0001-4000-c000-000000000006',
  'c0000001-0001-4000-c000-000000000007','c0000001-0001-4000-c000-000000000008',
  'c0000001-0001-4000-c000-000000000009','c0000001-0001-4000-c000-000000000010',
];

// Add business-specific categories
for (const bizId of ALL_BIZ_IDS) {
  const numCats = rand(3, 8);
  for (let i = 0; i < numCats; i++) {
    const id = uuid();
    ALL_CAT_IDS.push(id);
    NEW_EXP_CATS.push({
      id, businessId: bizId,
      name: EXTRA_CAT_NAMES[i % EXTRA_CAT_NAMES.length],
      description: `Catégorie spécifique pour ${EXTRA_CAT_NAMES[i % EXTRA_CAT_NAMES.length].toLowerCase()}`,
    createdAt: fmt(randDate('2022-01-01','2024-01-01')),
    updatedAt: fmt(randDate('2024-01-01','2026-04-15')),
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 7b: EXPENSES (200+)
// ═══════════════════════════════════════════════════════════════════════════
const NEW_EXPENSES = [];
const EXP_STATUSES_POOL = ['APPROVED','APPROVED','APPROVED','PENDING','PENDING','REJECTED'];

for (let i = 0; i < 200; i++) {
  const bizId = pick(ALL_BIZ_IDS);
  const date = randDate('2022-02-01', '2026-04-15');
  const status = pick(EXP_STATUSES_POOL);
  // Amount ranges by type of expense
  const amount = Math.random() > 0.8 ? randFloat(500, 8000) : randFloat(10, 500);

  NEW_EXPENSES.push({
    id: uuid(), businessId: bizId,
    amount, date: fmt(date),
    description: pick(EXPENSE_DESCRIPTIONS),
    receiptUrl: Math.random() > 0.6 ? `https://storage.taskflow.tn/receipts/${uuid()}.pdf` : null,
    status,
    rejectionReason: status === 'REJECTED' ? pick([
      'Montant trop élevé, nécessite approbation directeur',
      'Justificatif manquant ou illisible',
      'Dépense non conforme à la politique entreprise',
      'Budget dépassé pour cette catégorie',
      'Doublon avec une dépense existante',
    ]) : null,
    categoryId: pick(ALL_CAT_IDS),
    createdBy: pick(ALL_USER_IDS),
    createdAt: fmt(date),
    updatedAt: fmt(new Date(date.getTime() + rand(0, 30) * 86400000)),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 7c: EXPENSE AUDIT LOGS (150+)
// ═══════════════════════════════════════════════════════════════════════════
const NEW_EXP_AUDIT = [];
const AUDIT_ACTIONS = ['CREATE_EXPENSE','UPDATE_EXPENSE','APPROVE_EXPENSE','REJECT_EXPENSE','DELETE_EXPENSE'];
for (let i = 0; i < 150; i++) {
  const exp = pick(NEW_EXPENSES);
  NEW_EXP_AUDIT.push({
    id: uuid(), userId: pick(ALL_USER_IDS), businessId: exp.businessId,
    action: pick(AUDIT_ACTIONS), expenseId: exp.id,
    details: JSON.stringify({ amount: exp.amount, description: exp.description }),
    timestamp: fmt(randDate('2022-03-01', '2026-04-15')),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 8: CHAT (PredefinedQuestion, ChatRoom, ChatMessage)
// ═══════════════════════════════════════════════════════════════════════════
const NEW_PREDEF_Q = [
  { code: 'INV_STATUS', label: 'Quel est le statut de ma facture ?', category: 'INVOICE', responseType: 'DYNAMIC', displayOrder: 1 },
  { code: 'INV_PAYMENT', label: 'Comment effectuer un paiement ?', category: 'PAYMENT', responseType: 'STATIC', staticResponse: 'Vous pouvez payer par virement bancaire, carte ou espèces.', displayOrder: 2 },
  { code: 'INV_OVERDUE', label: 'Pourquoi ma facture est en retard ?', category: 'INVOICE', responseType: 'DYNAMIC', displayOrder: 3 },
  { code: 'BIZ_INFO', label: 'Quelles sont les informations de mon entreprise ?', category: 'BUSINESS', responseType: 'DYNAMIC', displayOrder: 4 },
  { code: 'BIZ_HOURS', label: 'Quels sont vos horaires d\'ouverture ?', category: 'BUSINESS', responseType: 'STATIC', staticResponse: 'Nos bureaux sont ouverts du lundi au vendredi de 8h30 à 17h30.', displayOrder: 5 },
  { code: 'SUP_CONTACT', label: 'Comment contacter le support ?', category: 'SUPPORT', responseType: 'STATIC', staticResponse: 'Envoyez un email à support@taskflow.tn ou appelez le +216 71 000 000.', displayOrder: 6 },
  { code: 'SUP_TICKET', label: 'Comment créer un ticket de support ?', category: 'SUPPORT', responseType: 'STATIC', staticResponse: 'Allez dans Paramètres > Support et décrivez votre problème.', displayOrder: 7 },
  { code: 'ADM_USERS', label: 'Comment ajouter un utilisateur ?', category: 'ADMIN', responseType: 'STATIC', staticResponse: 'Allez dans Paramètres > Équipe et cliquez sur Inviter.', displayOrder: 8 },
  { code: 'ADM_ROLES', label: 'Quels sont les rôles disponibles ?', category: 'ADMIN', responseType: 'STATIC', staticResponse: 'Les rôles sont : Super Admin, Business Owner, Admin, Comptable, Membre équipe, Client.', displayOrder: 9 },
  { code: 'GEN_HELP', label: 'J\'ai besoin d\'aide générale', category: 'GENERAL', responseType: 'MIXED', displayOrder: 10 },
  { code: 'PAY_METHODS', label: 'Quels modes de paiement acceptez-vous ?', category: 'PAYMENT', responseType: 'STATIC', staticResponse: 'Espèces, virement bancaire et carte bancaire.', displayOrder: 11 },
  { code: 'PAY_DELAY', label: 'Puis-je avoir un délai de paiement ?', category: 'PAYMENT', responseType: 'DYNAMIC', displayOrder: 12 },
  { code: 'INV_PDF', label: 'Comment télécharger ma facture en PDF ?', category: 'INVOICE', responseType: 'STATIC', staticResponse: 'Cliquez sur la facture puis sur le bouton Télécharger PDF.', displayOrder: 13 },
  { code: 'GEN_FEEDBACK', label: 'Je souhaite donner un avis', category: 'GENERAL', responseType: 'MIXED', displayOrder: 14 },
  { code: 'SUP_BUG', label: 'J\'ai trouvé un bug', category: 'SUPPORT', responseType: 'MIXED', displayOrder: 15 },
];

const NEW_CHAT_ROOMS = [];
const ALL_ROOM_IDS = [];
// Create team rooms for each business
for (const bizId of ALL_BIZ_IDS) {
  const id = uuid();
  ALL_ROOM_IDS.push(id);
  NEW_CHAT_ROOMS.push({
    id, type: 'BUSINESS_TEAM', businessId: bizId, ownerId: null,
    name: `Équipe ${bizId.slice(0, 8)}`,
    createdAt: fmt(randDate('2022-06-01','2024-01-01')), updatedAt: fmt(randDate('2024-01-01','2026-04-15')),
  });
}
// Create support rooms
for (let i = 0; i < 30; i++) {
  const id = uuid();
  ALL_ROOM_IDS.push(id);
  NEW_CHAT_ROOMS.push({
    id, type: 'SUPPORT', businessId: pick(ALL_BIZ_IDS), ownerId: pick(ALL_USER_IDS),
    name: `Support #${rand(1000, 9999)}`,
    createdAt: fmt(randDate('2023-01-01','2026-04-01')), updatedAt: fmt(randDate('2026-04-01','2026-04-16')),
  });
}

// Chat messages (200+)
const NEW_CHAT_MSGS = [];
const CHAT_MESSAGES = [
  'Bonjour, comment allez-vous ?','J\'ai une question concernant ma facture.',
  'Merci pour votre réponse rapide !','Pouvez-vous vérifier le montant ?',
  'Le paiement a été effectué ce matin.','Quand est-ce que la facture sera prête ?',
  'J\'ai besoin d\'une copie du reçu.','Y a-t-il une erreur sur cette facture ?',
  'Pouvez-vous m\'envoyer un récapitulatif ?','Le délai de livraison est de combien ?',
  'J\'ai validé la dépense.','La dépense a été rejetée, voir les commentaires.',
  'Nous avons bien reçu votre paiement.','N\'oubliez pas la réunion de demain.',
  'Le budget mensuel est presque épuisé.','Nouveau client ajouté au système.',
  'Les rapports trimestriels sont prêts.','Mise à jour des tarifs effective immédiatement.',
  'Félicitations pour l\'objectif atteint !','Rappel : échéance de paiement dans 3 jours.',
  'Le serveur sera en maintenance ce soir.','Bienvenue dans l\'équipe !',
  'Pouvez-vous approuver cette dépense ?','J\'ai mis à jour les coordonnées du client.',
  'La réconciliation bancaire est terminée.','Avez-vous les justificatifs ?',
  'Le contrat a été signé.','Planning de la semaine prochaine.',
  'Problème résolu, merci de vérifier.','Bonne fin de journée à tous !',
];

for (let i = 0; i < 250; i++) {
  const roomId = pick(ALL_ROOM_IDS);
  const senderId = pick(ALL_USER_IDS);
  const senderUser = NEW_USERS.find(u => u.id === senderId) || { firstName: 'Admin', lastName: 'TaskFlow' };
  NEW_CHAT_MSGS.push({
    id: uuid(), roomId, senderId,
    senderName: `${senderUser.firstName} ${senderUser.lastName}`,
    senderRole: pick(['BUSINESS_OWNER', 'TEAM_MEMBER', 'ACCOUNTANT', 'SUPER_ADMIN']),
    content: pick(CHAT_MESSAGES),
    kind: Math.random() > 0.8 ? 'PREDEFINED_QUESTION' : 'FREE_TEXT',
    isRead: Math.random() > 0.3,
    createdAt: fmt(randDate('2023-01-01', '2026-04-16')),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 9: GLOBAL AUDIT LOG
// ═══════════════════════════════════════════════════════════════════════════
const NEW_GLOBAL_AUDIT = [];
const G_AUDIT_ACTIONS = ['LOGIN','LOGOUT','CREATE','UPDATE','DELETE','APPROVE','REJECT','EXPORT','SEND_EMAIL','VIEW_REPORT'];
const G_AUDIT_ENTITIES = ['User','Business','Invoice','Expense','Client','Payment','ChatMessage','Tenant'];

for (let i = 0; i < 200; i++) {
  const entity = pick(G_AUDIT_ENTITIES);
  NEW_GLOBAL_AUDIT.push({
    id: uuid(), tenantId: pick(ALL_TENANT_IDS), userId: pick(ALL_USER_IDS),
    action: pick(G_AUDIT_ACTIONS), entity, entityId: uuid(),
    createdAt: fmt(randDate('2022-02-01', '2026-04-16')),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTE INSERTS
// ═══════════════════════════════════════════════════════════════════════════
const esc = (v) => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
};

async function run(pool, sql) {
  const client = await pool.connect();
  try {
    await client.query(sql);
  } finally {
    client.release();
  }
}

async function batchInsert(pool, table, rows, columns) {
  if (rows.length === 0) return;
  const client = await pool.connect();
  try {
    // Insert in chunks of 50
    for (let i = 0; i < rows.length; i += 50) {
      const chunk = rows.slice(i, i + 50);
      const values = chunk.map(row =>
        `(${columns.map(c => esc(row[c])).join(', ')})`
      ).join(',\n');
      const sql = `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')})
VALUES ${values}
ON CONFLICT DO NOTHING;`;
      await client.query(sql);
    }
  } finally {
    client.release();
  }
}

async function main() {
  console.log('🚀 Starting mega seed...\n');

  // ── PHASE 1: Tenants ──
  console.log('📦 Phase 1: Tenants...');
  await batchInsert(pools.tenant, 'Tenant', NEW_TENANTS,
    ['id','name','slug','address','country','phone','logoUrl','website','matricule','branding','createdAt','updatedAt']);
  console.log(`   ✅ ${NEW_TENANTS.length} tenants ajoutés`);

  // ── PHASE 2: Roles & Permissions ──
  console.log('📦 Phase 2: Roles & Permissions...');
  await batchInsert(pools.auth, 'Role', NEW_ROLES,
    ['id','name','isStandard','createdAt','updatedAt']);
  console.log(`   ✅ ${NEW_ROLES.length} rôles ajoutés`);

  await batchInsert(pools.auth, 'Permission', NEW_PERMS,
    ['id','name','description','createdAt','updatedAt']);
  console.log(`   ✅ ${NEW_PERMS.length} permissions ajoutées`);

  // Query actual permissions from DB
  const actualPermsRes = await pools.auth.query('SELECT id, name FROM "Permission"');
  const ACTUAL_PERMS = actualPermsRes.rows;
  const PERM_MAP = {};
  for (const p of ACTUAL_PERMS) PERM_MAP[p.name] = p.id;

  // Query actual roles from DB
  const actualRolesRes = await pools.auth.query('SELECT id, name FROM "Role"');
  const ACTUAL_ROLE_MAP = {};
  for (const r of actualRolesRes.rows) ACTUAL_ROLE_MAP[r.name] = r.id;

  // RolePermissions — give SUPER_ADMIN all perms, others subset
  const NEW_ROLE_PERMS = [];
  for (const perm of ACTUAL_PERMS) {
    if (ACTUAL_ROLE_MAP['SUPER_ADMIN']) NEW_ROLE_PERMS.push({ roleId: ACTUAL_ROLE_MAP['SUPER_ADMIN'], permissionId: perm.id });
    if (perm.name.startsWith('invoice:') || perm.name.startsWith('expense:') || perm.name.startsWith('report:'))
      if (ACTUAL_ROLE_MAP['ACCOUNTANT']) NEW_ROLE_PERMS.push({ roleId: ACTUAL_ROLE_MAP['ACCOUNTANT'], permissionId: perm.id });
    if (!perm.name.includes('delete') && !perm.name.includes('manage'))
      if (ACTUAL_ROLE_MAP['BUSINESS_OWNER']) NEW_ROLE_PERMS.push({ roleId: ACTUAL_ROLE_MAP['BUSINESS_OWNER'], permissionId: perm.id });
  }
  await batchInsert(pools.auth, 'RolePermission', NEW_ROLE_PERMS,
    ['roleId','permissionId']);
  console.log(`   ✅ ${NEW_ROLE_PERMS.length} role-permissions ajoutées`);

  // ── PHASE 3: Users ──
  console.log('📦 Phase 3: Users...');
  await batchInsert(pools.auth, 'User', NEW_USERS,
    ['id','firstName','lastName','email','passwordHash','isActive','registrationStatus','createdAt','updatedAt']);
  console.log(`   ✅ ${NEW_USERS.length} utilisateurs ajoutés`);

  // Query actual user IDs, tenant IDs, role IDs from DB
  const dbUsers = await pools.auth.query('SELECT id FROM "User"');
  const DB_USER_IDS = new Set(dbUsers.rows.map(r => r.id));
  const dbTenants = await pools.tenant.query('SELECT id FROM "Tenant"');
  const DB_TENANT_IDS = new Set(dbTenants.rows.map(r => r.id));
  const dbRoles = await pools.auth.query('SELECT id FROM "Role"');
  const DB_ROLE_IDS = new Set(dbRoles.rows.map(r => r.id));

  // Filter memberships to valid FK references
  const VALID_MEMBERSHIPS = NEW_MEMBERSHIPS.filter(m => DB_USER_IDS.has(m.userId) && DB_TENANT_IDS.has(m.tenantId) && DB_ROLE_IDS.has(m.roleId));
  await batchInsert(pools.auth, 'UserTenantMembership', VALID_MEMBERSHIPS,
    ['id','userId','tenantId','roleId','joinedAt','createdAt','updatedAt']);
  console.log(`   ✅ ${VALID_MEMBERSHIPS.length} memberships ajoutées`);

  // Security Questions - filter valid users
  const VALID_SEC_Q = NEW_SEC_Q.filter(q => DB_USER_IDS.has(q.userId));
  await batchInsert(pools.auth, 'SecurityQuestion', VALID_SEC_Q,
    ['id','userId','question','answerHash','createdAt','updatedAt']);
  console.log(`   ✅ ${VALID_SEC_Q.length} questions sécurité ajoutées`);

  // Password Reset Requests - filter valid users
  const VALID_PWD_RESETS = NEW_PWD_RESETS.filter(r => DB_USER_IDS.has(r.userId));
  await batchInsert(pools.auth, 'PasswordResetRequest', VALID_PWD_RESETS,
    ['id','userId','status','requestedAt','resolvedAt']);
  console.log(`   ✅ ${VALID_PWD_RESETS.length} demandes reset ajoutées`);

  // Invitations
  await batchInsert(pools.auth, 'Invitation', NEW_INVITATIONS,
    ['id','tenantId','email','status','role','token','expiresAt','createdAt','updatedAt']);
  console.log(`   ✅ ${NEW_INVITATIONS.length} invitations ajoutées`);

  // ── PHASE 4: Businesses ──
  console.log('📦 Phase 4: Businesses...');
  await batchInsert(pools.business, 'Business', NEW_BUSINESSES,
    ['id','tenantId','name','logoUrl','currency','taxRate','category','createdAt','updatedAt']);
  const dbBiz = await pools.business.query('SELECT id FROM "Business"');
  const DB_BIZ_IDS = new Set(dbBiz.rows.map(r => r.id));
  console.log(`   ✅ ${DB_BIZ_IDS.size} businesses (total en DB)`);

  // ── PHASE 5: Clients ──
  console.log('📦 Phase 5: Clients...');
  const VALID_CLIENTS = NEW_CLIENTS.filter(c => DB_BIZ_IDS.has(c.businessId));
  await batchInsert(pools.business, 'Client', VALID_CLIENTS,
    ['id','businessId','name','email','phone','address','taxNumber','createdAt','updatedAt']);
  const dbClients = await pools.business.query('SELECT id FROM "Client"');
  const DB_CLIENT_IDS = new Set(dbClients.rows.map(r => r.id));
  console.log(`   ✅ ${DB_CLIENT_IDS.size} clients (total en DB)`);

  // Client Communications - filter valid clients
  const VALID_COMMS = NEW_CLIENT_COMMS.filter(c => DB_CLIENT_IDS.has(c.clientId));
  await batchInsert(pools.business, 'ClientCommunication', VALID_COMMS,
    ['id','clientId','type','date','notes']);
  console.log(`   ✅ ${VALID_COMMS.length} communications ajoutées`);

  // ── PHASE 6: Invoices ──
  console.log('📦 Phase 6: Invoices...');
  const VALID_INVOICES = NEW_INVOICES.filter(inv =>
    DB_BIZ_IDS.has(inv.businessId) && DB_CLIENT_IDS.has(inv.clientId) && DB_USER_IDS.has(inv.createdBy));
  await batchInsert(pools.invoice, 'Invoice', VALID_INVOICES,
    ['id','businessId','clientId','createdBy','invoiceNumber','status','issueDate','dueDate','totalAmount','taxAmount','pdfUrl','notes','reminderCount','createdAt','updatedAt']);
  const dbInvoices = await pools.invoice.query('SELECT id FROM "Invoice"');
  const DB_INVOICE_IDS = new Set(dbInvoices.rows.map(r => r.id));
  console.log(`   ✅ ${DB_INVOICE_IDS.size} factures (total en DB)`);

  // Invoice Items - filter valid invoices
  const VALID_ITEMS = NEW_INVOICE_ITEMS.filter(it => DB_INVOICE_IDS.has(it.invoiceId));
  await batchInsert(pools.invoice, 'InvoiceItem', VALID_ITEMS,
    ['id','invoiceId','description','quantity','unitPrice','amount','createdAt']);
  console.log(`   ✅ ${VALID_ITEMS.length} lignes facture ajoutées`);

  // Payments - filter valid invoices
  const VALID_PAYMENTS = NEW_PAYMENTS.filter(p => DB_INVOICE_IDS.has(p.invoiceId));
  await batchInsert(pools.invoice, 'Payment', VALID_PAYMENTS,
    ['id','invoiceId','amount','paymentDate','method','reference','createdAt']);
  console.log(`   ✅ ${VALID_PAYMENTS.length} paiements ajoutés`);

  // ── PHASE 7: Expenses ──
  console.log('📦 Phase 7: Expenses...');
  const VALID_EXP_CATS = NEW_EXP_CATS.filter(c => DB_BIZ_IDS.has(c.businessId));
  await batchInsert(pools.expense, 'ExpenseCategory', VALID_EXP_CATS,
    ['id','businessId','name','description','createdAt','updatedAt']);
  console.log(`   ✅ ${VALID_EXP_CATS.length} catégories dépenses ajoutées`);

  // Query actual expense category IDs from DB
  const dbExpCats = await pools.expense.query('SELECT id FROM "ExpenseCategory"');
  const DB_EXP_CAT_IDS = new Set(dbExpCats.rows.map(r => r.id));

  const VALID_EXPENSES = NEW_EXPENSES.filter(e => DB_BIZ_IDS.has(e.businessId) && DB_EXP_CAT_IDS.has(e.categoryId) && DB_USER_IDS.has(e.createdBy));
  await batchInsert(pools.expense, 'Expense', VALID_EXPENSES,
    ['id','businessId','amount','date','description','receiptUrl','status','rejectionReason','categoryId','createdBy','createdAt','updatedAt']);
  const dbExpenses = await pools.expense.query('SELECT id FROM "Expense"');
  const DB_EXPENSE_IDS = new Set(dbExpenses.rows.map(r => r.id));
  console.log(`   ✅ ${DB_EXPENSE_IDS.size} dépenses (total en DB)`);

  const VALID_EXP_AUDIT = NEW_EXP_AUDIT.filter(a => DB_USER_IDS.has(a.userId) && DB_BIZ_IDS.has(a.businessId) && DB_EXPENSE_IDS.has(a.expenseId));
  await batchInsert(pools.expense, 'AuditLog', VALID_EXP_AUDIT,
    ['id','userId','businessId','action','expenseId','details','timestamp']);
  console.log(`   ✅ ${VALID_EXP_AUDIT.length} audit logs (expense) ajoutés`);

  // ── PHASE 8: Chat & Notifications ──
  console.log('📦 Phase 8: Chat & Notifications...');
  await batchInsert(pools.notification, 'PredefinedQuestion',
    NEW_PREDEF_Q.map(q => ({ id: uuid(), ...q, allowedRoles: `{${['SUPER_ADMIN','BUSINESS_OWNER','TEAM_MEMBER'].join(',')}}`, active: true, createdAt: fmt(new Date('2023-01-01')), updatedAt: fmt(new Date('2024-06-01')) })),
    ['id','code','label','category','responseType','staticResponse','displayOrder','allowedRoles','active','createdAt','updatedAt']);
  console.log(`   ✅ ${NEW_PREDEF_Q.length} questions prédéfinies ajoutées`);

  await batchInsert(pools.notification, 'ChatRoom', NEW_CHAT_ROOMS,
    ['id','type','businessId','ownerId','name','createdAt','updatedAt']);
  // Query actual inserted room IDs from DB
  const actualRoomsRes = await pools.notification.query('SELECT id FROM "ChatRoom"');
  const ACTUAL_ROOM_IDS = actualRoomsRes.rows.map(r => r.id);
  console.log(`   ✅ ${ACTUAL_ROOM_IDS.length} chat rooms (total en DB)`);

  // Rebuild chat messages using actual room IDs
  const FINAL_CHAT_MSGS = [];
  for (let i = 0; i < 250; i++) {
    const ts = randDate('2023-01-01', '2026-04-16');
    FINAL_CHAT_MSGS.push({
      id: uuid(), roomId: pick(ACTUAL_ROOM_IDS), senderId: pick(Array.from(DB_USER_IDS)),
      senderName: pick(FIRST_NAMES) + ' ' + pick(LAST_NAMES),
      senderRole: pick(['BUSINESS_OWNER','TEAM_MEMBER','ADMIN','SUPPORT']),
      content: pick(CHAT_MESSAGES), kind: 'FREE_TEXT', isRead: Math.random() > 0.3,
      createdAt: fmt(ts),
    });
  }

  await batchInsert(pools.notification, 'ChatMessage', FINAL_CHAT_MSGS,
    ['id','roomId','senderId','senderName','senderRole','content','kind','isRead','createdAt']);
  console.log(`   ✅ ${FINAL_CHAT_MSGS.length} messages chat ajoutés`);

  // ── PHASE 9: Global Audit ──
  console.log('📦 Phase 9: Audit global...');
  const VALID_GLOBAL_AUDIT = NEW_GLOBAL_AUDIT.filter(a => DB_USER_IDS.has(a.userId));
  await batchInsert(pools.audit, 'AuditLog', VALID_GLOBAL_AUDIT,
    ['id','tenantId','userId','action','entity','entityId','createdAt']);
  console.log(`   ✅ ${VALID_GLOBAL_AUDIT.length} audit logs globaux ajoutés`);

  // ── Summary ──
  console.log('\n══════════════════════════════════════════════');
  console.log('📊 RÉSUMÉ DU SEED :');
  console.log('══════════════════════════════════════════════');
  console.log(`  Tenants:              ${NEW_TENANTS.length}`);
  console.log(`  Roles:                ${NEW_ROLES.length}`);
  console.log(`  Permissions:          ${NEW_PERMS.length}`);
  console.log(`  RolePermissions:      ${NEW_ROLE_PERMS.length}`);
  console.log(`  Users:                ${NEW_USERS.length}`);
  console.log(`  Memberships:          ${NEW_MEMBERSHIPS.length}`);
  console.log(`  Security Questions:   ${NEW_SEC_Q.length}`);
  console.log(`  Password Resets:      ${NEW_PWD_RESETS.length}`);
  console.log(`  Invitations:          ${NEW_INVITATIONS.length}`);
  console.log(`  Businesses:           ${NEW_BUSINESSES.length}`);
  console.log(`  Clients:              ${NEW_CLIENTS.length}`);
  console.log(`  Client Comms:         ${NEW_CLIENT_COMMS.length}`);
  console.log(`  Invoices:             ${NEW_INVOICES.length}`);
  console.log(`  Invoice Items:        ${NEW_INVOICE_ITEMS.length}`);
  console.log(`  Payments:             ${NEW_PAYMENTS.length}`);
  console.log(`  Expense Categories:   ${NEW_EXP_CATS.length}`);
  console.log(`  Expenses:             ${NEW_EXPENSES.length}`);
  console.log(`  Expense Audit Logs:   ${NEW_EXP_AUDIT.length}`);
  console.log(`  Predefined Questions: ${NEW_PREDEF_Q.length}`);
  console.log(`  Chat Rooms:           ${NEW_CHAT_ROOMS.length}`);
  console.log(`  Chat Messages:        ${NEW_CHAT_MSGS.length}`);
  console.log(`  Global Audit Logs:    ${NEW_GLOBAL_AUDIT.length}`);
  const total = NEW_TENANTS.length + NEW_ROLES.length + NEW_PERMS.length + NEW_ROLE_PERMS.length +
    NEW_USERS.length + NEW_MEMBERSHIPS.length + NEW_SEC_Q.length + NEW_PWD_RESETS.length +
    NEW_INVITATIONS.length + NEW_BUSINESSES.length + NEW_CLIENTS.length + NEW_CLIENT_COMMS.length +
    NEW_INVOICES.length + NEW_INVOICE_ITEMS.length + NEW_PAYMENTS.length +
    NEW_EXP_CATS.length + NEW_EXPENSES.length + NEW_EXP_AUDIT.length +
    NEW_PREDEF_Q.length + NEW_CHAT_ROOMS.length + NEW_CHAT_MSGS.length + NEW_GLOBAL_AUDIT.length;
  console.log(`\n  🎯 TOTAL: ${total} enregistrements insérés`);
  console.log('══════════════════════════════════════════════\n');

  // Close all pools
  for (const p of Object.values(pools)) await p.end();
  console.log('✅ Seed terminé avec succès !');
}

main().catch(err => {
  console.error('❌ Erreur seed:', err);
  process.exit(1);
});
