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
        Relationships: [];
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
        Relationships: [];
      };
      semesters: {
        Row: {
          id: string;
          year: number;
          season: SemesterSeason;
          name?: string | null;
          code?: string | null;
          is_active: boolean;
          is_archived?: boolean;
          registration_starts_at: string | null;
          registration_ends_at: string | null;
          created_at: string;
          updated_at?: string;
        };
        Insert: {
          id?: string;
          year: number;
          season: SemesterSeason;
          name?: string | null;
          code?: string | null;
          is_active?: boolean;
          is_archived?: boolean;
          registration_starts_at?: string | null;
          registration_ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          year?: number;
          season?: SemesterSeason;
          name?: string | null;
          code?: string | null;
          is_active?: boolean;
          is_archived?: boolean;
          registration_starts_at?: string | null;
          registration_ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
          category?: string;
          theory_credits?: number | null;
          lab_credits?: number | null;
          specialization_group?: string | null;
          variant?: string | null;
          description?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at: string;
          updated_at?: string;
        };
        Insert: {
          id?: string;
          code: string;
          title: string;
          credits: number;
          department_code: string;
          prerequisite_codes?: string[];
          syllabus_url?: string | null;
          category?: string;
          theory_credits?: number | null;
          lab_credits?: number | null;
          specialization_group?: string | null;
          variant?: string | null;
          description?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          title?: string;
          credits?: number;
          department_code?: string;
          prerequisite_codes?: string[];
          syllabus_url?: string | null;
          category?: string;
          theory_credits?: number | null;
          lab_credits?: number | null;
          specialization_group?: string | null;
          variant?: string | null;
          description?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
        Relationships: [];
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
          previous_section: string | null;
          desired_section: string | null;
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
          previous_section?: string | null;
          desired_section?: string | null;
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
          previous_section?: string | null;
          desired_section?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      registration_items: {
        Row: {
          id: string;
          registration_id: string;
          section_id: string | null;
          course_id?: string | null;
          course_code_snapshot?: string | null;
          course_title_snapshot?: string | null;
          credits_snapshot?: number | null;
          category_snapshot?: string | null;
          classification?: "general" | "retake" | null;
          course_type: "general" | "retake";
          status: "enrolled" | "waitlisted" | "dropped";
          created_at: string;
        };
        Insert: {
          id?: string;
          registration_id: string;
          section_id?: string | null;
          course_id?: string | null;
          course_code_snapshot?: string | null;
          course_title_snapshot?: string | null;
          credits_snapshot?: number | null;
          category_snapshot?: string | null;
          classification?: "general" | "retake" | null;
          course_type?: "general" | "retake";
          status?: "enrolled" | "waitlisted" | "dropped";
          created_at?: string;
        };
        Update: {
          id?: string;
          registration_id?: string;
          section_id?: string | null;
          course_id?: string | null;
          course_code_snapshot?: string | null;
          course_title_snapshot?: string | null;
          credits_snapshot?: number | null;
          category_snapshot?: string | null;
          classification?: "general" | "retake" | null;
          course_type?: "general" | "retake";
          status?: "enrolled" | "waitlisted" | "dropped";
          created_at?: string;
        };
        Relationships: [];
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
        Relationships: [];
      };
      advisor_assignments: {
        Row: {
          id: string;
          advisor_id: string | null;
          advisor_profile_id?: string | null;
          student_id: string;
          semester_id: string;
          assignment_source?: string;
          assignment_rule_type?: string;
          source_range_raw?: string | null;
          import_batch_id?: string | null;
          is_active?: boolean;
          updated_by?: string | null;
          assigned_at: string;
          created_at: string;
          updated_at?: string;
        };
        Insert: {
          id?: string;
          advisor_id?: string | null;
          advisor_profile_id?: string | null;
          student_id: string;
          semester_id: string;
          assignment_source?: string;
          assignment_rule_type?: string;
          source_range_raw?: string | null;
          import_batch_id?: string | null;
          is_active?: boolean;
          updated_by?: string | null;
          assigned_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          advisor_id?: string | null;
          advisor_profile_id?: string | null;
          student_id?: string;
          semester_id?: string;
          assignment_source?: string;
          assignment_rule_type?: string;
          source_range_raw?: string | null;
          import_batch_id?: string | null;
          is_active?: boolean;
          updated_by?: string | null;
          assigned_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
      };
      batch_semester_courses: {
        Row: {
          id: string;
          semester_id: string;
          batch: string;
          course_id: string;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          semester_id: string;
          batch: string;
          course_id: string;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          semester_id?: string;
          batch?: string;
          course_id?: string;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      payment_clearances: {
        Row: {
          id: string;
          student_id: string;
          semester_id: string;
          status: "awaiting_verification" | "cleared" | "not_cleared";
          reference_code: string | null;
          notes: string | null;
          verified_by: string | null;
          verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          semester_id: string;
          status?: "awaiting_verification" | "cleared" | "not_cleared";
          reference_code?: string | null;
          notes?: string | null;
          verified_by?: string | null;
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          semester_id?: string;
          status?: "awaiting_verification" | "cleared" | "not_cleared";
          reference_code?: string | null;
          notes?: string | null;
          verified_by?: string | null;
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payment_clearance_audit: {
        Row: {
          id: string;
          clearance_id: string | null;
          student_id: string;
          semester_id: string;
          previous_status: string | null;
          new_status: string;
          actor_id: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          clearance_id?: string | null;
          student_id: string;
          semester_id: string;
          previous_status?: string | null;
          new_status: string;
          actor_id?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          clearance_id?: string | null;
          student_id?: string;
          semester_id?: string;
          previous_status?: string | null;
          new_status?: string;
          actor_id?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      system_settings: {
        Row: {
          key: string;
          value: Json;
          description: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          key: string;
          value: Json;
          description?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          key?: string;
          value?: Json;
          description?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      batches: {
        Row: {
          id: string;
          batch_label: string;
          batch_number: string | null;
          department_code: string | null;
          is_active: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          batch_label: string;
          batch_number?: string | null;
          department_code?: string | null;
          is_active?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          batch_label?: string;
          batch_number?: string | null;
          department_code?: string | null;
          is_active?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      advisor_profiles: {
        Row: {
          id: string;
          profile_id: string | null;
          full_name: string;
          designation: string | null;
          email: string;
          phone: string | null;
          room_number: string | null;
          schedule: string | null;
          department_code: string | null;
          employee_id: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id?: string | null;
          full_name: string;
          designation?: string | null;
          email: string;
          phone?: string | null;
          room_number?: string | null;
          schedule?: string | null;
          department_code?: string | null;
          employee_id?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string | null;
          full_name?: string;
          designation?: string | null;
          email?: string;
          phone?: string | null;
          room_number?: string | null;
          schedule?: string | null;
          department_code?: string | null;
          employee_id?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      advisor_roster_imports: {
        Row: {
          id: string;
          file_name: string;
          worksheet_name: string;
          semester_id: string;
          department_code: string | null;
          assignment_mode: "range" | "batch" | "individual" | "advisors_only";
          commit_mode: "add_only" | "update_and_add" | "replace_batches";
          imported_by: string | null;
          summary: Json;
          warnings: Json;
          status: "completed" | "failed" | "rolled_back";
          created_at: string;
        };
        Insert: {
          id?: string;
          file_name: string;
          worksheet_name: string;
          semester_id: string;
          department_code?: string | null;
          assignment_mode: "range" | "batch" | "individual" | "advisors_only";
          commit_mode: "add_only" | "update_and_add" | "replace_batches";
          imported_by?: string | null;
          summary?: Json;
          warnings?: Json;
          status?: "completed" | "failed" | "rolled_back";
          created_at?: string;
        };
        Update: {
          id?: string;
          file_name?: string;
          worksheet_name?: string;
          semester_id?: string;
          department_code?: string | null;
          assignment_mode?: "range" | "batch" | "individual" | "advisors_only";
          commit_mode?: "add_only" | "update_and_add" | "replace_batches";
          imported_by?: string | null;
          summary?: Json;
          warnings?: Json;
          status?: "completed" | "failed" | "rolled_back";
          created_at?: string;
        };
        Relationships: [];
      };
      advisor_roster_import_rows: {
        Row: {
          id: string;
          import_batch_id: string;
          source_row_number: number;
          semester_code: string | null;
          batch_label: string | null;
          batch_number: string | null;
          serial_number: string | null;
          advisor_name: string | null;
          designation: string | null;
          student_id_range_raw: string | null;
          room_number: string | null;
          schedule: string | null;
          email: string | null;
          phone: string | null;
          validation_status: "valid" | "warning" | "error" | "duplicate" | "needs_review" | "excluded";
          warning_details: Json;
          matched_student_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          import_batch_id: string;
          source_row_number: number;
          semester_code?: string | null;
          batch_label?: string | null;
          batch_number?: string | null;
          serial_number?: string | null;
          advisor_name?: string | null;
          designation?: string | null;
          student_id_range_raw?: string | null;
          room_number?: string | null;
          schedule?: string | null;
          email?: string | null;
          phone?: string | null;
          validation_status: "valid" | "warning" | "error" | "duplicate" | "needs_review" | "excluded";
          warning_details?: Json;
          matched_student_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          import_batch_id?: string;
          source_row_number?: number;
          semester_code?: string | null;
          batch_label?: string | null;
          batch_number?: string | null;
          serial_number?: string | null;
          advisor_name?: string | null;
          designation?: string | null;
          student_id_range_raw?: string | null;
          room_number?: string | null;
          schedule?: string | null;
          email?: string | null;
          phone?: string | null;
          validation_status?: "valid" | "warning" | "error" | "duplicate" | "needs_review" | "excluded";
          warning_details?: Json;
          matched_student_count?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      advisor_assignment_history: {
        Row: {
          id: string;
          assignment_id: string | null;
          student_id: string;
          semester_id: string;
          previous_advisor_profile_id: string | null;
          new_advisor_profile_id: string | null;
          previous_advisor_id: string | null;
          new_advisor_id: string | null;
          action: "ASSIGNED" | "REASSIGNED" | "UNASSIGNED" | "CONFLICT_RESOLVED";
          assignment_source: string;
          assignment_rule_type: string;
          source_range_raw: string | null;
          import_batch_id: string | null;
          reason: string | null;
          actor_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          assignment_id?: string | null;
          student_id: string;
          semester_id: string;
          previous_advisor_profile_id?: string | null;
          new_advisor_profile_id?: string | null;
          previous_advisor_id?: string | null;
          new_advisor_id?: string | null;
          action: "ASSIGNED" | "REASSIGNED" | "UNASSIGNED" | "CONFLICT_RESOLVED";
          assignment_source?: string;
          assignment_rule_type?: string;
          source_range_raw?: string | null;
          import_batch_id?: string | null;
          reason?: string | null;
          actor_id?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      admin_audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_role: UserRole | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          reason: string | null;
          before_data: Json | null;
          after_data: Json | null;
          import_batch_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          actor_role?: UserRole | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          reason?: string | null;
          before_data?: Json | null;
          after_data?: Json | null;
          import_batch_id?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      semester_courses: {
        Row: {
          id: string;
          semester_id: string;
          course_id: string;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          semester_id: string;
          course_id: string;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          semester_id?: string;
          course_id?: string;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      specialization_offerings: {
        Row: {
          id: string;
          semester_id: string;
          batch: string;
          specialization_group: string;
          required_courses: number | null;
          required_credits: number | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          semester_id: string;
          batch: string;
          specialization_group: string;
          required_courses?: number | null;
          required_credits?: number | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          semester_id?: string;
          batch?: string;
          specialization_group?: string;
          required_courses?: number | null;
          required_credits?: number | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      course_import_history: {
        Row: {
          id: string;
          file_name: string;
          source_worksheet: string | null;
          imported_by: string | null;
          imported_count: number;
          failed_count: number;
          status: "completed" | "failed" | "partial";
          summary: Json;
          error_summary: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          file_name: string;
          source_worksheet?: string | null;
          imported_by?: string | null;
          imported_count?: number;
          failed_count?: number;
          status?: "completed" | "failed" | "partial";
          summary?: Json;
          error_summary?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          file_name?: string;
          source_worksheet?: string | null;
          imported_by?: string | null;
          imported_count?: number;
          failed_count?: number;
          status?: "completed" | "failed" | "partial";
          summary?: Json;
          error_summary?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      advisor_assignment_rules: {
        Row: {
          id: string;
          advisor_profile_id: string;
          semester_id: string;
          batch: string;
          student_id_prefix: string | null;
          start_student_id: string | null;
          end_student_id: string | null;
          student_id: string | null;
          assignment_type: "id_range" | "individual_student" | "entire_batch";
          is_active: boolean;
          source: string;
          import_batch_id: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          advisor_profile_id: string;
          semester_id: string;
          batch: string;
          student_id_prefix?: string | null;
          start_student_id?: string | null;
          end_student_id?: string | null;
          student_id?: string | null;
          assignment_type: "id_range" | "individual_student" | "entire_batch";
          is_active?: boolean;
          source?: string;
          import_batch_id?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          advisor_profile_id?: string;
          semester_id?: string;
          batch?: string;
          student_id_prefix?: string | null;
          start_student_id?: string | null;
          end_student_id?: string | null;
          student_id?: string | null;
          assignment_type?: "id_range" | "individual_student" | "entire_batch";
          is_active?: boolean;
          source?: string;
          import_batch_id?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
