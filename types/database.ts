export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          username: string;
          avatar_url?: string;
          role: "viewer" | "creator" | "admin";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          username: string;
          avatar_url?: string;
          role?: "viewer" | "creator" | "admin";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string;
          avatar_url?: string;
          role?: "viewer" | "creator" | "admin";
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          title: string;
          description: string;
          genre: string;
          status: "Active" | "Completed" | "Draft";
          views: number;
          progress: number;
          image_url?: string;
          creator_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          genre: string;
          status?: "Active" | "Completed" | "Draft";
          views?: number;
          progress?: number;
          image_url?: string;
          creator_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          genre?: string;
          status?: "Active" | "Completed" | "Draft";
          views?: number;
          progress?: number;
          image_url?: string;
          creator_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      teams: {
        Row: {
          id: string;
          name: string;
          description?: string;
          project_id: string;
          leader_id: string;
          upvotes: number;
          views: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          project_id: string;
          leader_id: string;
          upvotes?: number;
          views?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          project_id?: string;
          leader_id?: string;
          upvotes?: number;
          views?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      team_members: {
        Row: {
          id: string;
          team_id: string;
          user_id: string;
          role: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          user_id: string;
          role: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          user_id?: string;
          role?: string;
          joined_at?: string;
        };
      };
      chapters: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          status: "Finalized" | "In-Betweening" | "Storyboard" | "Draft";
          thumbnail_url?: string;
          release_date?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          status?: "Finalized" | "In-Betweening" | "Storyboard" | "Draft";
          thumbnail_url?: string;
          release_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          status?: "Finalized" | "In-Betweening" | "Storyboard" | "Draft";
          thumbnail_url?: string;
          release_date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      forum_posts: {
        Row: {
          id: string;
          title: string;
          content: string;
          author_id: string;
          tags: string[];
          replies: number;
          likes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          author_id: string;
          tags?: string[];
          replies?: number;
          likes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          author_id?: string;
          tags?: string[];
          replies?: number;
          likes?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      animation_projects: {
        Row: {
          id: string;
          name: string;
          creator_id: string;
          canvas_width: number;
          canvas_height: number;
          frame_rate: number;
          project_data: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          creator_id: string;
          canvas_width: number;
          canvas_height: number;
          frame_rate: number;
          project_data?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          creator_id?: string;
          canvas_width?: number;
          canvas_height?: number;
          frame_rate?: number;
          project_data?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

export interface ContentComment {
  id: string;
  content_type: "chapter" | "episode";
  content_id: string;
  author_id: string;
  content: string;
  likes: number;
  created_at: string;
  updated_at: string;
  users?: {
    username: string;
    avatar_url?: string;
  };
}

export interface ContentCommentInsert {
  content_type: "chapter" | "episode";
  content_id: string;
  author_id: string;
  content: string;
  likes?: number;
}

export interface ContentCommentUpdate {
  content?: string;
  likes?: number;
}
