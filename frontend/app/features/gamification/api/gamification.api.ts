import apiClient from "~/lib/api/client";

export interface UserPoints {
  id: string;
  user_id: string;
  total_points: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  progress_to_next_level: number;
  points_to_next_level: number;
  updated_at: string;
}

export interface GamificationEvent {
  id: string;
  event_type: string;
  source_module: string;
  source_id: string | null;
  points_earned: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  criteria: Record<string, unknown>;
  points_value: number;
  is_active: boolean;
}

export interface UserBadge {
  id: string;
  badge_id: string;
  badge_name: string;
  badge_description: string | null;
  badge_icon: string;
  earned_at: string;
}

export interface LeaderboardEntry {
  rank: number | null;
  user_id: string;
  user_name: string;
  points: number;
  is_current_user: boolean;
}

export interface TeamAnalytics {
  team_velocity: number;
  trend: string;
  total_points: number;
  active_users: number;
  top_performers: Record<string, unknown>[];
  needs_attention: Record<string, unknown>[];
  alerts: Alert[];
}

export interface Alert {
  type: "burnout_risk" | "disengagement" | "bottleneck";
  employee_name: string;
  employee_id: string;
  severity: "low" | "medium" | "high";
  recommendation: string;
  data: Record<string, unknown>;
}

interface StandardResponse<T> {
  data: T;
  meta?: Record<string, unknown> | null;
  error: null;
}

interface StandardListResponse<T> {
  data: T[];
  meta: { total: number; page: number; page_size: number; total_pages: number };
  error: null;
}

export async function getMyPoints(): Promise<StandardResponse<UserPoints>> {
  const response = await apiClient.get<StandardResponse<UserPoints>>(
    "/gamification/me/points"
  );
  return response.data;
}

export async function getMyHistory(
  limit = 50
): Promise<StandardListResponse<GamificationEvent>> {
  const response = await apiClient.get<StandardListResponse<GamificationEvent>>(
    "/gamification/me/history",
    { params: { limit } }
  );
  return response.data;
}

export async function getMyBadges(): Promise<StandardListResponse<UserBadge>> {
  const response = await apiClient.get<StandardListResponse<UserBadge>>(
    "/gamification/me/badges"
  );
  return response.data;
}

export async function getAllBadges(
  activeOnly = true
): Promise<StandardListResponse<Badge>> {
  const response = await apiClient.get<StandardListResponse<Badge>>(
    "/gamification/badges",
    { params: { active_only: activeOnly } }
  );
  return response.data;
}

export async function getLeaderboard(
  period = "all_time",
  limit = 10
): Promise<StandardListResponse<LeaderboardEntry>> {
  const response = await apiClient.get<StandardListResponse<LeaderboardEntry>>(
    "/gamification/leaderboard",
    { params: { period, limit } }
  );
  return response.data;
}

export async function getTeamAnalytics(
  teamId: string
): Promise<StandardResponse<TeamAnalytics>> {
  const response = await apiClient.get<StandardResponse<TeamAnalytics>>(
    "/gamification/analytics/team",
    { params: { team_id: teamId } }
  );
  return response.data;
}

export async function getAlerts(
  teamId: string
): Promise<StandardListResponse<Alert>> {
  const response = await apiClient.get<StandardListResponse<Alert>>(
    "/gamification/analytics/alerts",
    { params: { team_id: teamId } }
  );
  return response.data;
}
