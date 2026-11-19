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
    };
    Views: Record<string, never>;
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: UserRole;
      };
    };
    Enums: {
      user_role: UserRole;
      registration_status: RegistrationStatus;
      semester_season: SemesterSeason;
    };
  };
}
