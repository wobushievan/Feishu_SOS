import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, AppType, Domain } from '@larksuiteoapi/node-sdk';
import { getFeishuEnvConfig } from '../../common/config/feishu-env';

@Injectable()
export class FeishuService {
  private readonly logger = new Logger(FeishuService.name);
  private readonly client: Client;

  constructor(private readonly configService: ConfigService) {
    const { appId, appSecret } = getFeishuEnvConfig(this.configService);

    this.client = new Client({
      appId,
      appSecret,
      appType: AppType.SelfBuild,
      domain: Domain.Feishu,
    });
  }

  private logStructured(message: string, payload: Record<string, unknown>): void {
    this.logger.log(`${message} ${JSON.stringify(payload)}`);
  }

  /**
   * 从飞书用户对象中提取部门名称
   * 支持多语言对象格式: department.name.zh_cn / en_us
   * 也支持普通字符串格式
   */
  private extractDepartmentName(user: any): string {
    const dept = user?.department;
    if (!dept) return '';

    // 处理多语言对象格式: department.name.zh_cn / en_us
    if (dept.name && typeof dept.name === 'object') {
      return dept.name.zh_cn || dept.name.en_us || '';
    }

    // 处理普通字符串格式: department.name
    if (dept.name && typeof dept.name === 'string') {
      return dept.name;
    }

    // 兜底: department 本身就是字符串
    if (typeof dept === 'string') {
      return dept;
    }

    return '';
  }

  /**
   * 获取飞书客户端
   */
  getClient(): Client {
    return this.client;
  }

  /**
   * 发送卡片消息
   */
  async sendCardMessage(params: {
    receiveId: string;
    receiveIdType: 'open_id' | 'user_id' | 'union_id' | 'email' | 'chat_id';
    cardContent: Record<string, unknown>;
  }): Promise<{ messageId: string }> {
    this.logger.log(`Sending card message to ${params.receiveIdType}: ${params.receiveId}`);
    const contentStr = JSON.stringify(params.cardContent);
    this.logger.log(`Card content: ${contentStr}`);

    try {
      const res = await this.client.im.message.create({
        params: { receive_id_type: params.receiveIdType },
        data: {
          receive_id: params.receiveId,
          msg_type: 'interactive',
          content: contentStr,
        },
      });

      if (res.code !== 0) {
        this.logger.error(`Feishu API error [${res.code}]: ${res.msg}`);
        throw new Error(`Failed to send card message [${res.code}]: ${res.msg}`);
      }

      this.logger.log(`Message sent successfully: ${res.data?.message_id}`);
      return { messageId: res.data?.message_id || '' };
    } catch (error) {
      const errorDetails = error instanceof Error ? error.message : String(error);
      this.logger.error(`Exception in sendCardMessage: ${errorDetails}`);
      // 尝试提取更多错误信息
      if (error && typeof error === 'object' && 'response' in error) {
        const errResponse = (error as any).response;
        this.logger.error(`Error response: ${JSON.stringify(errResponse?.data || errResponse)}`);
      }
      throw error;
    }
  }

  /**
   * 更新卡片消息
   */
  async updateCardMessage(messageId: string, cardContent: Record<string, unknown>): Promise<void> {
    const res = await this.client.im.message.patch({
      path: { message_id: messageId },
      data: {
        content: JSON.stringify(cardContent),
      },
    });

    if (res.code !== 0) {
      throw new Error(`Failed to update card message [${res.code}]: ${res.msg}`);
    }
  }

