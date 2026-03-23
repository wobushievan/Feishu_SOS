import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { CapabilityService } from '@lark-apaas/fullstack-nestjs-core';
import { HttpService } from '@nestjs/axios';
import { eq, and, desc, count, like, or, sql, lt } from 'drizzle-orm';
import {
  safetyCheckEvent,
  employeeFeedback,
} from '../../database/schema';
import type {
  CreateEventRequest,
  CreateEventResponse,
  GetEventListParams,
  GetEventListResponse,
  GetEventDetailResponse,
  GetEventStatisticsResponse,
  GetFeedbackListParams,
  GetFeedbackListResponse,
  RemindUnrepliedResponse,
  GetFeedbackEventInfoResponse,
  SubmitFeedbackRequest,
  SubmitFeedbackResponse,
  DeleteEventResponse,
  EventStatus,
  FeedbackStatus,
  EventType,
  SendType,
  NotificationTarget,
} from '@shared/api.interface';
import { FeishuChatService } from './feishu-chat.service';
import { FeishuService } from './feishu.service';

type DiagnosticIdType = 'user_id' | 'open_id' | 'union_id' | 'user_profile' | 'chat_id' | 'user_id_or_open_id';
type ExpandedMemberSource = 'notificationScope.user.id' | 'FeishuChatService.getChatMembers(member_id_type=open_id)';
type FeedbackEntrySource = 'employee_feedback.employee_id.user_profile.user_id' | 'employee_feedback.employee_open_id';
type FeedbackRequestSource = 'api.feedback.query.userId' | 'feishu.card.action.trigger.operator';

interface ExpandedNotificationMember {
  id: string;
  department?: string;
  idType: 'user_id' | 'open_id';
  sourceField: ExpandedMemberSource;
}

interface SendNotificationLogContext {
  triggerSource: 'createEvent' | 'remindUnreplied';
  receiverSourceField: string;
  receiverIdTypeByValue: Record<string, DiagnosticIdType>;
}

@Injectable()
export class SafetyCheckService {
  private readonly logger = new Logger(SafetyCheckService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    @Inject() private readonly capabilityService: CapabilityService,
    @Inject() private readonly feishuChatService: FeishuChatService,
    @Inject() private readonly feishuService: FeishuService,
    @Inject() private readonly configService: ConfigService,
    @Inject() private readonly httpService: HttpService,
  ) {}

  private logStructured(message: string, payload: Record<string, unknown>): void {
    this.logger.log(`${message} ${JSON.stringify(payload)}`);
  }

