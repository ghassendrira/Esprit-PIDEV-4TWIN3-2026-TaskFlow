// Importe le type d'exemple étiqueté
import { LabeledExample } from './ai.types';

// Définit le dataset d'exemples pour la classification des dépenses
export const EXPENSE_CLASSIFICATION_DATASET: LabeledExample[] = [
  // Exemples pour la catégorie "software"
  { label: 'software', text: 'Adobe subscription monthly design license' }, // Licence Adobe
  { label: 'software', text: 'Google Workspace annual software renewal' }, // Renouvellement Google Workspace
  { label: 'software', text: 'Cloud hosting and SaaS platform fee' }, // Hébergement cloud
  { label: 'software', text: 'Figma and developer tools subscription' }, // Abonnement Figma/outils dev
  { label: 'software', text: 'CRM license payment for sales team' }, // Licence CRM
  { label: 'software', text: 'API service subscription for analytics' }, // Abonnement API analytique

  // Exemples pour la catégorie "office_supplies"
  { label: 'office_supplies', text: 'Printer paper pens notebooks office supplies' }, // Fournitures imprimante
  { label: 'office_supplies', text: 'Stationery and desk accessories for office' }, // Papeterie
  { label: 'office_supplies', text: 'Folders staplers and office storage items' }, // Rangement bureau
  { label: 'office_supplies', text: 'Office chairs and monitor stand accessories' }, // Chaises/accessoires
  { label: 'office_supplies', text: 'Coffee cups markers and whiteboard supplies' }, // Fournitures tableau
  { label: 'office_supplies', text: 'Paper toner and basic administrative materials' }, // Toner/papier

  // Exemples pour la catégorie "transport"
  { label: 'transport', text: 'Taxi ride to client meeting airport transfer' }, // Taxi
  { label: 'transport', text: 'Fuel payment for company car and tolls' }, // Carburant
  { label: 'transport', text: 'Train ticket and business trip transport cost' }, // Train
  { label: 'transport', text: 'Courier delivery and shipping expenses' }, // Livraison
  { label: 'transport', text: 'Ride share to conference venue' }, // Covoiturage
  { label: 'transport', text: 'Vehicle maintenance road toll and travel fuel' }, // Entretien véhicule

  // Exemples pour la catégorie "meals"
  { label: 'meals', text: 'Team lunch with client and coffee break' }, // Déjeuner équipe
  { label: 'meals', text: 'Restaurant dinner during business trip' }, // Dîner restaurant
  { label: 'meals', text: 'Catering for workshop and meeting snacks' }, // Traiteur
  { label: 'meals', text: 'Meal receipt for sales visit with customer' }, // Repas client
  { label: 'meals', text: 'Breakfast and lunch expenses during seminar' }, // Petit-déjeuner/séminaire
  { label: 'meals', text: 'Coffee and food for office event' }, // Café/événement

  // Exemples pour la catégorie "rent"
  { label: 'rent', text: 'Monthly office rent for headquarters' }, // Loyer siège
  { label: 'rent', text: 'Coworking space lease payment' }, // Coworking
  { label: 'rent', text: 'Warehouse rental invoice for storage' }, // Entrepôt
  { label: 'rent', text: 'Property rent for branch office' }, // Loyer agence
  { label: 'rent', text: 'Workspace lease and parking rent' }, // Parking
  { label: 'rent', text: 'Office premises monthly lease fee' }, // Loyer bureau

  // Exemples pour la catégorie "utilities"
  { label: 'utilities', text: 'Electricity water and internet bill' }, // Facture électricité/eau
  { label: 'utilities', text: 'Telephone and utility payment for office' }, // Téléphone
  { label: 'utilities', text: 'Monthly power bill and water usage' }, // Facture énergie
  { label: 'utilities', text: 'Internet subscription and telecom bill' }, // Internet
  { label: 'utilities', text: 'Gas and electricity utilities invoice' }, // Gaz/électricité
  { label: 'utilities', text: 'Office broadband and utility charges' }, // Charges bureau

  // Exemples pour la catégorie "marketing"
  { label: 'marketing', text: 'Facebook ads campaign and social media promotion' }, // Facebook Ads
  { label: 'marketing', text: 'Google ads spend for lead generation' }, // Google Ads
  { label: 'marketing', text: 'Branding and marketing agency fee' }, // Agence marketing
  { label: 'marketing', text: 'Event promotion and advertising content' }, // Promotion événement
  { label: 'marketing', text: 'Website campaign banner and promotional design' }, // Bannière web
  { label: 'marketing', text: 'Digital marketing services and ad spend' }, // Services digitaux

  // Exemples pour la catégorie "payroll"
  { label: 'payroll', text: 'Employee salary and monthly payroll' }, // Salaire
  { label: 'payroll', text: 'Bonus payment for staff member' }, // Prime
  { label: 'payroll', text: 'Payroll taxes and compensation transfer' }, // Taxes
  { label: 'payroll', text: 'Wage payment for contractor and employee' }, // Paiement prestataire
  { label: 'payroll', text: 'Monthly salary processing and benefits' }, // Traitement salaire
  { label: 'payroll', text: 'Payroll expense for team members' }, // Charges paie

  // Exemples pour la catégorie "taxes"
  { label: 'taxes', text: 'VAT tax payment to government' }, // TVA
  { label: 'taxes', text: 'Corporate tax filing and state fee' },
  { label: 'taxes', text: 'Withholding tax settlement invoice' },
  { label: 'taxes', text: 'Annual tax declaration and fiscal charge' },
  { label: 'taxes', text: 'Income tax payment and authority fee' },
  { label: 'taxes', text: 'Tax adjustment and regulatory payment' },

  // Exemples pour la catégorie "maintenance"
  { label: 'maintenance', text: 'Repair air conditioner and equipment maintenance' },
  { label: 'maintenance', text: 'Office printer servicing and maintenance fee' },
  { label: 'maintenance', text: 'Computer repair and hardware support' },
  { label: 'maintenance', text: 'Cleaning service and building maintenance' },
  { label: 'maintenance', text: 'Technical support for broken machine' },
  { label: 'maintenance', text: 'Preventive maintenance for office equipment' },

  // Exemples pour la catégorie "training"
  { label: 'training', text: 'Employee workshop and training course' },
  { label: 'training', text: 'Online class for sales team development' },
  { label: 'training', text: 'Certification program and education fee' },
  { label: 'training', text: 'Seminar attendance and professional course' },
  { label: 'training', text: 'Coaching session for managers and staff' },
  { label: 'training', text: 'Learning platform subscription for training' },

  // Exemples pour la catégorie "banking"
  { label: 'banking', text: 'Bank transfer fee and card processing fee' },
  { label: 'banking', text: 'Bank service charges and account maintenance' },
  { label: 'banking', text: 'Payment gateway fee for online payment' },
  { label: 'banking', text: 'Merchant card commission and transaction fee' },
  { label: 'banking', text: 'Wire transfer cost and banking charges' },
  { label: 'banking', text: 'Merchant settlement fee and bank commission' },

  // Exemples pour la catégorie "telecom"
  { label: 'telecom', text: 'Mobile phone plan and telecom subscription' },
  { label: 'telecom', text: 'Internet package and phone line payment' },
  { label: 'telecom', text: 'Fiber internet and mobile data bill' },
  { label: 'telecom', text: 'Office telephone service monthly fee' },
  { label: 'telecom', text: 'Telecommunications contract for staff phones' },
  { label: 'telecom', text: 'SIM cards and data plan for employees' },

  // Exemples pour la catégorie "insurance"
  { label: 'insurance', text: 'Business insurance premium and policy renewal' },
  { label: 'insurance', text: 'Health insurance payment for employees' },
  { label: 'insurance', text: 'Vehicle insurance renewal and coverage fee' },
  { label: 'insurance', text: 'Liability insurance invoice for company' },
  { label: 'insurance', text: 'Property insurance annual premium' },
  { label: 'insurance', text: 'Insurance broker fee and policy charge' },
];

//
// Ce fichier définit un jeu de données d'exemples pour entraîner et tester le modèle de classification automatique des dépenses.
// Chaque entrée associe un texte descriptif à une catégorie de dépense.