  /**
   * 通过 open_id 获取 user_id
   * @param openId 飞书用户的 open_id
   * @returns user_id 或 null
   */
  async getUserIdByOpenId(openId: string): Promise<string | null> {
    this.logger.log(`Converting open_id to user_id: ${openId}`);
    try {
      const res = await this.client.contact.user.get({
        params: { user_id_type: 'open_id' },
        path: { user_id: openId },
      });
      if (res.code === 0 && res.data?.user?.user_id) {
        this.logger.log(`Got user_id: ${res.data.user.user_id}`);
        return res.data.user.user_id;
      }
      this.logger.warn(`No user_id found for open_id: ${openId}, code: ${res.code}, msg: ${res.msg}`);
      return null;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get user_id by open_id: ${errorMsg}`);
      return null;
    }
  }

  /**
   * 根据 user_id 获取用户详细信息（包括邮箱、部门）
   * @param userId 飞书用户的 user_id
   * @returns 用户信息
   */
  async getUserInfoByUserId(userId: string): Promise<{ email?: string; name?: string; openId?: string; department?: string } | null> {
    this.logger.log(`Getting user info by user_id: ${userId}`);
    try {
      const res = await this.client.contact.user.get({
        params: { user_id_type: 'user_id' },
        path: { user_id: userId },
      });
      if (res.code === 0 && res.data?.user) {
        const user = res.data.user;
        // 获取部门名称，支持多语言对象格式
        const departmentName = this.extractDepartmentName(user);
        this.logger.log(`Got user info: ${user.name}, email: ${user.email}, department: ${departmentName}`);
        return {
          email: user.email,
          name: user.name,
          openId: user.open_id,
          department: departmentName,
        };
      }
      this.logger.warn(`No user info found for user_id: ${userId}, code: ${res.code}, msg: ${res.msg}`);
      return null;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get user info by user_id: ${errorMsg}`);
      return null;
    }
  }

  /**
   * 批量获取用户信息（包括部门）
   * @param userIds 用户ID列表（可能是 user_id 或 open_id 混合）
   * @returns 用户ID到用户信息的映射（key 为原始传入的 ID）
   */
  async batchGetUserInfo(userIds: string[]): Promise<Map<string, { name: string; department: string }>> {
    this.logger.log(`Batch getting user info for ${userIds.length} users`);
    this.logStructured('[batchGetUserInfo] input diagnostics', {
      sourceField: 'batchGetUserInfo(userIds)',
      inputIdType: 'user_id_or_open_id',
      inputValues: userIds,
      lookupPlan: [
        'contact.user.batchGetId(user_id_type=user_id)',
        'contact.user.get(user_id_type=open_id) for mapped user_id inputs',
        'contact.user.get(user_id_type=open_id) fallback for unmapped inputs',
      ],
    });
    const result = new Map<string, { name: string; department: string }>();

    if (userIds.length === 0) {
      return result;
    }

    // 第一步：按 user_id 批量转换，每次最多 100 个
    const userIdToOpenId = new Map<string, string>(); // 原始 user_id -> open_id
    const unmappedIds: string[] = []; // 未映射成功的 ID（可能是 open_id 格式）

    const BATCH_SIZE = 100;
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE);
      this.logger.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} users`);

      try {
        const idMappingRes = await this.client.contact.user.batchGetId({
          params: { user_id_type: 'user_id' },
          data: { user_ids: batch } as any,
        });
        this.logStructured('[batchGetUserInfo] batchGetId request', {
          batchIndex: Math.floor(i / BATCH_SIZE) + 1,
          requestField: 'contact.user.batchGetId.data.user_ids',
          requestUserIdType: 'user_id',
          batchInputValues: batch,
        });

        if (idMappingRes.code === 0) {
          for (const item of idMappingRes.data?.user_list || []) {
            const userItem = item as any;
            if (userItem.user_id && userItem.open_id) {
              userIdToOpenId.set(userItem.user_id, userItem.open_id);
              this.logger.log(`Mapped: user_id=${userItem.user_id} -> open_id=${userItem.open_id}`);
              this.logStructured('[batchGetUserInfo] resolved user_id mapping', {
                inputValue: userItem.user_id,
                inputIdType: 'user_id',
                resolvedOpenId: userItem.open_id,
                resolvedOpenIdType: 'open_id',
                sourceApi: 'contact.user.batchGetId(user_id_type=user_id)',
              });
            }
          }
        } else {
          this.logger.warn(`batchGetId failed for batch ${Math.floor(i / BATCH_SIZE) + 1}: ${idMappingRes.msg}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Exception in batchGetId for batch ${Math.floor(i / BATCH_SIZE) + 1}: ${errorMsg}`);
      }
    }

    // 找出未映射成功的 ID
    for (const userId of userIds) {
      if (!userIdToOpenId.has(userId)) {
        unmappedIds.push(userId);
      }
    }
    this.logger.log(`Mapped ${userIdToOpenId.size} user_ids, ${unmappedIds.length} unmapped`);
    this.logStructured('[batchGetUserInfo] post mapping summary', {
      mappedAsUserIdCount: userIdToOpenId.size,
      unmappedCount: unmappedIds.length,
      unmappedInputValues: unmappedIds,
      fallbackLookupType: 'open_id',
    });

    // 第二步：对成功映射的 user_id，使用 open_id 获取详细信息
    const openIds = Array.from(userIdToOpenId.values());
    for (const openId of openIds) {
      try {
        const res = await this.client.contact.user.get({
          params: { user_id_type: 'open_id' },
          path: { user_id: openId },
        });

        if (res.code === 0 && res.data?.user) {
          const user = res.data.user;
          // 获取部门名称，支持多语言对象格式
          const departmentName = this.extractDepartmentName(user);
          // 找到对应的原始 user_id
          const originalUserId = Array.from(userIdToOpenId.entries())
            .find(([, oid]) => oid === openId)?.[0] || openId;
          result.set(originalUserId, {
            name: user.name || '',
            department: departmentName,
          });
          this.logger.log(`Got info for ${originalUserId}: name=${user.name}, dept=${departmentName}`);
          this.logStructured('[batchGetUserInfo] user info resolved from mapped user_id', {
            originalInputValue: originalUserId,
            originalInputType: 'user_id',
            lookupIdValue: openId,
            lookupIdType: 'open_id',
            resolvedName: user.name || '',
            resolvedDepartment: departmentName,
          });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to get info for open_id=${openId}: ${errorMsg}`);
      }
    }

    // 第三步：对未映射的 ID，按 open_id 兜底查询
    if (unmappedIds.length > 0) {
      this.logger.log(`Fallback: querying ${unmappedIds.length} IDs as open_id`);
      for (const id of unmappedIds) {
        try {
          this.logStructured('[batchGetUserInfo] fallback open_id lookup', {
            inputValue: id,
            inputType: 'open_id',
            sourceReason: 'batchGetId(user_id_type=user_id) did not map this input',
          });
          const res = await this.client.contact.user.get({
            params: { user_id_type: 'open_id' },
            path: { user_id: id },
          });

          if (res.code === 0 && res.data?.user) {
            const user = res.data.user;
            // 获取部门名称，支持多语言对象格式
            const departmentName = this.extractDepartmentName(user);
            result.set(id, {
              name: user.name || '',
              department: departmentName,
            });
            this.logger.log(`Got info (fallback) for ${id}: name=${user.name}, dept=${departmentName}`);
            this.logStructured('[batchGetUserInfo] user info resolved from fallback open_id', {
              originalInputValue: id,
              originalInputType: 'open_id',
              lookupIdValue: id,
              lookupIdType: 'open_id',
              resolvedName: user.name || '',
              resolvedDepartment: departmentName,
            });
          }
        } catch (error) {
          this.logger.warn(`Fallback query failed for ${id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    this.logger.log(`Successfully got info for ${result.size}/${userIds.length} users`);
    this.logStructured('[batchGetUserInfo] final result summary', {
      outputCount: result.size,
      outputKeys: Array.from(result.keys()),
    });
    return result;
  }

  /**
   * 批量将平台用户ID转换为飞书 open_id
   * @param userIds 平台用户ID列表
   * @returns open_id 列表
   */
  async getOpenIdsByUserIds(userIds: string[]): Promise<string[]> {
    this.logger.log(`Converting ${userIds.length} user_ids to open_ids`);
    try {
      const res = await this.client.contact.user.batchGetId({
        params: { user_id_type: 'user_id' },
        data: {
          user_ids: userIds,
        } as any,
      });

      if (res.code !== 0) {
        this.logger.error(`Failed to batch get open_ids: ${res.msg}`);
        return [];
      }

      const openIds: string[] = [];
      for (const item of res.data?.user_list || []) {
        const userItem = item as any;
        if (userItem.open_id) {
          openIds.push(userItem.open_id);
        } else {
          this.logger.warn(`No open_id found for user_id: ${userItem.user_id}`);
        }
      }

      this.logger.log(`Successfully converted ${openIds.length} user_ids to open_ids`);
      return openIds;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Exception in getOpenIdsByUserIds: ${errorMsg}`);
      return [];
    }
  }
}
