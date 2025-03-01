export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      game_rooms: {
        Row: {
          id: string
          created_at: string
          host_id: string
          code: string
          status: 'waiting' | 'playing' | 'completed'
          current_round: number
          total_rounds: number
          player1_id: string | null
          player2_id: string | null
          player1_score: number
          player2_score: number
        }
        Insert: {
          id?: string
          created_at?: string
          host_id: string
          code: string
          status?: 'waiting' | 'playing' | 'completed'
          current_round?: number
          total_rounds: number
          player1_id?: string | null
          player2_id?: string | null
          player1_score?: number
          player2_score?: number
        }
        Update: {
          id?: string
          created_at?: string
          host_id?: string
          code?: string
          status?: 'waiting' | 'playing' | 'completed'
          current_round?: number
          total_rounds?: number
          player1_id?: string | null
          player2_id?: string | null
          player1_score?: number
          player2_score?: number
        }
      }
      rounds: {
        Row: {
          id: string
          created_at: string
          game_room_id: string
          round_number: number
          program_url: string
          program_code: string
          program_description: string
          path: string | null
          time_limit: number
          player1_answer: string | null
          player2_answer: string | null
          winner_id: string | null
          evaluation_result: Json | null
          status: 'waiting' | 'active' | 'evaluating' | 'completed'
        }
        Insert: {
          id?: string
          created_at?: string
          game_room_id: string
          round_number: number
          program_url: string
          program_code: string
          program_description: string
          path?: string | null
          time_limit: number
          player1_answer?: string | null
          player2_answer?: string | null
          winner_id?: string | null
          evaluation_result?: Json | null
          status?: 'waiting' | 'active' | 'evaluating' | 'completed'
        }
        Update: {
          id?: string
          created_at?: string
          game_room_id?: string
          round_number?: number
          program_url?: string
          program_code?: string
          program_description?: string
          path?: string | null
          time_limit?: number
          player1_answer?: string | null
          player2_answer?: string | null
          winner_id?: string | null
          evaluation_result?: Json | null
          status?: 'waiting' | 'active' | 'evaluating' | 'completed'
        }
      }
      profiles: {
        Row: {
          id: string
          created_at: string
          username: string
          avatar_url: string | null
          games_played: number
          games_won: number
        }
        Insert: {
          id: string
          created_at?: string
          username: string
          avatar_url?: string | null
          games_played?: number
          games_won?: number
        }
        Update: {
          id?: string
          created_at?: string
          username?: string
          avatar_url?: string | null
          games_played?: number
          games_won?: number
        }
      }
      github_cache: {
        Row: {
          id: string
          created_at: string
          owner: string
          repo: string
          path: string
          url: string
          content: string
          content_type: string
          last_accessed: string
        }
        Insert: {
          id?: string
          created_at?: string
          owner: string
          repo: string
          path: string
          url: string
          content: string
          content_type: string
          last_accessed?: string
        }
        Update: {
          id?: string
          created_at?: string
          owner?: string
          repo?: string
          path?: string
          url?: string
          content?: string
          content_type?: string
          last_accessed?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}