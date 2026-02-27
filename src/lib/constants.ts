export const ROLES = {
  membre: { label: "Membre" },
  ca: { label: "Conseil d'Administration" },
  bureau: { label: "Bureau" },
} as const;

export type Role = keyof typeof ROLES;

export const POST_TYPES = {
  standard: { label: "Publication", icon: "FileText" },
  service: { label: "Service", icon: "Wrench" },
  plainte: { label: "Plainte", icon: "AlertTriangle" },
  officiel_bureau: { label: "Communication officielle", icon: "Shield" },
  avis_batellerie: { label: "Avis à la batellerie", icon: "Anchor" },
} as const;

export type PostType = keyof typeof POST_TYPES;

export const SERVICE_CATEGORIES = {
  mecanique: { label: "Mécanique" },
  electricite: { label: "Électricité" },
  plomberie: { label: "Plomberie" },
  accastillage: { label: "Accastillage" },
  navigation: { label: "Navigation" },
  autre: { label: "Autre" },
} as const;

export type ServiceCategory = keyof typeof SERVICE_CATEGORIES;

export const SERVICE_STATUSES = {
  ouvert: { label: "Ouvert", color: "blue" },
  en_cours: { label: "En cours", color: "orange" },
  resolu: { label: "Résolu", color: "green" },
} as const;

export type ServiceStatus = keyof typeof SERVICE_STATUSES;

export const COMPLAINT_STATUSES = {
  soumise: { label: "Soumise", color: "blue" },
  en_cours: { label: "En cours", color: "orange" },
  resolue: { label: "Résolue", color: "green" },
  rejetee: { label: "Rejetée", color: "gray" },
} as const;

export type ComplaintStatus = keyof typeof COMPLAINT_STATUSES;

export const COMPLAINT_PRIORITIES = {
  basse: { label: "Basse", color: "blue" },
  normale: { label: "Normale", color: "green" },
  haute: { label: "Haute", color: "orange" },
  urgente: { label: "Urgente", color: "red" },
} as const;

export type ComplaintPriority = keyof typeof COMPLAINT_PRIORITIES;

export const DOCUMENT_CATEGORIES = {
  statuts: { label: "Statuts" },
  pv_ag: { label: "PV Assemblée Générale" },
  pv_ca: { label: "PV Conseil d'Administration" },
  reglements: { label: "Règlements" },
  courriers: { label: "Courriers" },
  divers: { label: "Divers" },
} as const;

export type DocumentCategory = keyof typeof DOCUMENT_CATEGORIES;

export const NOTIFICATION_TYPES = {
  like: { label: "J'aime" },
  comment: { label: "Commentaire" },
  reply: { label: "Réponse" },
  event: { label: "Événement" },
  service: { label: "Service" },
  complaint: { label: "Plainte" },
  message: { label: "Message" },
  admin: { label: "Administration" },
} as const;

export type NotificationType = keyof typeof NOTIFICATION_TYPES;

export const ROLE_HIERARCHY: Record<Role, number> = {
  membre: 0,
  ca: 1,
  bureau: 2,
} as const;

export function hasMinRole(userRole: Role, minRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}