  /**
   * 获取事件列表
   */
  async getEventList(params: GetEventListParams): Promise<GetEventListResponse> {
    const { status, page = 1, pageSize = 20 } = params;

    // 先更新已过期的 ongoing 事件状态
    await this.updateExpiredEvents();

    const conditions = [];
    if (status) {
      conditions.push(eq(safetyCheckEvent.status, status));
    }

    const query = conditions.length > 0
      ? this.db.select().from(safetyCheckEvent).where(and(...conditions))
      : this.db.select().from(safetyCheckEvent);

    const items = await query
      .orderBy(desc(safetyCheckEvent.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(safetyCheckEvent)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return {
      items: items.map(item => ({
        id: item.id,
        eventType: item.eventType as EventType,
        title: item.title,
        description: item.description || undefined,
        notificationScope: JSON.parse(item.notificationScope),
        sendType: item.sendType as SendType,
        sendTime: item.sendTime.toISOString(),
        deadlineTime: item.deadlineTime.toISOString(),
        status: item.status as EventStatus,
        creator: item.creator,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
  }

  /**
   * 展开通知对象，将群组转换为成员列表
   * 返回带部门信息的成员对象数组
   */
  private async expandNotificationScope(targets: NotificationTarget[]): Promise<ExpandedNotificationMember[]> {
    this.logger.log(`[expandNotificationScope] === 开始展开通知对象，targets数量: ${targets.length} ===`);
    this.logger.log(`[expandNotificationScope] 原始 targets: ${JSON.stringify(targets, null, 2)}`);
    this.logStructured('[expandNotificationScope] target diagnostics', {
      targetCount: targets.length,
      targets: targets.map((target, index) => ({
        index,
        targetType: target.type,
        sourceField: 'CreateEventRequest.notificationScope[].id',
        idValue: target.id,
        idType: target.type === 'user' ? 'user_id' : 'chat_id',
        departmentSourceField: target.type === 'user' ? 'CreateEventRequest.notificationScope[].department' : undefined,
        departmentValue: target.department,
      })),
    });

    // 直接选择的用户（带部门信息）
    const directUsers: ExpandedNotificationMember[] = [];
    const chatIds: string[] = [];

    // 区分用户和群组
    for (const target of targets) {
      if (target.type === 'user') {
        directUsers.push({
          id: target.id,
          department: target.department,
          idType: 'user_id',
          sourceField: 'notificationScope.user.id',
        });
      } else if (target.type === 'chat') {
        chatIds.push(target.id);
      }
    }

    this.logger.log(`[expandNotificationScope] 直接选择的用户: ${JSON.stringify(directUsers, null, 2)}`);
    this.logger.log(`[expandNotificationScope] 群组IDs: ${JSON.stringify(chatIds)}`);

    // 获取群组成员
    let chatMembers: string[] = [];
    if (chatIds.length > 0) {
      const chatMemberPromises = chatIds.map(chatId =>
        this.feishuChatService.getChatMembers(chatId)
      );
      const chatMembersArrays = await Promise.all(chatMemberPromises);
      chatMembers = chatMembersArrays.flat();
      this.logger.log(`[expandNotificationScope] 群组成员IDs: ${JSON.stringify(chatMembers)}`);
      this.logStructured('[expandNotificationScope] expanded chat members', {
        sourceField: 'FeishuChatService.getChatMembers(chatId)',
        returnIdField: 'member_id',
        returnIdType: 'open_id',
        chatCount: chatIds.length,
        chatIds,
        chatMembers,
      });
    }

    // 合并：直接选择的用户（带部门）+ 群组成员（需后续查询部门）
    const chatMemberObjects: ExpandedNotificationMember[] = chatMembers.map(id => ({
      id,
      department: undefined as string | undefined,
      idType: 'open_id',
      sourceField: 'FeishuChatService.getChatMembers(member_id_type=open_id)',
    }));
    const allMembers = [...directUsers, ...chatMemberObjects];

    // 去重（优先保留有部门信息的）
    const memberMap = new Map<string, ExpandedNotificationMember>();
    for (const member of allMembers) {
      const existing = memberMap.get(member.id);
      if (!existing || (!existing.department && member.department)) {
        memberMap.set(member.id, member);
      }
    }

    const result = Array.from(memberMap.values());
    // 关键：打印最终返回结果，确认是否为对象数组
    this.logger.log(`[expandNotificationScope] === 最终返回结果: ${JSON.stringify(result, null, 2)} ===`);
    this.logStructured('[expandNotificationScope] deduplicated members', {
      resultCount: result.length,
      members: result.map(member => ({
        idValue: member.id,
        idType: member.idType,
        sourceField: member.sourceField,
        department: member.department,
      })),
    });
    return result;
  }

  /**
   * 创建事件
   */
  async createEvent(dto: CreateEventRequest, creatorId: string, baseUrl?: string): Promise<CreateEventResponse> {
    const now = new Date();
    const sendTime = new Date(dto.sendTime);
    const deadlineTime = new Date(dto.deadlineTime);
    this.logStructured('[createEvent] request diagnostics', {
      creatorSourceField: 'req.userContext.userId',
      creatorId,
      creatorIdType: 'user_id',
      notificationTargetCount: dto.notificationScope.length,
      sendType: dto.sendType,
      baseUrlSource: baseUrl ? 'request-origin-base-url' : 'not-provided',
      baseUrlProvided: !!baseUrl,
    });

    // 确定事件状态
    let status: EventStatus = 'draft';
    if (sendTime <= now) {
      status = 'ongoing';
    }
    if (deadlineTime <= now) {
      status = 'completed';
    }

    // 展开群组为成员列表（带部门信息）
    const allMembers = await this.expandNotificationScope(dto.notificationScope);
    const allMemberIds = allMembers.map(m => m.id);
    
    // 打印关键数据结构
    this.logger.log(`[CreateEvent] allMemberIds: ${JSON.stringify(allMemberIds)}`);
    this.logger.log(`[CreateEvent] allMembers: ${JSON.stringify(allMembers, null, 2)}`);
    this.logStructured('[createEvent] expanded notification members', {
      notificationScopeStorageField: 'safety_check_event.notification_scope',
      notificationScopeStorageValueType: 'user_id_or_open_id[]',
      members: allMembers.map(member => ({
        idValue: member.id,
        idType: member.idType,
        sourceField: member.sourceField,
        department: member.department,
      })),
    });

    const [result] = await this.db
      .insert(safetyCheckEvent)
      .values({
        eventType: dto.eventType,
        title: dto.title,
        description: dto.description,
        notificationScope: JSON.stringify(allMemberIds),
        sendType: dto.sendType,
        sendTime,
        deadlineTime,
        status,
        creator: creatorId,
      })
      .returning({ id: safetyCheckEvent.id });

    // 找出没有部门信息的成员（通常是群组成员），需要查询飞书API兜底
    const membersNeedingInfo = allMembers.filter(m => !m.department);
    const membersWithDepartment = new Map(allMembers.filter(m => m.department).map(m => [m.id, m.department]));
    
    // 关键验证：打印 Map 的 key 和 allMemberIds 的值
    this.logger.log(`[CreateEvent] membersWithDepartment keys: ${JSON.stringify(Array.from(membersWithDepartment.keys()))}`);
    this.logger.log(`[CreateEvent] membersWithDepartment entries: ${JSON.stringify(Array.from(membersWithDepartment.entries()))}`);
    this.logger.log(`[CreateEvent] membersNeedingInfo count: ${membersNeedingInfo.length}, ids: ${JSON.stringify(membersNeedingInfo.map(m => m.id))}`);

    // 批量获取用户信息（姓名）- 所有人都需要名字，部门优先使用前端传入的
    this.logger.log(`Fetching user info for ${allMemberIds.length} employees`);
    const userInfoMap = await this.feishuService.batchGetUserInfo(allMemberIds);
    this.logger.log(`Got user info for ${userInfoMap.size} employees`);

    // 为没有部门的成员补充部门信息
    if (membersNeedingInfo.length > 0) {
      this.logger.log(`Fetching department for ${membersNeedingInfo.length} chat members`);
      for (const member of membersNeedingInfo) {
        const userInfo = userInfoMap.get(member.id);
        if (userInfo?.department) {
          membersWithDepartment.set(member.id, userInfo.department);
        }
      }
    }

    // 创建员工反馈记录
    const feedbackRecords = allMemberIds.map(id => {
      const userInfo = userInfoMap.get(id);
      const departmentFromFrontend = membersWithDepartment.get(id);
      const departmentFromBackend = userInfo?.department;
      const finalDepartment = departmentFromFrontend || departmentFromBackend || '';
      
      // 详细日志：对比各种 department 来源
      this.logger.log(`[CreateEvent] User ${id}: frontendDept=${departmentFromFrontend}, backendDept=${departmentFromBackend}, final=${finalDepartment}`);
      this.logStructured('[createEvent] feedback record diagnostics', {
        eventId: result.id,
        sourceIdValue: id,
        sourceIdType: allMembers.find(member => member.id === id)?.idType || 'user_id_or_open_id',
        sourceField: allMembers.find(member => member.id === id)?.sourceField || 'unknown',
        writeFields: {
          employeeId: {
            targetField: 'employee_feedback.employee_id.user_profile.user_id',
            value: id,
            storedType: 'user_profile',
          },
          employeeOpenId: {
            targetField: 'employee_feedback.employee_open_id',
            value: id,
            storedType: 'user_id_or_open_id',
          },
        },
        departmentSources: {
          frontend: departmentFromFrontend,
          backend: departmentFromBackend,
          final: finalDepartment,
        },
      });
      
      return {
        eventId: result.id,
        employeeId: id,
        employeeOpenId: id, // 同时保存到 open_id 字段，确保两种格式都能匹配
        employeeName: userInfo?.name || '', // 从飞书获取用户名
        department: finalDepartment,
        feedbackStatus: 'no_response' as FeedbackStatus,
        lastNotifyTime: now,
      };
    });
    
    this.logger.log(`[CreateEvent] Feedback records to insert: ${JSON.stringify(feedbackRecords.map(r => ({ id: r.employeeId, dept: r.department })), null, 2)}`);

    await this.db.insert(employeeFeedback).values(feedbackRecords);

    // 如果是立即发送，调用飞书插件发送通知
    if (dto.sendType === 'immediate' || sendTime <= now) {
      // 异步发送通知，不阻塞主流程
      this.sendNotification(result.id, allMemberIds, {
        title: dto.title,
        description: dto.description,
        deadlineTime: dto.deadlineTime,
      }, baseUrl, {
        triggerSource: 'createEvent',
        receiverSourceField: 'expandNotificationScope -> allMemberIds',
        receiverIdTypeByValue: Object.fromEntries(
          allMembers.map(member => [member.id, member.idType]),
        ),
      }).catch((error) => {
        this.logger.error(`发送飞书通知失败(事件已创建): ${error instanceof Error ? error.message : String(error)}`);
      });
    }

    return {
      id: result.id,
      success: true,
    };
  }

  /**
   * 更新已过期的 ongoing 事件状态为 completed
   */
  private async updateExpiredEvents(): Promise<void> {
    const now = new Date();
    await this.db
      .update(safetyCheckEvent)
      .set({
        status: 'completed',
        updatedAt: now,
      })
      .where(
        and(
          eq(safetyCheckEvent.status, 'ongoing'),
          lt(safetyCheckEvent.deadlineTime, now),
        ),
      );
  }

  /**
   * 获取事件详情
   */
  async getEventDetail(eventId: string): Promise<GetEventDetailResponse> {
    // 先更新已过期的 ongoing 事件状态
    await this.updateExpiredEvents();

    const [event] = await this.db
      .select()
      .from(safetyCheckEvent)
      .where(eq(safetyCheckEvent.id, eventId));

    if (!event) {
      throw new NotFoundException('事件不存在');
    }

    return {
      id: event.id,
      eventType: event.eventType as EventType,
      title: event.title,
      description: event.description || undefined,
      notificationScope: JSON.parse(event.notificationScope),
      sendType: event.sendType as SendType,
      sendTime: event.sendTime.toISOString(),
      deadlineTime: event.deadlineTime.toISOString(),
      status: event.status as EventStatus,
      creator: event.creator,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    };
  }

  /**
   * 获取事件统计
   */
  async getEventStatistics(eventId: string): Promise<GetEventStatisticsResponse> {
    const [event] = await this.db
      .select()
      .from(safetyCheckEvent)
      .where(eq(safetyCheckEvent.id, eventId));

    if (!event) {
      throw new NotFoundException('事件不存在');
    }

    const feedbacks = await this.db
      .select()
      .from(employeeFeedback)
      .where(eq(employeeFeedback.eventId, eventId));

    const total = feedbacks.length;
    const safe = feedbacks.filter(f => f.feedbackStatus === 'safe').length;
    const needHelp = feedbacks.filter(f => f.feedbackStatus === 'need_help').length;
    const notApplicable = feedbacks.filter(f => f.feedbackStatus === 'not_applicable').length;
    const replied = safe + needHelp + notApplicable;
    const unreplied = total - replied;

    return {
      total,
      replied,
      unreplied,
      safe,
      needHelp,
      notApplicable,
    };
  }

  /**
   * 获取员工反馈列表
   */
  async getFeedbackList(
    eventId: string,
    params: GetFeedbackListParams,
  ): Promise<GetFeedbackListResponse> {
    const { status, keyword, page = 1, pageSize = 20 } = params;

    const [event] = await this.db
      .select()
      .from(safetyCheckEvent)
      .where(eq(safetyCheckEvent.id, eventId));

    if (!event) {
      throw new NotFoundException('事件不存在');
    }

    const conditions = [eq(employeeFeedback.eventId, eventId)];

    if (status) {
      conditions.push(eq(employeeFeedback.feedbackStatus, status));
    }

    if (keyword) {
      conditions.push(
        or(
          like(employeeFeedback.employeeName, `%${keyword}%`),
          like(employeeFeedback.department, `%${keyword}%`),
        ),
      );
    }

    const query = conditions.length > 0
      ? this.db.select().from(employeeFeedback).where(and(...conditions))
      : this.db.select().from(employeeFeedback);

    let items = await query
      .orderBy(desc(employeeFeedback.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    // 自动补充缺失的部门信息
    const missingDeptItems = items.filter(item => !item.department || item.department === '');
    if (missingDeptItems.length > 0) {
      this.logger.log(`Found ${missingDeptItems.length} items missing department info, fetching from Feishu...`);
      const userIds = missingDeptItems.map(item => item.employeeId);
      const userInfoMap = await this.feishuService.batchGetUserInfo(userIds);

      // 更新数据库中的部门信息
      for (const item of missingDeptItems) {
        const userInfo = userInfoMap.get(item.employeeId);
        if (userInfo?.department) {
          await this.db
            .update(employeeFeedback)
            .set({ department: userInfo.department })
            .where(eq(employeeFeedback.id, item.id));
          // 更新内存中的数据
          item.department = userInfo.department;
          if (userInfo.name && !item.employeeName) {
            await this.db
              .update(employeeFeedback)
              .set({ employeeName: userInfo.name })
              .where(eq(employeeFeedback.id, item.id));
            item.employeeName = userInfo.name;
          }
        }
      }
    }

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(employeeFeedback)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return {
      items: items.map(item => ({
        id: item.id,
        eventId: item.eventId,
        employeeId: item.employeeId,
        employeeName: item.employeeName,
        department: item.department || undefined,
        feedbackStatus: item.feedbackStatus as FeedbackStatus,
        feedbackTime: item.feedbackTime?.toISOString(),
        lastNotifyTime: item.lastNotifyTime?.toISOString(),
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
  }

  /**
   * 提醒未回复员工
   */
  async remindUnreplied(eventId: string, baseUrl?: string): Promise<RemindUnrepliedResponse> {
    const [event] = await this.db
      .select()
      .from(safetyCheckEvent)
      .where(eq(safetyCheckEvent.id, eventId));

    if (!event) {
      throw new NotFoundException('事件不存在');
    }

    // 获取未回复的员工
    const unrepliedFeedbacks = await this.db
      .select()
      .from(employeeFeedback)
      .where(
        and(
          eq(employeeFeedback.eventId, eventId),
          eq(employeeFeedback.feedbackStatus, 'no_response'),
        ),
      );

    if (unrepliedFeedbacks.length === 0) {
      return {
        success: true,
        sentCount: 0,
        message: '没有需要提醒的员工',
      };
    }

    const receiverIds = unrepliedFeedbacks.map(f => f.employeeId);
    this.logStructured('[remindUnreplied] receiver diagnostics', {
      eventId,
      receiverSourceField: 'employee_feedback.employee_id.user_profile.user_id',
      receiverIdType: 'user_id_or_open_id',
      receiverIds,
      feedbackRecordCount: unrepliedFeedbacks.length,
    });

    // 调用飞书插件发送提醒
    await this.sendNotification(eventId, receiverIds, {
      title: `[提醒] ${event.title}`,
      description: event.description || '',
      deadlineTime: event.deadlineTime.toISOString(),
    }, baseUrl, {
      triggerSource: 'remindUnreplied',
      receiverSourceField: 'employee_feedback.employee_id.user_profile.user_id',
      receiverIdTypeByValue: Object.fromEntries(
        receiverIds.map(receiverId => [receiverId, 'user_id_or_open_id' as DiagnosticIdType]),
      ),
    });

    // 更新最后通知时间
    const now = new Date();
    await this.db
      .update(employeeFeedback)
      .set({ lastNotifyTime: now })
      .where(
        and(
          eq(employeeFeedback.eventId, eventId),
          eq(employeeFeedback.feedbackStatus, 'no_response'),
        ),
      );

    return {
      success: true,
      sentCount: receiverIds.length,
      message: `已成功提醒 ${receiverIds.length} 位员工`,
    };
  }

  /**
   * 获取员工反馈页事件信息
   */
  async getFeedbackEventInfo(
    eventId: string,
    employeeId: string,
    requestSource: FeedbackRequestSource = 'api.feedback.query.userId',
  ): Promise<GetFeedbackEventInfoResponse> {
    this.logStructured('[getFeedbackEventInfo] lookup diagnostics', {
      eventId,
      requestSource,
      inputField: requestSource === 'api.feedback.query.userId' ? 'feedback page query userId' : 'feishu callback operator',
      inputValue: employeeId,
      inputIdType: 'user_id_or_open_id',
      lookupField: 'employee_feedback.employee_id.user_profile.user_id',
      lookupFieldType: 'user_profile',
      fallbackLookup: 'none',
    });

    const [event] = await this.db
      .select()
      .from(safetyCheckEvent)
      .where(eq(safetyCheckEvent.id, eventId));

    if (!event) {
      throw new NotFoundException('事件不存在');
    }

    const [feedback] = await this.db
      .select()
      .from(employeeFeedback)
      .where(
        and(
          eq(employeeFeedback.eventId, eventId),
          eq(sql`((employee_feedback.employee_id).user_id)`, employeeId),
        ),
      );

    this.logStructured('[getFeedbackEventInfo] lookup result', {
      eventId,
      requestSource,
      inputValue: employeeId,
      matched: !!feedback,
      matchedField: feedback ? 'employee_feedback.employee_id.user_profile.user_id' : 'none',
      currentFeedbackStatus: feedback?.feedbackStatus,
    });

    return {
      id: event.id,
      title: event.title,
      description: event.description || undefined,
      deadlineTime: event.deadlineTime.toISOString(),
      alreadySubmitted: !!feedback && feedback.feedbackStatus !== 'no_response',
      currentStatus: feedback?.feedbackStatus as FeedbackStatus | undefined,
    };
  }

  /**
   * 提交员工反馈
   */
  async submitFeedback(
    eventId: string,
    employeeId: string,
    dto: SubmitFeedbackRequest,
    requestSource: FeedbackRequestSource = 'api.feedback.query.userId',
  ): Promise<SubmitFeedbackResponse> {
    this.logStructured('[submitFeedback] request diagnostics', {
      eventId,
      requestSource,
      inputField: requestSource === 'api.feedback.query.userId' ? 'feedback page query userId' : 'feishu callback resolved operator id',
      inputValue: employeeId,
      inputIdType: 'user_id_or_open_id',
      submitStatus: dto.status,
      firstMatchField: 'employee_feedback.employee_id.user_profile.user_id',
      fallbackMatchField: 'employee_feedback.employee_open_id',
    });

    const [event] = await this.db
      .select()
      .from(safetyCheckEvent)
      .where(eq(safetyCheckEvent.id, eventId));

    if (!event) {
      throw new NotFoundException('事件不存在');
    }

    // 检查是否已截止
    if (new Date() > event.deadlineTime) {
      return {
        success: false,
        message: '事件已截止，无法提交反馈',
      };
    }

    const now = new Date();

    let matchedBy: FeedbackEntrySource | 'none' = 'none';

    // 先尝试用 employeeId (平台用户ID) 匹配
    let result = await this.db
      .update(employeeFeedback)
      .set({
        feedbackStatus: dto.status,
        feedbackTime: now,
      })
      .where(
        and(
          eq(employeeFeedback.eventId, eventId),
          eq(sql`((employee_feedback.employee_id).user_id)`, employeeId),
        ),
      )
      .returning({ id: employeeFeedback.id });

    this.logStructured('[submitFeedback] primary match result', {
      eventId,
      requestSource,
      inputValue: employeeId,
      matchField: 'employee_feedback.employee_id.user_profile.user_id',
      matchFieldType: 'user_profile',
      updatedCount: result.length,
    });
    if (result.length > 0) {
      matchedBy = 'employee_feedback.employee_id.user_profile.user_id';
    }

    // 如果没有匹配到，尝试用 employeeOpenId (飞书 open_id) 匹配
    if (result.length === 0) {
      result = await this.db
        .update(employeeFeedback)
        .set({
          feedbackStatus: dto.status,
          feedbackTime: now,
        })
        .where(
          and(
            eq(employeeFeedback.eventId, eventId),
            eq(employeeFeedback.employeeOpenId, employeeId),
          ),
        )
        .returning({ id: employeeFeedback.id });

      this.logStructured('[submitFeedback] fallback match result', {
        eventId,
        requestSource,
        inputValue: employeeId,
        matchField: 'employee_feedback.employee_open_id',
        matchFieldType: 'open_id field with mixed stored values',
        updatedCount: result.length,
      });
      if (result.length > 0) {
        matchedBy = 'employee_feedback.employee_open_id';
      }
    }

    // 检查是否有记录被更新
    if (result.length === 0) {
      this.logStructured('[submitFeedback] final result', {
        eventId,
        requestSource,
        inputValue: employeeId,
        matchedField: 'none',
        success: false,
      });
      return {
        success: false,
        message: '您不在该事件的接收人列表中，无法提交反馈',
      };
    }

    this.logStructured('[submitFeedback] final result', {
      eventId,
      requestSource,
      inputValue: employeeId,
      matchedField: matchedBy,
      success: true,
    });
    return {
      success: true,
      message: '反馈已提交，感谢您的配合',
    };
  }

  /**
   * 导出反馈名单
   */
  async exportFeedbackList(eventId: string) {
    const [event] = await this.db
      .select()
      .from(safetyCheckEvent)
      .where(eq(safetyCheckEvent.id, eventId));

    if (!event) {
      throw new NotFoundException('事件不存在');
    }

    const feedbacks = await this.db
      .select()
      .from(employeeFeedback)
      .where(eq(employeeFeedback.eventId, eventId))
      .orderBy(desc(employeeFeedback.createdAt));

    // 自动补充缺失的员工姓名（与 getFeedbackList 保持一致）
    const missingNameItems = feedbacks.filter(
      item => !item.employeeName || item.employeeName === ''
    );
    if (missingNameItems.length > 0) {
      this.logger.log(`[ExportFeedback] Found ${missingNameItems.length} items missing employee name, fetching from Feishu...`);
      const userIds = missingNameItems.map(item => item.employeeId);
      const userInfoMap = await this.feishuService.batchGetUserInfo(userIds);

      for (const item of missingNameItems) {
        const userInfo = userInfoMap.get(item.employeeId);
        if (userInfo?.name) {
          // 更新数据库
          await this.db
            .update(employeeFeedback)
            .set({ employeeName: userInfo.name })
            .where(eq(employeeFeedback.id, item.id));
          // 更新内存数据
          item.employeeName = userInfo.name;
          this.logger.log(`[ExportFeedback] Updated employee name for ${item.employeeId}: ${userInfo.name}`);
        }
      }
    }

    return feedbacks.map(f => ({
      员工姓名: f.employeeName,
      部门: f.department || '-',
      反馈状态: this.translateStatus(f.feedbackStatus),
      反馈时间: f.feedbackTime ? f.feedbackTime.toLocaleString('zh-CN') : '-',
      最后通知时间: f.lastNotifyTime ? f.lastNotifyTime.toLocaleString('zh-CN') : '-',
    }));
  }

  /**
   * 发送飞书通知
   * 直接调用飞书 API 发送交互式卡片，员工点击按钮后直接在飞书内提交反馈
   */
  /**
   * 清理用户ID格式，去掉括号
   */
  private cleanUserId(userId: string): string {
    // 去掉括号和空格
    return userId.replace(/[()]/g, '').trim();
  }

  private async sendNotification(
    eventId: string,
    receiverIds: string[],
    eventData: {
      title: string;
      description?: string;
      deadlineTime: string;
    },
    appBaseUrl?: string,
    logContext?: SendNotificationLogContext,
  ): Promise<void> {
    try {
      this.logger.log(`[sendNotification] 开始发送通知，receiverIds数量: ${receiverIds.length}`);
      this.logger.log(`[sendNotification] receiverIds原始值: ${JSON.stringify(receiverIds)}`);
      this.logger.log(`[sendNotification] appBaseUrl: ${appBaseUrl || '未提供'}`);
      this.logStructured('[sendNotification] receiver diagnostics', {
        eventId,
        triggerSource: logContext?.triggerSource || 'unknown',
        receiverSourceField: logContext?.receiverSourceField || 'unknown',
        receiverIds: receiverIds.map(receiverId => ({
          value: receiverId,
          idType: logContext?.receiverIdTypeByValue[receiverId] || 'user_id_or_open_id',
        })),
      });

      if (receiverIds.length === 0) {
        this.logger.warn('[sendNotification] 没有接收者，跳过发送');
        return;
      }

      const cleanReceiverEntries = receiverIds.map(receiverId => ({
        rawId: receiverId,
        cleanId: this.cleanUserId(receiverId),
        idType: logContext?.receiverIdTypeByValue[receiverId] || 'user_id_or_open_id',
      }));
      const cleanReceiverIds = cleanReceiverEntries.map(entry => entry.cleanId);
      this.logger.log(`[sendNotification] 清理后的receiverIds: ${JSON.stringify(cleanReceiverIds)}`);
      this.logStructured('[sendNotification] cleaned receiver diagnostics', {
        eventId,
        cleanedReceivers: cleanReceiverEntries,
      });

      if (cleanReceiverIds.length === 0) {
        this.logger.warn('[sendNotification] 没有有效的接收者，跳过发送');
        return;
      }

      this.logger.log(`[sendNotification] 开始发送飞书卡片消息，共 ${cleanReceiverIds.length} 位员工`);

      // 使用传入的 appBaseUrl，如果没有则使用环境变量作为兜底
      const finalBaseUrl = appBaseUrl || process.env.APP_BASE_URL || '';
      
      if (!finalBaseUrl) {
        throw new Error('无法确定应用基础 URL，请检查配置');
      }

      this.logger.log(`[sendNotification] 使用 baseUrl: ${finalBaseUrl}`);

      // 使用官方插件逐个发送，为每个接收人生成专属 URL
      const BATCH_SIZE = 5; // 控制并发，避免限流
      
      for (let i = 0; i < cleanReceiverIds.length; i += BATCH_SIZE) {
        const batch = cleanReceiverEntries.slice(i, i + BATCH_SIZE);
        
        await Promise.all(
          batch.map(async ({ rawId, cleanId, idType }) => {
            // 为每个接收人生成专属反馈 URL（包含 userId）
            const feedbackUrl = `${finalBaseUrl}/feedback/events/${eventId}?userId=${cleanId}`;
            
            this.logger.log(`[sendNotification] 发送给 receiverId=${cleanId}, URL=${feedbackUrl}`);
            this.logStructured('[sendNotification] per receiver payload', {
              eventId,
              triggerSource: logContext?.triggerSource || 'unknown',
              rawReceiverId: rawId,
              receiverId: cleanId,
              receiverIdType: idType,
              receiverSourceField: logContext?.receiverSourceField || 'unknown',
              feedbackUrlUserIdSource: 'same as cleaned receiverId',
              feedbackUrl,
            });
            
            try {
              const result = await this.capabilityService
                .load('send_security_checkin_notification')
                .call('send_feishu_message', {
                  receiverIds: [cleanId], // 单个接收人
                  eventTitle: eventData.title,
                  eventDescription: eventData.description || '',
                  eventId: eventId,
                  deadlineTime: eventData.deadlineTime,
                  baseUrl: feedbackUrl, // 专属 URL（作为 baseUrl 传入）
                });
              
              this.logger.log(`[sendNotification] 成功发送给 ${cleanId}, result=${JSON.stringify(result)}`);
              this.logStructured('[sendNotification] capability invocation metadata', {
                eventId,
                rawReceiverId: rawId,
                receiverId: cleanId,
                receiverIdType: idType,
                capabilityName: 'send_security_checkin_notification',
                methodName: 'send_feishu_message',
                capabilityReceiverField: 'receiverIds',
                receiveIdTypeDeclaredInCode: 'not_explicitly_declared',
              });
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              this.logger.error(`[sendNotification] 发送给 ${cleanId} 失败: ${errorMsg}`);
              // 单个失败不影响其他，继续发送
            }
          })
        );
        
        // 批次间隔，避免限流
        if (i + BATCH_SIZE < cleanReceiverIds.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      this.logger.log(`[sendNotification] 完成发送通知`);
    } catch (outerError) {
      const errorMsg = outerError instanceof Error ? outerError.message : String(outerError);
      this.logger.error(`发送飞书通知失败: ${errorMsg}`);
      throw new Error(`发送飞书通知失败: ${errorMsg}`);
    }
  }

  /**
   * 构建交互式卡片（带 callback 按钮）
   */
  private buildInteractiveCard(
    eventId: string,
    eventData: {
      title: string;
      description: string;
      deadlineTime: string;
    },
  ): Record<string, unknown> {
    return {
      schema: '2.0',
      config: { update_multi: true },
      header: {
        template: 'orange',
        title: { content: eventData.title, tag: 'plain_text' },
      },
      body: {
        direction: 'vertical',
        elements: [
          {
            tag: 'markdown',
            content: `${eventData.description}\n\n**反馈截止时间：** ${eventData.deadlineTime}\n\n请点击下方按钮反馈您当前状态：`,
            text_size: 'normal',
            margin: '0px 0px 0px 0px',
          },
          {
            tag: 'column_set',
            flex_mode: 'stretch',
            horizontal_spacing: '8px',
            columns: [
              {
                tag: 'column',
                width: 'auto',
                elements: [
                  {
                    tag: 'button',
                    text: { tag: 'plain_text', content: '我安全' },
                    type: 'primary',
                    width: 'default',
                    size: 'medium',
                    behaviors: [
                      {
                        type: 'callback',
                        value: {
                          eventId,
                          status: 'safe',
                          title: eventData.title,
                        },
                      },
                    ],
                    margin: '4px 0px 4px 0px',
                  },
                ],
                vertical_spacing: '8px',
              },
              {
                tag: 'column',
                width: 'auto',
                elements: [
                  {
                    tag: 'button',
                    text: { tag: 'plain_text', content: '我需要帮助' },
                    type: 'danger',
                    width: 'default',
                    size: 'medium',
                    behaviors: [
                      {
                        type: 'callback',
                        value: {
                          eventId,
                          status: 'need_help',
                          title: eventData.title,
                        },
                      },
                    ],
                    margin: '4px 0px 4px 0px',
                  },
                ],
                vertical_spacing: '8px',
              },
              {
                tag: 'column',
                width: 'auto',
                elements: [
                  {
                    tag: 'button',
                    text: { tag: 'plain_text', content: '不在阿联酋' },
                    type: 'default',
                    width: 'default',
                    size: 'medium',
                    behaviors: [
                      {
                        type: 'callback',
                        value: {
                          eventId,
                          status: 'not_applicable',
                          title: eventData.title,
                        },
                      },
                    ],
                    margin: '4px 0px 4px 0px',
                  },
                ],
                vertical_spacing: '8px',
              },
            ],
            margin: '0px 0px 0px 0px',
          },
          {
            tag: 'hr',
            margin: '0px 0px 0px 0px',
          },
          {
            tag: 'markdown',
            content: '来自 **员工安全确认工具**',
            text_align: 'left',
            text_size: 'normal_v2',
            margin: '0px 0px 0px 0px',
          },
        ],
      },
    };
  }

  /**
   * 构建通知卡片
   */
  private buildNotificationCard(
    eventId: string,
    eventData: {
      eventType: string;
      title: string;
      description?: string;
      deadlineTime: string;
    },
  ): Record<string, unknown> {
    const deadlineStr = new Date(eventData.deadlineTime).toLocaleString('zh-CN');

    return {
      config: { wide_screen_mode: true },
      header: {
        template: eventData.eventType === 'emergency' ? 'red' : 'orange',
        title: {
          content: eventData.title,
          tag: 'plain_text',
        },
      },
      elements: [
        // 事件描述
        ...(eventData.description
          ? [
              {
                tag: 'div',
                text: {
                  content: eventData.description,
                  tag: 'plain_text',
                },
              } as Record<string, unknown>,
            ]
          : []),
        // 截止时间
        {
          tag: 'div',
          text: {
            content: `**反馈截止时间：** ${deadlineStr}`,
            tag: 'lark_md',
          },
        },
        // 分隔线
        { tag: 'hr' },
        // 提示文字
        {
          tag: 'div',
          text: {
            content: '请点击下方按钮反馈您当前状态：',
            tag: 'plain_text',
          },
        },
        // 操作按钮
        {
          tag: 'action',
          actions: [
            {
              tag: 'button',
              text: { tag: 'plain_text', content: '我安全' },
              type: 'primary',
              value: {
                eventId,
                status: 'safe',
                title: eventData.title,
              },
            },
            {
              tag: 'button',
              text: { tag: 'plain_text', content: '我需要帮助' },
              type: 'danger',
              value: {
                eventId,
                status: 'need_help',
                title: eventData.title,
              },
            },
            {
              tag: 'button',
              text: { tag: 'plain_text', content: '我不在阿联酋本地' },
              type: 'default',
              value: {
                eventId,
                status: 'not_applicable',
                title: eventData.title,
              },
            },
          ],
        },
      ],
    };
  }

  /**
   * 状态翻译
   */
  private translateStatus(status: string): string {
    const statusMap: Record<string, string> = {
      safe: '我安全',
      need_help: '我需要帮助',
      not_applicable: '我不在阿联酋本地',
      no_response: '未回复',
    };
    return statusMap[status] || status;
  }

  /**
   * 删除事件
   */
  async deleteEvent(eventId: string): Promise<DeleteEventResponse> {
    const [event] = await this.db
      .select()
      .from(safetyCheckEvent)
      .where(eq(safetyCheckEvent.id, eventId));

    if (!event) {
      throw new NotFoundException('事件不存在');
    }

    // 删除事件（级联删除关联的反馈数据，由外键约束处理）
    await this.db
      .delete(safetyCheckEvent)
      .where(eq(safetyCheckEvent.id, eventId));

    this.logger.log(`事件已删除: ${eventId}`);

    return {
      success: true,
      message: '事件已成功删除',
    };
  }

  /**
   * 根据用户ID列表获取邮箱列表
   * 调用平台内置 API 获取用户邮箱
   */
  private async getUserEmailsByIds(userIds: string[]): Promise<string[]> {
    const emails: string[] = [];
    
    // 获取平台基础 URL
    const baseUrl = process.env.PLATFORM_API_URL || 'http://localhost:3000';
    
    for (const userId of userIds) {
      try {
        // 调用平台内置 API 获取用户详情
        const response = await this.httpService.axiosRef.get(
          `${baseUrl}/api/platform/users/${userId}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        
        const userData = response.data;
        if (userData?.email) {
          emails.push(userData.email);
          this.logger.log(`[getUserEmailsByIds] 获取到用户 ${userId} 的邮箱: ${userData.email}`);
        } else {
          this.logger.warn(`[getUserEmailsByIds] 用户 ${userId} 没有邮箱信息`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(`[getUserEmailsByIds] 获取用户 ${userId} 信息失败: ${errorMsg}`);
      }
    }
    
    return emails;
  }
}
