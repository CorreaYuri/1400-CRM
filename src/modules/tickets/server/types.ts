export type ListPagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};
export type TicketListItem = {
  id: string;
  customer: string;
  subject: string;
  inbox: string;
  status: string;
  owner: string;
  ownerAvatarUrl: string | null;
  priority: string;
  schedule: string;
  riskLabel: string | null;
  riskTone: "critical" | "warning" | null;
};

export type TicketListFilters = {
  search: string;
  inbox: string;
  priority: string;
  owner: string;
  status: string;
};

export type TicketListFilterOptions = {
  inboxes: string[];
  priorities: string[];
  owners: string[];
  statuses: string[];
};

export type TicketUserSummary = {
  id?: string;
  name: string;
  avatarUrl: string | null;
};

export type TicketAssigneeOption = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type TicketAttachmentSummary = {
  id: string;
  name: string;
  url: string;
  contentType: string;
  sizeLabel: string;
  downloadName: string;
};

export type TicketTimelineItem = {
  time: string;
  title: string;
  description: string;
  author: TicketUserSummary;
  attachments: TicketAttachmentSummary[];
  isAttachmentOnly: boolean;
};

export type ChildTicketSummary = {
  id: string;
  inbox: string;
  status: string;
  subject: string;
};

export type TodayQueueItem = {
  id: string;
  customer: string;
  subject: string;
  inbox: string;
  status: string;
  owner: string;
  priority: string;
  source: string;
  sourceKey: "NEW_TODAY" | "SCHEDULED_TODAY";
  dueLabel: string;
  actionHint: string;
};

export type TodayQueueFilters = {
  search: string;
  source: "ALL" | "NEW_TODAY" | "SCHEDULED_TODAY";
  inbox: string;
  priority: string;
  owner: string;
};

export type TodayQueueFilterOptions = {
  inboxes: string[];
  priorities: string[];
  owners: string[];
};

export type TicketDetail = {
  id: string;
  customer: string;
  subject: string;
  description: string;
  inbox: string;
  inboxId: string;
  status: string;
  owner: TicketUserSummary | null;
  priority: string;
  origin: string;
  createdAt: string;
  nextAction: string;
  agreement: string;
  parentTicketId: string | null;
  childTickets: ChildTicketSummary[];
  timeline: TicketTimelineItem[];
  timelinePagination: ListPagination | null;
  canOperate: boolean;
};

export type InboxOverview = {
  name: string;
  queue: string;
  team: string;
  sla: string;
};

export type InboxOption = {
  id: string;
  name: string;
};

export type ScheduleItem = {
  ticket: string;
  customer: string;
  due: string;
  owner: string;
  action: string;
};
