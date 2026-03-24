import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  NotFoundException,
  UnauthorizedException,
  Inject,
  Logger,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { SafetyCheckService } from './safety-check.service';
import { FeishuChatService } from './feishu-chat.service';
import { FeishuService } from './feishu.service';
import type { Request, Response } from 'express';
import type {
  CreateEventRequest,
  GetEventListParams,
  GetFeedbackListParams,
  SubmitFeedbackRequest,
} from '@shared/api.interface';

@Controller('api/safety-check-events')
export class SafetyCheckController {
  private readonly logger = new Logger(SafetyCheckController.name);
  
  constructor(
    private readonly safetyCheckService: SafetyCheckService,
    @Inject() private readonly feishuChatService: FeishuChatService,
    @Inject() private readonly feishuService: FeishuService,
  ) {}

  /**
   * 获取事件列表
   */
  @Get()
  async getEventList(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const params: GetEventListParams = {
      status: status as any,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    };
    return this.safetyCheckService.getEventList(params);
  }

  /**
   * 创建事件
   */
  @NeedLogin()
  @Post()
  async createEvent(
    @Body() dto: CreateEventRequest,
    @Req() req: Request,
  ) {
    const creatorId = req.userContext?.userId;

    if (!creatorId) {
      throw new UnauthorizedException('当前请求缺少登录用户信息');
    }
    
    this.logger.log(`[CreateEvent Controller] Received notificationScope: ${JSON.stringify(dto.notificationScope)}`);
    
    // 动态计算应用基础 URL: origin + req.originalUrl 中 /api/ 前的路径
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const origin = `${protocol}://${host}`;
    // 从 originalUrl 中提取 /api/ 前的路径部分
    const originalUrl = req.originalUrl || req.url || '';
    const pathPrefix = originalUrl.split('/api/')[0];
    const appBaseUrl = `${origin}${pathPrefix}`;
    return this.safetyCheckService.createEvent(dto, creatorId, appBaseUrl);
  }

  /**
   * 获取事件详情
   */
  @Get(':id')
  async getEventDetail(@Param('id') id: string) {
    return this.safetyCheckService.getEventDetail(id);
  }

  /**
   * 获取事件统计
   */
  @Get(':id/statistics')
  async getEventStatistics(@Param('id') id: string) {
    return this.safetyCheckService.getEventStatistics(id);
  }

  /**
   * 获取员工反馈列表
   */
  @Get(':id/feedbacks')
  async getFeedbackList(
    @Param('id') id: string,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const params: GetFeedbackListParams = {
      status: status as any,
      keyword,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    };
    return this.safetyCheckService.getFeedbackList(id, params);
  }

  /**
   * 提醒未回复员工
   */
  @NeedLogin()
  @Post(':id/remind-unreplied')
  async remindUnreplied(@Param('id') id: string, @Req() req: Request) {
    if (!req.userContext?.userId) {
      throw new UnauthorizedException('当前请求缺少登录用户信息');
    }

    // 动态计算应用基础 URL
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const origin = `${protocol}://${host}`;
    const originalUrl = req.originalUrl || req.url || '';
    const pathPrefix = originalUrl.split('/api/')[0];
    const appBaseUrl = `${origin}${pathPrefix}`;
    return this.safetyCheckService.remindUnreplied(id, appBaseUrl);
  }

  /**
   * 导出反馈名单
   */
  @NeedLogin()
  @Get(':id/export')
  async exportFeedbackList(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const data = await this.safetyCheckService.exportFeedbackList(id);

    // 设置响应头
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="feedback-${id}.json"`);

    return res.json(data);
  }

  /**
   * 删除事件
   */
  @NeedLogin()
  @Delete(':id')
  async deleteEvent(@Param('id') id: string) {
    return this.safetyCheckService.deleteEvent(id);
  }
}

@Controller('api/recipients')
export class RecipientController {
  constructor(
    @Inject() private readonly feishuChatService: FeishuChatService,
    @Inject() private readonly feishuService: FeishuService,
  ) {}

  /**
   * 搜索群组（用户搜索已在前端通过 UserService 处理）
   */
  @Get('search')
  async searchRecipients(
    @Query('query') query: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const size = pageSize ? parseInt(pageSize, 10) : 20;
    
    // 只搜索群组
    const chatsResult = await this.feishuChatService.searchChats({
      query: query || '',
      pageSize: size,
    });

    return {
      users: [],
      chats: chatsResult.items,
    };
  }

  /**
   * 测试飞书消息发送（仅用于调试）
   */
  @NeedLogin()
  @Post('test-send-message')
  async testSendMessage(
    @Body() body: { userId: string; message?: string },
  ) {
    const testMessage = body.message || '这是一条测试消息';
    const cardContent = {
      schema: '2.0',
      config: { update_multi: true },
      body: {
        direction: 'vertical' as const,
        padding: '12px',
        elements: [
          {
            tag: 'div',
            text: {
              tag: 'plain_text',
              content: testMessage,
            },
          },
        ],
      },
      header: {
        title: {
          tag: 'plain_text',
          content: '测试消息',
        },
      },
    };

    try {
      await this.feishuService.sendCardMessage({
        receiveId: body.userId,
        receiveIdType: 'user_id',
        cardContent,
      });
      return { success: true, message: '消息发送成功' };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return { success: false, message: `消息发送失败: ${errorMsg}` };
    }
  }
}

@Controller('api/feedback')
export class FeedbackController {
  constructor(private readonly safetyCheckService: SafetyCheckService) {}

  /**
   * 获取员工反馈页事件信息
   */
  @Get('events/:eventId')
  async getFeedbackEventInfo(
    @Param('eventId') eventId: string,
    @Query('userId') userId: string,
  ) {
    if (!userId) {
      throw new NotFoundException('缺少用户ID参数');
    }
    return this.safetyCheckService.getFeedbackEventInfo(eventId, userId, 'api.feedback.query.userId');
  }

  /**
   * 提交员工反馈
   */
  @Post('events/:eventId/submit')
  async submitFeedback(
    @Param('eventId') eventId: string,
    @Body() dto: SubmitFeedbackRequest,
    @Query('userId') userId: string,
  ) {
    if (!userId) {
      throw new NotFoundException('缺少用户ID参数');
    }
    return this.safetyCheckService.submitFeedback(eventId, userId, dto, 'api.feedback.query.userId');
  }
}
