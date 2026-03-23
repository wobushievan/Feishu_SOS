import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { WSClient, EventDispatcher, LoggerLevel } from '@larksuiteoapi/node-sdk';
import { FeishuService } from './feishu.service';
import { SafetyCheckService } from './safety-check.service';

const FEISHU_APP_ID = 'cli_a9325680d47adcc5';
const FEISHU_APP_SECRET = 'Y9NhnKJGLyf6xnjlMxiSjgsl4DTtbJpb';

@Injectable()
export class FeishuEventService implements OnModuleInit {
  private readonly logger = new Logger(FeishuEventService.name);
  private wsClient: WSClient | null = null;

  constructor(
    private readonly feishuService: FeishuService,
    private readonly safetyCheckService: SafetyCheckService,
  ) {}

  onModuleInit() {
    // 在 onModuleInit 中创建 WSClient，避免构造函数中的循环引用
    this.wsClient = new WSClient({
      appId: FEISHU_APP_ID,
      appSecret: FEISHU_APP_SECRET,
      loggerLevel: LoggerLevel.info,
    });

    this.wsClient.start({
      eventDispatcher: new EventDispatcher({}).register({
        // 消息卡片交互回调
        'card.action.trigger': async (data: {
          action: {
            value?: Record<string, unknown>;
            tag?: string;
            name?: string;
          };
          operator: {
            open_id: string;
            user_id?: string;
            union_id?: string;
          };
          context: {
            open_message_id: string;
            open_chat_id: string;
          };
        }) => {
          this.logger.log(`收到卡片回调: ${JSON.stringify(data)}`);

          const { action, operator, context } = data;
          const eventId = action.value?.eventId as string;
          const rawStatus = action.value?.status as string;

          if (!eventId || !rawStatus) {
            this.logger.warn('缺少 eventId 或 status 参数');
            return { toast: { type: 'error', content: '参数错误' } };
          }

          // 状态映射：将插件状态转换为数据库状态
          const statusMap: Record<string, string> = {
            safe: 'safe',
            help: 'need_help',
            absent: 'not_applicable',
          };
          const status = statusMap[rawStatus] || rawStatus;

          let userId = operator.user_id;
          const openId = operator.open_id;

          // 如果没有 user_id，尝试通过 open_id 查询
          if (!userId && openId) {
            this.logger.log(`No user_id in operator, trying to get user_id by open_id: ${openId}`);
            userId = await this.feishuService.getUserIdByOpenId(openId);
          }

          // 如果仍然无法获取 user_id，使用 open_id 作为 fallback
          if (!userId && openId) {
            this.logger.log(`Cannot get user_id by open_id, using open_id directly: ${openId}`);
            userId = openId;
          }

          if (!userId) {
            this.logger.warn('Cannot get user_id from operator');
            return {
              toast: { type: 'error', content: '无法识别用户身份' },
            };
          }

          this.logger.log(`Submitting feedback with userId: ${userId}`);

          try {
            // 提交反馈
            const result = await this.safetyCheckService.submitFeedback(
              eventId,
              userId,
              { status: status as any },
            );

            if (!result.success) {
              return {
                toast: { type: 'error', content: result.message },
              };
            }

            // 返回更新后的卡片（按钮置灰）
            return {
              toast: {
                type: 'success',
                content: '反馈已提交，感谢您的配合',
                i18n: {
                  zh_cn: '反馈已提交，感谢您的配合',
                  en_us: 'Feedback submitted successfully',
                },
              },
              card: {
                type: 'raw',
                data: this.buildSubmittedCard(action.value?.title as string, status),
              },
            };
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.logger.error(`处理卡片回调失败: ${errorMsg}`);
            return {
              toast: { type: 'error', content: '提交失败，请稍后重试' },
            };
          }
        },
      }),
    });

    this.logger.log('飞书事件订阅服务已启动');
  }

  /**
   * 构建已提交状态的卡片
   */
  private buildSubmittedCard(title: string, rawStatus: string): Record<string, unknown> {
    // 状态映射
    const dbStatusMap: Record<string, string> = {
      safe: 'safe',
      help: 'need_help',
      absent: 'not_applicable',
    };
    const status = dbStatusMap[rawStatus] || rawStatus;

    const statusMap: Record<string, { text: string; color: string }> = {
      safe: { text: '✅ 我安全', color: 'green' },
      need_help: { text: '🆘 我需要帮助', color: 'red' },
      not_applicable: { text: '✈️ 不在阿联酋本地', color: 'orange' },
    };

    const statusInfo = statusMap[status] || { text: '已提交', color: 'blue' };

    return {
      schema: '2.0',
      config: { update_multi: true },
      header: {
        template: statusInfo.color,
        title: { content: title, tag: 'plain_text' },
      },
      body: {
        direction: 'vertical',
        elements: [
          {
            tag: 'markdown',
            content: `**您已反馈：${statusInfo.text}**\n\n感谢您的配合，已记录您的状态。`,
          },
          {
            tag: 'note',
            elements: [
              { tag: 'plain_text', content: '如需修改，请联系管理员' },
            ],
          },
        ],
      },
    };
  }
}
