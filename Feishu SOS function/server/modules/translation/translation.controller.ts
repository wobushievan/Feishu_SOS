import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { TranslationService } from './translation.service';
import type {
  TranslationNamespace,
  LanguageCode,
  GetTranslationsResponse,
  GetNamespaceTranslationsResponse,
  TranslationItem,
  UpdateTranslationRequest,
  UpdateTranslationResponse,
  BatchUpdateTranslationRequest,
  BatchUpdateTranslationResponse,
  ResetTranslationResponse,
} from '@shared/api.interface';

@Controller('api/translations')
export class TranslationController {
  constructor(private readonly translationService: TranslationService) {}

  /**
   * 获取所有翻译（合并后的完整结构）
   */
  @Get()
  async getAllTranslations(): Promise<GetTranslationsResponse> {
    return this.translationService.getAllTranslations();
  }

  /**
   * 获取自定义翻译列表（仅数据库中的自定义项）
   */
  @Get('custom')
  async getCustomTranslations(): Promise<TranslationItem[]> {
    return this.translationService.getCustomTranslations();
  }

  /**
   * 获取指定命名空间的翻译
   */
  @Get(':namespace')
  async getNamespaceTranslations(
    @Param('namespace') namespace: TranslationNamespace,
    @Query('language') language?: LanguageCode,
  ): Promise<GetNamespaceTranslationsResponse | Record<string, unknown>> {
    if (language) {
      return this.translationService.getNamespaceTranslations(
        namespace,
        language,
      );
    }

    // 返回所有语言的
    const zh = await this.translationService.getNamespaceTranslations(
      namespace,
      'zh',
    );
    const en = await this.translationService.getNamespaceTranslations(
      namespace,
      'en',
    );
    return { zh, en };
  }

  /**
   * 获取默认翻译（用于对比）
   */
  @Get(':namespace/default')
  async getDefaultTranslations(
    @Param('namespace') namespace: TranslationNamespace,
    @Query('language') language?: LanguageCode,
  ): Promise<Record<string, unknown> | GetNamespaceTranslationsResponse> {
    if (language) {
      return this.translationService.getDefaultTranslation(namespace, language);
    }
    return {
      zh: this.translationService.getDefaultTranslation(namespace, 'zh'),
      en: this.translationService.getDefaultTranslation(namespace, 'en'),
    };
  }

  /**
   * 更新单个翻译
   */
  @Put()
  async updateTranslation(
    @Body() dto: UpdateTranslationRequest,
  ): Promise<UpdateTranslationResponse> {
    const item = await this.translationService.upsertTranslation(
      dto.namespace,
      dto.language,
      dto.keyPath,
      dto.value,
    );
    return { success: true, item };
  }

  /**
   * 批量更新翻译
   */
  @Put('batch')
  async batchUpdateTranslations(
    @Body() dto: BatchUpdateTranslationRequest,
  ): Promise<BatchUpdateTranslationResponse> {
    const count = await this.translationService.batchUpsertTranslations(
      dto.items,
    );
    return { success: true, updatedCount: count };
  }

  /**
   * 重置单个翻译为默认值（删除自定义翻译）
   */
  @Delete(':namespace/:language/*')
  async resetTranslation(
    @Param('namespace') namespace: TranslationNamespace,
    @Param('language') language: LanguageCode,
    @Param('0') keyPath: string,
  ): Promise<ResetTranslationResponse> {
    const success = await this.translationService.deleteTranslation(
      namespace,
      language,
      keyPath,
    );
    return {
      success,
      message: success ? '重置成功' : '未找到自定义翻译',
    };
  }
}
