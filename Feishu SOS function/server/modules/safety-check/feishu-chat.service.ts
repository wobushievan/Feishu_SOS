import { Injectable, Inject, Logger } from '@nestjs/common';
import { FeishuService } from './feishu.service';
import type { SearchChatsParams, SearchChatsResponse, ChatInfo } from '@shared/api.interface';

@Injectable()
export class FeishuChatService {
  private readonly logger = new Logger(FeishuChatService.name);

  constructor(
    @Inject() private readonly feishuService: FeishuService,
  ) {}

  /**
   * 搜索飞书群组
   */
  async searchChats(params: SearchChatsParams): Promise<SearchChatsResponse> {
    const { query, pageSize = 20 } = params;
    this.logger.log(`searchChats called: query="${query}", pageSize=${pageSize}`);

    if (!query) {
      return { items: [] };
    }

    try {
      const client = this.feishuService.getClient();
      const res = await client.im.chat.search({
        params: { query, page_size: pageSize },
      });

      if (res.code !== 0) {
        this.logger.error(`searchChats error: ${res.msg}`);
        return { items: [] };
      }

      const items: ChatInfo[] = (res.data?.items || []).map((chat: { chat_id?: string; name?: string; description?: string; member_count?: number }) => ({
        id: chat.chat_id || '',
        name: chat.name || '',
        description: chat.description,
        memberCount: chat.member_count,
      }));

      return { items };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to search chats: ${errorMsg}`);
      return { items: [] };
    }
  }

  /**
   * 获取群成员列表
   */
  async getChatMembers(chatId: string): Promise<string[]> {
    try {
      const client = this.feishuService.getClient();
      const res = await client.im.chatMembers.get({
        path: { chat_id: chatId },
        params: { member_id_type: 'open_id', page_size: 100 },
      });

      if (res.code !== 0) {
        this.logger.error(`getChatMembers error: ${res.msg}`);
        return [];
      }

      return (res.data?.items || [])
        .map((item: { member_id?: string }) => item.member_id)
        .filter((id): id is string => !!id);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get chat members for ${chatId}: ${errorMsg}`);
      return [];
    }
  }

  /**
   * 搜索通讯录用户
   * 注：前端使用内置用户选择器，此方法保留但暂不使用
   */
  async searchUsers(_query: string, _pageSize: number = 20): Promise<Array<{ id: string; name: string; avatar?: string }>> {
    // 前端使用 dataloom 内置用户选择器
    return [];
  }
}
