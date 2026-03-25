export type NavigationItem = {
  label: string;
  href: string;
  count?: string;
};

export type QueueTicket = {
  id: string;
  customer: string;
  subject: string;
  inbox: string;
  status: string;
  schedule: string;
  owner: string;
  ownerAvatarUrl: string | null;
  priority: string;
  riskLabel: string | null;
  riskTone: "critical" | "warning" | null;
};

export type TicketUserSummary = {
  name: string;
  avatarUrl: string | null;
};

export type TimelineItem = {
  time: string;
  title: string;
  description: string;
  author: TicketUserSummary;
};

export type SummaryItem = {
  label: string;
  value: string;
};

export type StatItem = {
  label: string;
  value: string;
  detail: string;
};

export type SelectedTicket = {
  id: string;
  customer: string;
  subject: string;
  inbox: string;
  status: string;
  origin: string;
  owner: TicketUserSummary | null;
  createdAt: string;
  nextAction: string;
  agreement: string;
};

export type DashboardAlert = {
  title: string;
  value: string;
  detail: string;
  href: string;
};

