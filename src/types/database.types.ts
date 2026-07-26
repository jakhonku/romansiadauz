/**
 * Database types for the Romansiada schema.
 *
 * Hand-authored to mirror `supabase/migrations/*.sql` exactly, so the codebase
 * type-checks before a database exists. Once a project is provisioned, run
 *
 *     npm run db:types
 *
 * to regenerate this file from the live schema. If that regeneration produces a
 * diff, the migrations are the source of truth and this file was wrong.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AppRole = 'admin' | 'editor' | 'moderator' | 'viewer';
export type ContentStatus = 'draft' | 'published' | 'archived';
export type RegistrationStatus = 'pending' | 'approved' | 'rejected';
export type Gender = 'male' | 'female';
export type LocaleCode = 'uz' | 'ru' | 'en';

/** Turns a Row into an Insert type: `K` are the columns the database defaults. */
type Insertable<Row, K extends keyof Row> = Omit<Row, K> & Partial<Pick<Row, K>>;

type TableDef<Row, Insert, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

// -----------------------------------------------------------------------------
// Row shapes
// -----------------------------------------------------------------------------
export type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  avatar_path: string | null;
  role: AppRole;
  is_active: boolean;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

type LookupRow = {
  id: string;
  code: string;
  name_uz: string;
  name_ru: string;
  name_en: string;
  sort_order: number;
}

export type RegionRow = LookupRow & {
  created_at: string;
}

export type DistrictRow = LookupRow & {
  region_id: string;
  created_at: string;
}

export type VoiceTypeRow = LookupRow;

/** «Номинация» on the application form. */
export type NominationRow = LookupRow & {
  is_active: boolean;
}

export type AgeCategoryRow = LookupRow & {
  min_age: number;
  max_age: number;
  duration_minutes: number;
  pieces_count: number;
  is_active: boolean;
}

