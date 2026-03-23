import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SafetyCheckController, FeedbackController, RecipientController } from './safety-check.controller';
import { SafetyCheckService } from './safety-check.service';
import { FeishuChatService } from './feishu-chat.service';
import { FeishuService } from './feishu.service';
import { FeishuEventService } from './feishu-event.service';
import { SafetyCheckAutomationService } from './safety-check.automation';

@Module({
  imports: [HttpModule],
  controllers: [SafetyCheckController, FeedbackController, RecipientController],
  providers: [SafetyCheckService, FeishuChatService, FeishuService, FeishuEventService, SafetyCheckAutomationService],
})
export class SafetyCheckModule {}
