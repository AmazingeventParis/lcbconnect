import { z } from "zod";

// ─── Auth ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Adresse e-mail invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  email: z.string().email("Adresse e-mail invalide"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  full_name: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères"),
  boat_name: z
    .string()
    .max(100, "Le nom du bateau ne peut pas dépasser 100 caractères")
    .optional()
    .or(z.literal("")),
});
export type SignupValues = z.infer<typeof signupSchema>;

// ─── Profile ─────────────────────────────────────────────────────────────────

export const profileSchema = z.object({
  full_name: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères"),
  boat_name: z
    .string()
    .max(100, "Le nom du bateau ne peut pas dépasser 100 caractères")
    .optional()
    .or(z.literal("")),
  boat_type: z
    .string()
    .max(100, "Le type de bateau ne peut pas dépasser 100 caractères")
    .optional()
    .or(z.literal("")),
  mooring_port: z
    .string()
    .max(100, "Le port d'attache ne peut pas dépasser 100 caractères")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .max(20, "Le numéro de téléphone ne peut pas dépasser 20 caractères")
    .optional()
    .or(z.literal("")),
  bio: z
    .string()
    .max(500, "La biographie ne peut pas dépasser 500 caractères")
    .optional()
    .or(z.literal("")),
});
export type ProfileValues = z.infer<typeof profileSchema>;

// ─── Posts ────────────────────────────────────────────────────────────────────

export const postSchema = z.object({
  type: z.enum([
    "standard",
    "service",
    "plainte",
    "officiel_bureau",
    "avis_batellerie",
  ]),
  title: z
    .string()
    .max(200, "Le titre ne peut pas dépasser 200 caractères")
    .optional()
    .or(z.literal("")),
  content: z
    .string()
    .min(1, "Le contenu est requis")
    .max(5000, "Le contenu ne peut pas dépasser 5000 caractères"),
  photos: z.array(z.string().url()).max(10, "Maximum 10 photos").optional(),
});
export type PostValues = z.infer<typeof postSchema>;

// ─── Comments ────────────────────────────────────────────────────────────────

export const commentSchema = z.object({
  content: z
    .string()
    .min(1, "Le commentaire est requis")
    .max(2000, "Le commentaire ne peut pas dépasser 2000 caractères"),
});
export type CommentValues = z.infer<typeof commentSchema>;

// ─── Services ────────────────────────────────────────────────────────────────

export const serviceSchema = z.object({
  category: z
    .string()
    .min(1, "La catégorie est requise"),
  title: z
    .string()
    .min(3, "Le titre doit contenir au moins 3 caractères")
    .max(200, "Le titre ne peut pas dépasser 200 caractères"),
  description: z
    .string()
    .min(10, "La description doit contenir au moins 10 caractères")
    .max(5000, "La description ne peut pas dépasser 5000 caractères"),
  photos: z.array(z.string().url()).max(10, "Maximum 10 photos").optional(),
});
export type ServiceValues = z.infer<typeof serviceSchema>;

// ─── Complaints ──────────────────────────────────────────────────────────────

export const complaintSchema = z.object({
  title: z
    .string()
    .min(3, "Le titre doit contenir au moins 3 caractères")
    .max(200, "Le titre ne peut pas dépasser 200 caractères"),
  description: z
    .string()
    .min(10, "La description doit contenir au moins 10 caractères")
    .max(5000, "La description ne peut pas dépasser 5000 caractères"),
  photos: z.array(z.string().url()).max(10, "Maximum 10 photos").optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  location_name: z
    .string()
    .max(200, "Le nom du lieu ne peut pas dépasser 200 caractères")
    .optional()
    .or(z.literal("")),
});
export type ComplaintValues = z.infer<typeof complaintSchema>;

// ─── Avis Batellerie ─────────────────────────────────────────────────────────

