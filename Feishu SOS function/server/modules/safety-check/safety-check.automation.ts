import { Logger, Injectable } from '@nestjs/common';
import { eq, and, lt } from 'drizzle-orm';
import {
  Inject,
} from '@nestjs/common';
import {
  Automation,
  BindTrigger,
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { safetyCheckEventTable } from '@server/database/schema';

/**
 * 安全确认自动化任务
 */
@Automation()
@Injectable()
export class SafetyCheckAutomationService {
  private readonly logger = new Logger(SafetyCheckAutomationService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  /**
   * 定时更新事件状态：将已过截止时间但状态仍为进行中的事件更新为已完成
   */
  @BindTrigger('safety_check_status_updater')
  async updateEventStatus() {
    this.logger.log('开始执行事件状态更新任务');

    const now = new Date();

    try {
      const result = await this.db
        .update(safetyCheckEventTable)
        .set({
          status: 'completed',
          updatedAt: now,
        })
        .where(
          and(
            eq(safetyCheckEventTable.status, 'ongoing'),
            lt(safetyCheckEventTable.deadlineTime, now),
          ),
        )
        .returning({ id: safetyCheckEventTable.id });

      if (result.length > 0) {
        this.logger.log(`已更新 ${result.length} 个事件状态为 completed`);
        for (const event of result) {
          this.logger.log(`事件ID: ${event.id}`);
        }
      } else {
        this.logger.log('没有需要更新状态的事件');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`更新事件状态失败: ${errorMsg}`);
      throw error;
    }

    this.logger.log('事件状态更新任务执行完成');
  }
}