export type NewsCategoryRow = {
  id: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type NewsRow = {
  id: string;
  slug: string;
  category_id: string | null;
  cover_path: string | null;
  status: ContentStatus;
  published_at: string | null;
  is_featured: boolean;
  view_count: number;
  author_id: string | null;
  created_at: string;
  updated_at: string;
}

export type NewsTranslationRow = {
  id: string;
  news_id: string;
  locale: LocaleCode;
  title: string;
  excerpt: string | null;
  body: string;
  seo_title: string | null;
  seo_description: string | null;
}

export type JudgeRow = {
  id: string;
  slug: string;
  photo_path: string | null;
  country_code: string | null;
  is_chair: boolean;
  socials: Json;
  status: ContentStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type JudgeTranslationRow = {
  id: string;
  judge_id: string;
  locale: LocaleCode;
  full_name: string;
  role_title: string | null;
  biography: string | null;
  achievements: string | null;
}

export type AlbumRow = {
  id: string;
  slug: string;
  cover_path: string | null;
  event_date: string | null;
  status: ContentStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type AlbumTranslationRow = {
  id: string;
  album_id: string;
  locale: LocaleCode;
  title: string;
  description: string | null;
}

export type PhotoRow = {
  id: string;
  album_id: string;
  storage_path: string;
  width: number | null;
  height: number | null;
  blur_data_url: string | null;
  sort_order: number;
  created_at: string;
}

export type PhotoTranslationRow = {
  id: string;
  photo_id: string;
  locale: LocaleCode;
  alt_text: string;
  caption: string | null;
}

export type VideoCategoryRow = {
  id: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
}

export type VideoRow = {
  id: string;
  youtube_id: string;
  category_id: string | null;
  duration_seconds: number | null;
  published_at: string | null;
  status: ContentStatus;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type VideoTranslationRow = {
  id: string;
  video_id: string;
  locale: LocaleCode;
  title: string;
  description: string | null;
}

export type WinnerRow = {
  id: string;
  year: number;
  place: number | null;
  is_grand_prix: boolean;
  category_id: string | null;
  photo_path: string | null;
  country_code: string | null;
  status: ContentStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type WinnerTranslationRow = {
  id: string;
  winner_id: string;
  locale: LocaleCode;
  full_name: string;
  award_title: string | null;
  biography: string | null;
}

export type PartnerRow = {
  id: string;
  slug: string;
  logo_path: string | null;
  logo_dark_path: string | null;
  website_url: string | null;
  tier: number;
  status: ContentStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type PartnerTranslationRow = {
  id: string;
  partner_id: string;
  locale: LocaleCode;
  name: string;
  description: string | null;
}

export type EventRow = {
  id: string;
  slug: string;
  starts_at: string;
  ends_at: string | null;
  cover_path: string | null;
  status: ContentStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type EventTranslationRow = {
  id: string;
  event_id: string;
  locale: LocaleCode;
  title: string;
  description: string | null;
  location: string | null;
}

export type PageRow = {
  id: string;
  slug: string;
  status: ContentStatus;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export type PageTranslationRow = {
  id: string;
  page_id: string;
  locale: LocaleCode;
  title: string;
  body: string;
  seo_title: string | null;
  seo_description: string | null;
}

/**
 * One row per submitted application, matching the official paper form field for
 * field. See the header of `0004_registrations.sql` for why nothing beyond the
 * form's fields is collected.
 */
export type RegistrationRow = {
  id: string;
  reference_code: string;
  /** «ФИО конкурсанта» */
  first_name: string;
  last_name: string;
  middle_name: string | null;
  /** «Дата рождения». «Возраст» is derived, never stored. */
  birth_date: string;
  /** «Название учебного заведения, факультет, место работы (учебы), должность» */
  institution: string | null;
  faculty: string | null;
  position_title: string | null;
  /** «Место жительства» / «E-mail» / «Телефон» */
  address: string;
  email: string;
  phone: string;
  /** «Программа»: I тур / II тур / III тур */
  programme_round_1: string | null;
  programme_round_2: string | null;
  programme_round_3: string | null;
  /** «ФИО концертмейстера, место работы» */
  accompanist_name: string | null;
  accompanist_workplace: string | null;
  /** «Номинация» */
  nomination_id: string | null;
  status: RegistrationStatus;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  consent_given_at: string;
  submitted_ip: string | null;
  user_agent: string | null;
  locale: LocaleCode;
  created_at: string;
  updated_at: string;
}

export type ContactMessageRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  is_read: boolean;
  is_archived: boolean;
  replied_at: string | null;
  handled_by: string | null;
  submitted_ip: string | null;
  locale: LocaleCode;
  created_at: string;
}

export type SiteSettingsRow = {
  id: number;
  branding: Json;
  contacts: Json;
  social: Json;
  seo: Json;
  analytics: Json;
  stats: Json;
  /** Not selectable by anon/authenticated — see the column GRANT in 0007_rls.sql. */
  smtp: Json;
  updated_by: string | null;
  updated_at: string;
}

export type AuditLogRow = {
  id: number;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  changes: Json | null;
  ip: string | null;
  created_at: string;
}

// Common "database fills this in" column sets.
type Stamps = 'id' | 'created_at' | 'updated_at';
type TranslationDefaults = 'id';

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<
        ProfileRow,
        Insertable<ProfileRow, Stamps | 'full_name' | 'avatar_path' | 'role' | 'is_active' | 'last_seen_at'>
      >;
      regions: TableDef<RegionRow, Insertable<RegionRow, 'id' | 'created_at' | 'sort_order'>>;
      districts: TableDef<DistrictRow, Insertable<DistrictRow, 'id' | 'created_at' | 'sort_order'>>;
      voice_types: TableDef<VoiceTypeRow, Insertable<VoiceTypeRow, 'id' | 'sort_order'>>;
      age_categories: TableDef<
        AgeCategoryRow,
        Insertable<AgeCategoryRow, 'id' | 'sort_order' | 'is_active' | 'duration_minutes' | 'pieces_count'>
      >;
      nominations: TableDef<NominationRow, Insertable<NominationRow, 'id' | 'sort_order' | 'is_active'>>;

      news_categories: TableDef<NewsCategoryRow, Insertable<NewsCategoryRow, Stamps | 'sort_order' | 'is_active'>>;
      news_category_translations: TableDef<
        { id: string; category_id: string; locale: LocaleCode; name: string; description: string | null },
        Insertable<
          { id: string; category_id: string; locale: LocaleCode; name: string; description: string | null },
          TranslationDefaults | 'description'
        >
      >;
      news: TableDef<
        NewsRow,
        Insertable<NewsRow, Stamps | 'status' | 'is_featured' | 'view_count' | 'published_at' | 'cover_path' | 'category_id' | 'author_id'>
      >;
      news_translations: TableDef<
        NewsTranslationRow,
        Insertable<NewsTranslationRow, TranslationDefaults | 'body' | 'excerpt' | 'seo_title' | 'seo_description'>
      >;

      judges: TableDef<
        JudgeRow,
        Insertable<JudgeRow, Stamps | 'status' | 'sort_order' | 'is_chair' | 'socials' | 'photo_path' | 'country_code'>
      >;
      judge_translations: TableDef<
        JudgeTranslationRow,
        Insertable<JudgeTranslationRow, TranslationDefaults | 'role_title' | 'biography' | 'achievements'>
      >;

      albums: TableDef<AlbumRow, Insertable<AlbumRow, Stamps | 'status' | 'sort_order' | 'cover_path' | 'event_date'>>;
      album_translations: TableDef<
        AlbumTranslationRow,
        Insertable<AlbumTranslationRow, TranslationDefaults | 'description'>
      >;
      photos: TableDef<
        PhotoRow,
        Insertable<PhotoRow, 'id' | 'created_at' | 'sort_order' | 'width' | 'height' | 'blur_data_url'>
      >;
      photo_translations: TableDef<
        PhotoTranslationRow,
        Insertable<PhotoTranslationRow, TranslationDefaults | 'alt_text' | 'caption'>
      >;

      video_categories: TableDef<VideoCategoryRow, Insertable<VideoCategoryRow, 'id' | 'sort_order' | 'is_active'>>;
      video_category_translations: TableDef<
        { id: string; category_id: string; locale: LocaleCode; name: string },
        Insertable<{ id: string; category_id: string; locale: LocaleCode; name: string }, TranslationDefaults>
      >;
      videos: TableDef<
        VideoRow,
        Insertable<VideoRow, Stamps | 'status' | 'sort_order' | 'is_featured' | 'published_at' | 'category_id' | 'duration_seconds'>
      >;
      video_translations: TableDef<
        VideoTranslationRow,
        Insertable<VideoTranslationRow, TranslationDefaults | 'description'>
      >;

      winners: TableDef<
        WinnerRow,
        Insertable<WinnerRow, Stamps | 'status' | 'sort_order' | 'is_grand_prix' | 'place' | 'category_id' | 'photo_path' | 'country_code'>
      >;
      winner_translations: TableDef<
        WinnerTranslationRow,
        Insertable<WinnerTranslationRow, TranslationDefaults | 'award_title' | 'biography'>
      >;

      partners: TableDef<
        PartnerRow,
        Insertable<PartnerRow, Stamps | 'status' | 'sort_order' | 'tier' | 'logo_path' | 'logo_dark_path' | 'website_url'>
      >;
      partner_translations: TableDef<
        PartnerTranslationRow,
        Insertable<PartnerTranslationRow, TranslationDefaults | 'description'>
      >;

      events: TableDef<
        EventRow,
        Insertable<EventRow, Stamps | 'status' | 'sort_order' | 'ends_at' | 'cover_path'>
      >;
      event_translations: TableDef<
        EventTranslationRow,
        Insertable<EventTranslationRow, TranslationDefaults | 'description' | 'location'>
      >;

      pages: TableDef<PageRow, Insertable<PageRow, Stamps | 'status' | 'is_system'>>;
      page_translations: TableDef<
        PageTranslationRow,
        Insertable<PageTranslationRow, TranslationDefaults | 'body' | 'seo_title' | 'seo_description'>
      >;

      registrations: TableDef<
        RegistrationRow,
        Insertable<
          RegistrationRow,
          | Stamps
          | 'reference_code'
          | 'status'
          | 'locale'
          | 'consent_given_at'
          | 'middle_name'
          | 'institution'
          | 'faculty'
          | 'position_title'
          | 'programme_round_1'
          | 'programme_round_2'
          | 'programme_round_3'
          | 'accompanist_name'
          | 'accompanist_workplace'
          | 'nomination_id'
          | 'review_note'
          | 'reviewed_by'
          | 'reviewed_at'
          | 'submitted_ip'
          | 'user_agent'
        >
      >;

      contact_messages: TableDef<
        ContactMessageRow,
        Insertable<
          ContactMessageRow,
          | 'id'
          | 'created_at'
          | 'is_read'
          | 'is_archived'
          | 'replied_at'
          | 'handled_by'
          | 'submitted_ip'
          | 'locale'
          | 'phone'
          | 'subject'
        >
      >;

      site_settings: TableDef<SiteSettingsRow, Insertable<SiteSettingsRow, keyof SiteSettingsRow>>;
      audit_logs: TableDef<
        AuditLogRow,
        Insertable<AuditLogRow, 'id' | 'created_at' | 'actor_id' | 'actor_email' | 'entity_id' | 'changes' | 'ip'>
      >;
      rate_limits: TableDef<
        { bucket_key: string; window_start: string; request_count: number },
        { bucket_key: string; window_start: string; request_count?: number }
      >;
    };
    Views: Record<never, never>;
    Functions: {
      auth_role: { Args: Record<never, never>; Returns: AppRole };
      is_staff: { Args: Record<never, never>; Returns: boolean };
      is_admin: { Args: Record<never, never>; Returns: boolean };
      can_manage_content: { Args: Record<never, never>; Returns: boolean };
      can_review_applications: { Args: Record<never, never>; Returns: boolean };
      consume_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number };
        Returns: boolean;
      };
      prune_rate_limits: { Args: { p_older_than?: string }; Returns: number };
    };
    Enums: {
      app_role: AppRole;
      content_status: ContentStatus;
      registration_status: RegistrationStatus;
      gender: Gender;
      locale_code: LocaleCode;
    };
    CompositeTypes: Record<never, never>;
  };
}

/** Convenience aliases used across queries and actions. */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
