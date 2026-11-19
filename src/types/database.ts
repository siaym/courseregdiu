export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "student" | "advisor" | "department_head" | "admin";

export type RegistrationStatus =
  | "draft"
  | "pending_advisor"
  | "approved"
  | "rejected"
  | "dropped";

export type SemesterSeason = "spring" | "summer" | "fall";

export interface ScheduleSlot {
  day: "Saturday" | "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";
  start_time: string; // HH:mm format e.g. "08:30"
  end_time: string;   // HH:mm format e.g. "10:00"
  room?: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          diu_id: string | null;
          full_name: string;
          email: string;
          role: UserRole;
          department_code: string | null;
          cgpa: number | null;
          completed_credits: number | null;
          phone: string | null;
          avatar_url: string | null;
          onboarding_completed: boolean;
          batch: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          diu_id?: string | null;
          full_name: string;
          email: string;
          role?: UserRole;
          department_code?: string | null;
          cgpa?: number | null;
          completed_credits?: number | null;
          phone?: string | null;
          avatar_url?: string | null;
          onboarding_completed?: boolean;
          batch?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          diu_id?: string | null;
          full_name?: string;
          email?: string;
          role?: UserRole;
          department_code?: string | null;
          cgpa?: number | null;
          completed_credits?: number | null;
          phone?: string | null;
          avatar_url?: string | null;
          onboarding_completed?: boolean;
          batch?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      departments: {
        Row: {
          id: string;
          code: string;
          name: string;
          faculty: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          faculty: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          faculty?: string;
          created_at?: string;
        };
      };
      semesters: {
        Row: {
          id: string;
          year: number;
          season: SemesterSeason;
          is_active: boolean;
          registration_starts_at: string | null;
          registration_ends_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          year: number;
          season: SemesterSeason;
          is_active?: boolean;
          registration_starts_at?: string | null;
          registration_ends_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          year?: number;
          season?: SemesterSeason;
          is_active?: boolean;
          registration_starts_at?: string | null;
          registration_ends_at?: string | null;
          created_at?: string;
        };
      };
      courses: {
        Row: {
          id: string;
          code: string;
          title: string;
          credits: number;
          department_code: string;
          prerequisite_codes: string[];
          syllabus_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          title: string;
          credits: number;
          department_code: string;
          prerequisite_codes?: string[];
          syllabus_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          title?: string;
          credits?: number;
          department_code?: string;
          prerequisite_codes?: string[];
          syllabus_url?: string | null;
          created_at?: string;
        };
      };
      sections: {
        Row: {
          id: string;
          course_id: string;
          semester_id: string;
          section_name: string;
          capacity: number;
          enrolled_count: number;
          room: string | null;
          schedule: ScheduleSlot[];
          instructor_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          semester_id: string;
          section_name: string;
          capacity?: number;
          enrolled_count?: number;
          room?: string | null;
          schedule?: ScheduleSlot[];
          instructor_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          semester_id?: string;
          section_name?: string;
          capacity?: number;
          enrolled_count?: number;
          room?: string | null;
          schedule?: ScheduleSlot[];
          instructor_name?: string | null;
          created_at?: string;
        };
      };
      registrations: {
        Row: {
          id: string;
          student_id: string;
          semester_id: string;
          status: RegistrationStatus;
          submitted_at: string | null;
          advisor_id: string | null;
          reviewed_at: string | null;
          advisor_notes: string | null;
          payment_cleared: boolean;
          payment_reference: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          semester_id: string;
          status?: RegistrationStatus;
          submitted_at?: string | null;
          advisor_id?: string | null;
          reviewed_at?: string | null;
          advisor_notes?: string | null;
          payment_cleared?: boolean;
          payment_reference?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          semester_id?: string;
          status?: RegistrationStatus;
          submitted_at?: string | null;
          advisor_id?: string | null;
          reviewed_at?: string | null;
          advisor_notes?: string | null;
          payment_cleared?: boolean;
          payment_reference?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      registration_items: {
        Row: {
          id: string;
          registration_id: string;
          section_id: string;
          status: "enrolled" | "waitlisted" | "dropped";
          created_at: string;
        };
        Insert: {
          id?: string;
          registration_id: string;
          section_id: string;
          status?: "enrolled" | "waitlisted" | "dropped";
          created_at?: string;
        };
        Update: {
          id?: string;
          registration_id?: string;
          section_id?: string;
          status?: "enrolled" | "waitlisted" | "dropped";
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          metadata?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
      };
      advisor_assignments: {
        Row: {
          id: string;
          advisor_id: string;
          student_id: string;
          semester_id: string;
          assigned_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          advisor_id: string;
          student_id: string;
          semester_id: string;
          assigned_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          advisor_id?: string;
          student_id?: string;
          semester_id?: string;
          assigned_at?: string;
          created_at?: string;
        };
      };
      authorized_emails: {
        Row: {
          id: string;
          profile_id: string;
          auth_user_id: string | null;
          email: string;
          email_type: "primary_diu" | "alternative_personal" | "advisor_authorized" | "admin_authorized";
          is_active: boolean;
          authorized_by: string | null;
          authorized_at: string;
          reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          auth_user_id?: string | null;
          email: string;
          email_type?: "primary_diu" | "alternative_personal" | "advisor_authorized" | "admin_authorized";
          is_active?: boolean;
          authorized_by?: string | null;
          authorized_at?: string;
          reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          auth_user_id?: string | null;
          email?: string;
          email_type?: "primary_diu" | "alternative_personal" | "advisor_authorized" | "admin_authorized";
          is_active?: boolean;
          authorized_by?: string | null;
          authorized_at?: string;
          reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      email_authorization_audit: {
        Row: {
          id: string;
          authorized_email_id: string | null;
          profile_id: string;
          email: string;
          action: "AUTHORIZED" | "MODIFIED" | "DEACTIVATED" | "REACTIVATED" | "REVOKED";
          actor_id: string | null;
          reason: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          authorized_email_id?: string | null;
          profile_id: string;
          email: string;
          action: "AUTHORIZED" | "MODIFIED" | "DEACTIVATED" | "REACTIVATED" | "REVOKED";
          actor_id?: string | null;
          reason: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          authorized_email_id?: string | null;
          profile_id?: string;
          email?: string;
          action?: "AUTHORIZED" | "MODIFIED" | "DEACTIVATED" | "REACTIVATED" | "REVOKED";
          actor_id?: string | null;
          reason?: string;
          metadata?: Json;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_current_profile_id: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
      get_current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: UserRole;
      };
      complete_student_onboarding: {
        Args: {
          p_full_name: string;
          p_diu_id: string;
          p_batch: string;
        };
        Returns: Json;
      };
      resolve_profile_by_email: {
        Args: {
          p_email: string;
        };
        Returns: {
          profile_id: string | null;
          full_name: string | null;
          diu_id: string | null;
          role: UserRole | null;
          email_type: string;
          is_authorized: boolean;
          deactivation_reason: string | null;
        }[];
      };
      enroll_section_atomic: {
        Args: {
          p_registration_id: string;
          p_section_id: string;
        };
        Returns: Json;
      };
      drop_section_atomic: {
        Args: {
          p_registration_id: string;
          p_section_id: string;
        };
        Returns: Json;
      };
      switch_section_atomic: {
        Args: {
          p_registration_id: string;
          p_old_section_id: string;
          p_new_section_id: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      user_role: UserRole;
      registration_status: RegistrationStatus;
      semester_season: SemesterSeason;
    };
  };
}