export const avisBatellerieSchema = z.object({
  title: z
    .string()
    .min(3, "Le titre doit contenir au moins 3 caractères")
    .max(200, "Le titre ne peut pas dépasser 200 caractères"),
  content: z
    .string()
    .min(10, "Le contenu doit contenir au moins 10 caractères")
    .max(5000, "Le contenu ne peut pas dépasser 5000 caractères"),
  sector: z
    .string()
    .min(1, "Le secteur est requis")
    .max(100, "Le secteur ne peut pas dépasser 100 caractères"),
  is_urgent: z.boolean().default(false),
  valid_until: z.string().optional().or(z.literal("")),
});
export type AvisBatellerieValues = z.infer<typeof avisBatellerieSchema>;

// ─── Documents ───────────────────────────────────────────────────────────────

export const documentSchema = z.object({
  title: z
    .string()
    .min(3, "Le titre doit contenir au moins 3 caractères")
    .max(200, "Le titre ne peut pas dépasser 200 caractères"),
  description: z
    .string()
    .max(1000, "La description ne peut pas dépasser 1000 caractères")
    .optional()
    .or(z.literal("")),
  category: z.string().min(1, "La catégorie est requise"),
  year: z
    .number()
    .int("L'année doit être un nombre entier")
    .min(2000, "L'année doit être supérieure à 2000")
    .max(2100, "L'année doit être inférieure à 2100"),
  min_role: z.enum(["membre", "ca", "bureau"]),
});
export type DocumentValues = z.infer<typeof documentSchema>;

// ─── Events ──────────────────────────────────────────────────────────────────

export const eventSchema = z.object({
  title: z
    .string()
    .min(3, "Le titre doit contenir au moins 3 caractères")
    .max(200, "Le titre ne peut pas dépasser 200 caractères"),
  description: z
    .string()
    .min(10, "La description doit contenir au moins 10 caractères")
    .max(5000, "La description ne peut pas dépasser 5000 caractères"),
  location: z
    .string()
    .min(2, "Le lieu doit contenir au moins 2 caractères")
    .max(200, "Le lieu ne peut pas dépasser 200 caractères"),
  start_date: z.string().min(1, "La date de début est requise"),
  end_date: z.string().min(1, "La date de fin est requise"),
  max_participants: z
    .number()
    .int("Le nombre de participants doit être un nombre entier")
    .positive("Le nombre de participants doit être positif")
    .optional(),
});
export type EventValues = z.infer<typeof eventSchema>;

// ─── Directory ───────────────────────────────────────────────────────────────

export const directorySchema = z.object({
  name: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(200, "Le nom ne peut pas dépasser 200 caractères"),
  category: z.string().min(1, "La catégorie est requise"),
  description: z
    .string()
    .min(10, "La description doit contenir au moins 10 caractères")
    .max(2000, "La description ne peut pas dépasser 2000 caractères"),
  phone: z
    .string()
    .max(20, "Le numéro de téléphone ne peut pas dépasser 20 caractères")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .email("Adresse e-mail invalide")
    .optional()
    .or(z.literal("")),
  website: z
    .string()
    .url("URL invalide")
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .max(300, "L'adresse ne peut pas dépasser 300 caractères")
    .optional()
    .or(z.literal("")),
});
export type DirectoryValues = z.infer<typeof directorySchema>;

// ─── Directory Reviews ───────────────────────────────────────────────────────

export const directoryReviewSchema = z.object({
  rating: z
    .number()
    .int("La note doit être un nombre entier")
    .min(1, "La note minimum est 1")
    .max(5, "La note maximum est 5"),
  comment: z
    .string()
    .max(1000, "Le commentaire ne peut pas dépasser 1000 caractères")
    .optional()
    .or(z.literal("")),
});
export type DirectoryReviewValues = z.infer<typeof directoryReviewSchema>;

// ─── Messages ────────────────────────────────────────────────────────────────

export const messageSchema = z.object({
  content: z
    .string()
    .min(1, "Le message est requis")
    .max(5000, "Le message ne peut pas dépasser 5000 caractères"),
});
export type MessageValues = z.infer<typeof messageSchema>;
