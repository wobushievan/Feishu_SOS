import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { translation } from '@server/database/schema';
import type {
  TranslationNamespace,
  LanguageCode,
  TranslationItem,
  GetTranslationsResponse,
} from '@shared/api.interface';

// 默认翻译数据（内联以避免 JSON 模块导入问题）
const defaultTranslations = {
  zh: {
    common: {
      app: {
        name: '员工紧急安全确认',
        title: '安全点名系统',
      },
      actions: {
        save: '保存',
        cancel: '取消',
        delete: '删除',
        confirm: '确认',
        close: '关闭',
        create: '创建',
        edit: '编辑',
        submit: '提交',
        search: '搜索',
        export: '导出',
        remind: '提醒',
        loading: '加载中...',
        select: '请选择',
      },
      status: {
        draft: '草稿',
        ongoing: '进行中',
        completed: '已完成',
      },
      table: {
        action: '操作',
      },
      dialog: {
        confirmDelete: '确认删除',
        deleteWarning: '确定要删除「{name}」吗？此操作无法撤销。',
      },
      toast: {
        createSuccess: '创建成功',
        createError: '创建失败',
        deleteSuccess: '删除成功',
        deleteError: '删除失败',
        submitSuccess: '提交成功',
        submitError: '提交失败',
        exportSuccess: '导出成功',
        exportError: '导出失败',
      },
    },
    event: {
      list: {
        title: '事件列表',
        newEvent: '新建事件',
        filter: {
          allStatus: '全部状态',
        },
        columns: {
          title: '事件标题',
          type: '类型',
          status: '状态',
          endTime: '截止时间',
          recipients: '接收人',
          createdAt: '创建时间',
          noResponse: '未回复',
        },
      },
      detail: {
        title: '事件详情',
        endTime: '截止时间',
        exportList: '导出名单',
        remindUnreplied: '提醒未回复',
        feedbackList: '员工反馈列表',
      },
      form: {
        title: '事件标题',
        type: '事件类型',
        description: '事件说明',
        recipients: '通知对象',
        sendType: '发送方式',
        sendTime: '发送时间',
        endTime: '截止时间',
        placeholder: {
          title: '请输入事件标题',
          description: '请输入事件说明',
          recipients: '搜索用户或群组...',
          searchName: '按姓名搜索',
        },
      },
      type: {
        emergency: '紧急事件',
        daily: '日常定时',
      },
      sendType: {
        immediate: '立即发送',
        scheduled: '定时发送',
      },
      statistics: {
        total: '总人数',
        replied: '已回复',
        unreplied: '未回复',
        safe: '安全',
        needHelp: '需要帮助',
        notApplicable: '不在阿联酋',
      },
      table: {
        employee: '员工',
        department: '部门',
        status: '状态',
        feedbackTime: '反馈时间',
        lastNotified: '最后通知',
      },
    },
    feedback: {
      title: '安全状态反馈',
      subtitle: '请点击下方按钮确认您的安全状态',
      status: {
        safe: {
          label: '我安全',
          description: '我目前安全，不需要协助',
        },
        needHelp: {
          label: '我需要帮助',
          description: '我遇到紧急情况，需要帮助',
        },
        notApplicable: {
          label: '我不在阿联酋',
          description: '我目前不在受影响地区',
        },
      },
      submitted: {
        title: '反馈已提交',
        message: '感谢您的配合，您的安全状态已记录',
        close: '关闭页面',
      },
      expired: {
        title: '事件已结束',
        message: '该安全确认事件已截止，不再接受反馈',
      },
      notFound: {
        title: '事件不存在',
        message: '事件不存在或已被删除',
      },
      hint: '如需更新状态，可再次点击按钮',
      endTime: '截止时间',
    },
    validation: {
      required: '此项为必填项',
      minLength: '最少需要 {count} 个字符',
      maxLength: '最多允许 {count} 个字符',
      event: {
        titleRequired: '请输入事件标题',
        recipientsRequired: '请至少选择一个通知对象',
        endTimeRequired: '请选择截止时间',
      },
    },
  },
  en: {
    common: {
      app: {
        name: 'Employee Safety Check',
        title: 'Safety Check System',
      },
      actions: {
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        confirm: 'Confirm',
        close: 'Close',
        create: 'Create',
        edit: 'Edit',
        submit: 'Submit',
        search: 'Search',
        export: 'Export',
        remind: 'Remind',
        loading: 'Loading...',
        select: 'Select',
      },
      status: {
        draft: 'Draft',
        ongoing: 'Ongoing',
        completed: 'Completed',
      },
      table: {
        action: 'Action',
      },
      dialog: {
        confirmDelete: 'Confirm Delete',
        deleteWarning: 'Are you sure you want to delete "{name}"? This action cannot be undone.',
      },
      toast: {
        createSuccess: 'Created successfully',
        createError: 'Failed to create',
        deleteSuccess: 'Deleted successfully',
        deleteError: 'Failed to delete',
        submitSuccess: 'Submitted successfully',
        submitError: 'Submission failed',
        exportSuccess: 'Exported successfully',
        exportError: 'Export failed',
      },
    },
    event: {
      list: {
        title: 'Event List',
        newEvent: 'New Event',
        filter: {
          allStatus: 'All Status',
        },
        columns: {
          title: 'Event Title',
          type: 'Type',
          status: 'Status',
          endTime: 'End Time',
          recipients: 'Recipients',
          createdAt: 'Created At',
          noResponse: 'No Response',
        },
      },
      detail: {
        title: 'Event Detail',
        endTime: 'End Time',
        exportList: 'Export List',
        remindUnreplied: 'Remind Unreplied',
        feedbackList: 'Employee Feedback List',
      },
      form: {
        title: 'Event Title',
        type: 'Event Type',
        description: 'Description',
        recipients: 'Recipients',
        sendType: 'Send Type',
        sendTime: 'Send Time',
        endTime: 'End Time',
        placeholder: {
          title: 'Enter event title',
          description: 'Enter description',
          recipients: 'Search users or groups...',
          searchName: 'Search by name',
        },
      },
      type: {
        emergency: 'Emergency',
        daily: 'Daily Scheduled',
      },
      sendType: {
        immediate: 'Immediate',
        scheduled: 'Scheduled',
      },
      statistics: {
        total: 'Total',
        replied: 'Replied',
        unreplied: 'Unreplied',
        safe: 'Safe',
        needHelp: 'Need Help',
        notApplicable: 'Not in UAE',
      },
      table: {
        employee: 'Employee',
        department: 'Department',
        status: 'Status',
        feedbackTime: 'Feedback Time',
        lastNotified: 'Last Notified',
      },
    },
    feedback: {
      title: 'Safety Status Feedback',
      subtitle: 'Please click a button below to confirm your safety status',
      status: {
        safe: {
          label: 'I am Safe',
          description: 'I am currently safe and do not need assistance',
        },
        needHelp: {
          label: 'I Need Help',
          description: 'I am in an emergency and need assistance',
        },
        notApplicable: {
          label: 'Not in UAE',
          description: 'I am currently not in the affected area',
        },
      },
      submitted: {
        title: 'Feedback Submitted',
        message: 'Thank you. Your safety status has been recorded.',
        close: 'Close Page',
      },
      expired: {
        title: 'Event Closed',
        message: 'This safety check event has ended. Feedback is no longer accepted.',
      },
      notFound: {
        title: 'Event Not Found',
        message: 'Event not found or has been deleted',
      },
      hint: 'You can update your status by clicking again if needed',
      endTime: 'End Time',
    },
    validation: {
      required: 'This field is required',
      minLength: 'Minimum {count} characters required',
      maxLength: 'Maximum {count} characters allowed',
      event: {
        titleRequired: 'Please enter event title',
        recipientsRequired: 'Please select at least one recipient',
        endTimeRequired: 'Please select end time',
      },
    },
  },
};

