/**
 * 员工紧急安全确认工具 - 前后端共享类型定义
 */

// ============================================
// 基础枚举类型
// ============================================

/** 事件类型 */
export type EventType = 'daily' | 'emergency';

/** 事件状态 */
export type EventStatus = 'draft' | 'ongoing' | 'completed';

/** 发送类型 */
export type SendType = 'immediate' | 'scheduled';

/** 通知对象类型 */
export type NotificationTargetType = 'user' | 'chat';

/** 通知对象 */
export interface NotificationTarget {
  id: string;
  type: NotificationTargetType;
  name?: string;
  department?: string;  // 部门信息，前端选人时已获取
}

/** 反馈状态 */
export type FeedbackStatus = 'safe' | 'need_help' | 'not_applicable' | 'no_response';

// ============================================
// 数据模型类型
// ============================================

/** 安全点名事件 */
export interface SafetyCheckEvent {
  id: string;
  eventType: EventType;
  title: string;
  description?: string;
  notificationScope: string[];
  sendType: SendType;
  sendTime: string;
  deadlineTime: string;
  status: EventStatus;
  creator: string;
  createdAt: string;
  updatedAt: string;
}

/** 员工反馈 */
export interface EmployeeFeedback {
  id: string;
  eventId: string;
  employeeId: string;
  employeeName: string;
  department?: string;
  feedbackStatus: FeedbackStatus;
  feedbackTime?: string;
  lastNotifyTime?: string;
  createdAt: string;
  updatedAt: string;
}

/** 事件统计数据 */
export interface EventStatistics {
  total: number;
  replied: number;
  unreplied: number;
  safe: number;
  needHelp: number;
  notApplicable: number;
}

// ============================================
// API 请求/响应类型
// ============================================

// -------- 事件列表页 --------

/** 获取事件列表请求参数 */
export interface GetEventListParams {
  status?: EventStatus;
  page?: number;
  pageSize?: number;
}

/** 获取事件列表响应 */
export interface GetEventListResponse {
  items: SafetyCheckEvent[];
  total: number;
  page: number;
  pageSize: number;
}

/** 创建事件请求 */
export interface CreateEventRequest {
  eventType: EventType;
  title: string;
  description?: string;
  notificationScope: NotificationTarget[];
  sendType: SendType;
  sendTime: string;
  deadlineTime: string;
}

/** 创建事件响应 */
export interface CreateEventResponse {
  id: string;
  success: boolean;
}

/** 删除事件响应 */
export interface DeleteEventResponse {
  success: boolean;
  message: string;
}

// -------- 事件详情看板 --------

/** 获取事件详情响应 */
export interface GetEventDetailResponse extends SafetyCheckEvent {
  creatorName?: string;
}

/** 获取事件统计响应 */
export interface GetEventStatisticsResponse extends EventStatistics {}

/** 获取员工反馈列表请求参数 */
export interface GetFeedbackListParams {
  status?: FeedbackStatus;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

/** 获取员工反馈列表响应 */
export interface GetFeedbackListResponse {
  items: EmployeeFeedback[];
  total: number;
  page: number;
  pageSize: number;
}

/** 提醒未回复员工响应 */
export interface RemindUnrepliedResponse {
  success: boolean;
  sentCount: number;
  message: string;
}

// -------- 员工反馈页 --------

/** 获取员工反馈页事件信息响应 */
export interface GetFeedbackEventInfoResponse {
  id: string;
  title: string;
  description?: string;
  deadlineTime: string;
  alreadySubmitted: boolean;
  currentStatus?: FeedbackStatus;
}

/** 提交员工反馈请求 */
export interface SubmitFeedbackRequest {
  status: Exclude<FeedbackStatus, 'no_response'>;
}

/** 提交员工反馈响应 */
export interface SubmitFeedbackResponse {
  success: boolean;
  message: string;
}

// ============================================
// 飞书消息卡片类型
// ============================================

/** 飞书消息卡片配置 */
export interface FeishuMessageCard {
  receiverIds: string[];
  eventTitle: string;
  eventDescription?: string;
  feedbackUrl: string;
  deadlineTime: string;
}

/** 搜索群组请求 */
export interface SearchChatsParams {
  query: string;
  pageSize?: number;
}

/** 群组信息 */
export interface ChatInfo {
  id: string;
  name: string;
  description?: string;
  memberCount?: number;
}

/** 搜索群组响应 */
export interface SearchChatsResponse {
  items: ChatInfo[];
}

// ============================================
// 翻译管理相关类型
// ============================================

/** 翻译命名空间 */
export type TranslationNamespace = 'common' | 'event' | 'feedback' | 'validation';

/** 语言代码 */
export type LanguageCode = 'zh' | 'en';

/** 翻译条目 */
export interface TranslationItem {
  id: string;
  namespace: TranslationNamespace;
  language: LanguageCode;
  keyPath: string;
  value: string;
  updatedAt: string;
}

/** 翻译树节点 */
export interface TranslationTreeNode {
  key: string;
  label: string;
  value?: string;
  children?: TranslationTreeNode[];
  isLeaf?: boolean;
}

/** 获取所有翻译响应 */
export interface GetTranslationsResponse {
  [namespace: string]: {
    [language: string]: Record<string, unknown>;
  };
}

/** 获取指定命名空间翻译响应 */
export interface GetNamespaceTranslationsResponse {
  [language: string]: Record<string, unknown>;
}

/** 更新翻译请求 */
export interface UpdateTranslationRequest {
  namespace: TranslationNamespace;
  language: LanguageCode;
  keyPath: string;
  value: string;
}

/** 更新翻译响应 */
export interface UpdateTranslationResponse {
  success: boolean;
  item: TranslationItem;
}

/** 批量更新翻译请求 */
export interface BatchUpdateTranslationRequest {
  items: Array<{
    namespace: TranslationNamespace;
    language: LanguageCode;
    keyPath: string;
    value: string;
  }>;
}

/** 批量更新翻译响应 */
export interface BatchUpdateTranslationResponse {
  success: boolean;
  updatedCount: number;
}

/** 重置翻译响应 */
export interface ResetTranslationResponse {
  success: boolean;
  message: string;
}
