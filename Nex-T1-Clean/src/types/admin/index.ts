export interface AdminStatusResponse {
  authenticated: boolean
  expires_at?: string | null
  session_id?: string | null
  last_verified_at?: string | null
  error?: string
}

export interface AdminAnalyticsOverview {
  total_users: number
  admins: number
  blacklisted_users: number
  active_users_7d: number
  wallet_count: number
  total_wallet_balance_usd: number
  prompts_24h: number
  traffic_events_24h: number
  support_tickets_open: number
}

export interface AdminUserSummary {
  id: number
  email?: string | null
  role: string
  is_blacklisted: boolean
  created_at: string
  session_count: number
  last_session_at?: string | null
  wallet_count: number
  has_active_subscription: boolean
}

export interface AdminUserListResponse {
  results: AdminUserSummary[]
  page: number
  page_size: number
  total: number
}

export interface AdminUserDetail {
  id: number
  email?: string | null
  role: string
  is_blacklisted: boolean
  created_at: string
  deleted_at?: string | null
  session_count: number
  last_session_at?: string | null
  wallets: {
    id: number
    chain: string
    address: string
    normalized_address: string
    label?: string | null
    is_primary: boolean
    verified: boolean
  }[]
  subscriptions: {
    id: number
    plan_id: string
    status: string
    trial_ends_at?: string | null
    renewal_at?: string | null
    canceled_at?: string | null
    metadata?: Record<string, UntypedJson> | null
  }[]
  recent_sessions: {
    id: string
    created_at: string
    name?: string | null
  }[]
}

export interface AdminUserBlacklistResponse {
  user_id: number
  is_blacklisted: boolean
  event_id?: number | null
}

export interface AdminSessionRevokeResponse {
  session_id: string
  revoked: boolean
}

export interface AdminPromptLog {
  id: number
  created_at: string
  prompt: string
  detected_topics?: string[] | null
  model?: string | null
  tokens_prompt: number
  tokens_completion: number
}

export interface AdminPromptLogListResponse {
  results: AdminPromptLog[]
  total: number
}

export interface AdminSupportMessage {
  id: number
  created_at: string
  author_type: string
  author_id?: number | null
  content: string
}

export interface AdminSupportTicket {
  id: number
  created_at: string
  status: string
  subject: string
  classification?: string | null
  priority?: string | null
  assigned_admin_id?: number | null
  last_message_at?: string | null
  messages: AdminSupportMessage[]
}

export interface AdminSupportTicketListResponse {
  results: AdminSupportTicket[]
  total: number
}

export interface AdminAuditLogEntry {
  id: number
  created_at: string
  admin_user_id: number
  admin_user_email?: string | null
  action: string
  resource_type?: string | null
  resource_id?: string | null
  metadata?: Record<string, UntypedJson> | null
  ip?: string | null
  user_agent?: string | null
}

export interface AdminAuditLogListResponse {
  results: AdminAuditLogEntry[]
  total: number
}