@Injectable()
export class TranslationService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  /**
   * 获取所有翻译（默认 + 自定义）
   */
  async getAllTranslations(): Promise<GetTranslationsResponse> {
    // 从数据库获取自定义翻译
    const customTranslations = await this.db.select().from(translation);

    // 深拷贝默认翻译
    const result: GetTranslationsResponse = JSON.parse(
      JSON.stringify({
        common: {
          zh: defaultTranslations.zh.common,
          en: defaultTranslations.en.common,
        },
        event: {
          zh: defaultTranslations.zh.event,
          en: defaultTranslations.en.event,
        },
        feedback: {
          zh: defaultTranslations.zh.feedback,
          en: defaultTranslations.en.feedback,
        },
        validation: {
          zh: defaultTranslations.zh.validation,
          en: defaultTranslations.en.validation,
        },
      }),
    );

    // 应用自定义翻译
    for (const item of customTranslations) {
      const { namespace, language, keyPath, value } = item;
      if (result[namespace] && result[namespace][language]) {
        this.setNestedValue(result[namespace][language], keyPath, value);
      }
    }

    return result;
  }

  /**
   * 获取指定命名空间和语言的翻译
   */
  async getNamespaceTranslations(
    namespace: TranslationNamespace,
    language: LanguageCode,
  ): Promise<Record<string, unknown>> {
    // 获取默认翻译
    const defaultData = defaultTranslations[language][namespace];
    const result = JSON.parse(JSON.stringify(defaultData));

    // 获取自定义翻译
    const customTranslations = await this.db
      .select()
      .from(translation)
      .where(
        and(
          eq(translation.namespace, namespace),
          eq(translation.language, language),
        ),
      );

    // 应用自定义翻译
    for (const item of customTranslations) {
      this.setNestedValue(result, item.keyPath, item.value);
    }

    return result;
  }

  /**
   * 获取自定义翻译列表（仅数据库中的）
   */
  async getCustomTranslations(): Promise<TranslationItem[]> {
    const rows = await this.db.select().from(translation);
    return rows.map((row) => ({
      id: row.id,
      namespace: row.namespace as TranslationNamespace,
      language: row.language as LanguageCode,
      keyPath: row.keyPath,
      value: row.value,
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  /**
   * 更新或创建翻译
   */
  async upsertTranslation(
    namespace: TranslationNamespace,
    language: LanguageCode,
    keyPath: string,
    value: string,
  ): Promise<TranslationItem> {
    // 检查是否已存在
    const existing = await this.db
      .select()
      .from(translation)
      .where(
        and(
          eq(translation.namespace, namespace),
          eq(translation.language, language),
          eq(translation.keyPath, keyPath),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      // 更新
      const updated = await this.db
        .update(translation)
        .set({ value })
        .where(eq(translation.id, existing[0].id))
        .returning();

      return {
        id: updated[0].id,
        namespace: updated[0].namespace as TranslationNamespace,
        language: updated[0].language as LanguageCode,
        keyPath: updated[0].keyPath,
        value: updated[0].value,
        updatedAt: updated[0].updatedAt.toISOString(),
      };
    } else {
      // 创建
      const inserted = await this.db
        .insert(translation)
        .values({
          namespace,
          language,
          keyPath,
          value,
        })
        .returning();

      return {
        id: inserted[0].id,
        namespace: inserted[0].namespace as TranslationNamespace,
        language: inserted[0].language as LanguageCode,
        keyPath: inserted[0].keyPath,
        value: inserted[0].value,
        updatedAt: inserted[0].updatedAt.toISOString(),
      };
    }
  }

  /**
   * 批量更新翻译
   */
  async batchUpsertTranslations(
    items: Array<{
      namespace: TranslationNamespace;
      language: LanguageCode;
      keyPath: string;
      value: string;
    }>,
  ): Promise<number> {
    let count = 0;
    for (const item of items) {
      await this.upsertTranslation(
        item.namespace,
        item.language,
        item.keyPath,
        item.value,
      );
      count++;
    }
    return count;
  }

  /**
   * 删除翻译（重置为默认值）
   */
  async deleteTranslation(
    namespace: TranslationNamespace,
    language: LanguageCode,
    keyPath: string,
  ): Promise<boolean> {
    const result = await this.db
      .delete(translation)
      .where(
        and(
          eq(translation.namespace, namespace),
          eq(translation.language, language),
          eq(translation.keyPath, keyPath),
        ),
      )
      .returning();

    return result.length > 0;
  }

  /**
   * 获取默认翻译（用于对比）
   */
  getDefaultTranslation(
    namespace: TranslationNamespace,
    language: LanguageCode,
  ): Record<string, unknown> {
    return JSON.parse(JSON.stringify(defaultTranslations[language][namespace]));
  }

  /**
   * 辅助方法：根据路径设置嵌套对象的值
   */
  private setNestedValue(
    obj: Record<string, unknown>,
    path: string,
    value: string,
  ): void {
    const keys = path.split('.');
    let current: Record<string, unknown> = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    current[keys[keys.length - 1]] = value;
  }
}
