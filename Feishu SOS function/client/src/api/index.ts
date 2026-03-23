import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  GetEventListParams,
  GetEventListResponse,
  CreateEventRequest,
  CreateEventResponse,
  GetEventDetailResponse,
  GetEventStatisticsResponse,
  GetFeedbackListParams,
  GetFeedbackListResponse,
  RemindUnrepliedResponse,
  GetFeedbackEventInfoResponse,
  SubmitFeedbackRequest,
  SubmitFeedbackResponse,
  DeleteEventResponse,
  GetTranslationsResponse,
  TranslationItem,
  UpdateTranslationRequest,
  UpdateTranslationResponse,
  BatchUpdateTranslationRequest,
  BatchUpdateTranslationResponse,
  ResetTranslationResponse,
  TranslationNamespace,
  LanguageCode,
} from '@shared/api.interface';

/**
 * 获取安全点名事件列表
 */
export async function getEventList(params: GetEventListParams): Promise<GetEventListResponse> {
  try {
    const response = await axiosForBackend({
      url: '/api/safety-check-events',
      method: 'GET',
      params: {
        status: params.status,
        page: params.page,
        pageSize: params.pageSize,
      },
    });
    return response.data;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to get event list: ${errorMsg}`);
    throw error;
  }
}

/**
 * 创建安全点名事件
 */
export async function createEvent(data: CreateEventRequest): Promise<CreateEventResponse> {
  try {
    const response = await axiosForBackend({
      url: '/api/safety-check-events',
      method: 'POST',
      data,
    });
    return response.data;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to create event: ${errorMsg}`);
    throw error;
  }
}

/**
 * 获取事件详情
 */
export async function getEventDetail(eventId: string): Promise<GetEventDetailResponse> {
  try {
    const response = await axiosForBackend({
      url: `/api/safety-check-events/${eventId}`,
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to get event details: ${errorMsg}`);
    throw error;
  }
}

/**
 * 获取事件统计
 */
export async function getEventStatistics(eventId: string): Promise<GetEventStatisticsResponse> {
  try {
    const response = await axiosForBackend({
      url: `/api/safety-check-events/${eventId}/statistics`,
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to get event statistics: ${errorMsg}`);
    throw error;
  }
}

/**
 * 获取员工反馈列表
 */
export async function getFeedbackList(
  eventId: string,
  params: GetFeedbackListParams,
): Promise<GetFeedbackListResponse> {
  try {
    const response = await axiosForBackend({
      url: `/api/safety-check-events/${eventId}/feedbacks`,
      method: 'GET',
      params: {
        status: params.status,
        keyword: params.keyword,
        page: params.page,
        pageSize: params.pageSize,
      },
    });
    return response.data;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to get feedback list: ${errorMsg}`);
    throw error;
  }
}

/**
 * 提醒未回复员工
 */
export async function remindUnreplied(eventId: string): Promise<RemindUnrepliedResponse> {
  try {
    const response = await axiosForBackend({
      url: `/api/safety-check-events/${eventId}/remind-unreplied`,
      method: 'POST',
    });
    return response.data;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to send reminder: ${errorMsg}`);
    throw error;
  }
}

/**
 * 导出反馈名单
 */
export async function exportFeedbackList(eventId: string): Promise<Array<{ 员工姓名: string; 部门: string; 反馈状态: string; 反馈时间: string; 最后通知时间: string }>> {
  try {
    const response = await axiosForBackend({
      url: `/api/safety-check-events/${eventId}/export`,
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to export feedback list: ${errorMsg}`);
    throw error;
  }
}

/**
 * 获取员工反馈页事件信息
 */
export async function getFeedbackEventInfo(
  eventId: string,
  userId: string,
): Promise<GetFeedbackEventInfoResponse> {
  try {
    const response = await axiosForBackend({
      url: `/api/feedback/events/${eventId}?userId=${userId}`,
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to get feedback event info: ${errorMsg}`);
    throw error;
  }
}

/**
 * 提交员工反馈
 */
export async function submitFeedback(
  eventId: string,
  userId: string,
  data: SubmitFeedbackRequest,
): Promise<SubmitFeedbackResponse> {
  try {
    const response = await axiosForBackend({
      url: `/api/feedback/events/${eventId}/submit?userId=${userId}`,
      method: 'POST',
      data,
    });
    return response.data;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to submit feedback: ${errorMsg}`);
    throw error;
  }
}

/**
 * 删除事件
 */
export async function deleteEvent(eventId: string): Promise<DeleteEventResponse> {
  try {
    const response = await axiosForBackend({
      url: `/api/safety-check-events/${eventId}`,
      method: 'DELETE',
    });
    return response.data;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to delete event: ${errorMsg}`);
    throw error;
  }
}

/**
 * 获取所有翻译
 */
export async function getAllTranslations(): Promise<GetTranslationsResponse> {
  try {
    const response = await axiosForBackend({
      url: '/api/translations',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to get translations: ${errorMsg}`);
    throw error;
  }
}

/**
 * 获取自定义翻译列表
 */
export async function getCustomTranslations(): Promise<TranslationItem[]> {
  try {
    const response = await axiosForBackend({
      url: '/api/translations/custom',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to get custom translations: ${errorMsg}`);
    throw error;
  }
}

/**
 * 获取指定命名空间翻译
 */
export async function getNamespaceTranslations(
  namespace: TranslationNamespace,
  language?: LanguageCode,
): Promise<Record<string, unknown>> {
  try {
    const response = await axiosForBackend({
      url: `/api/translations/${namespace}`,
      method: 'GET',
      params: { language },
    });
    return response.data;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to get namespace translations: ${errorMsg}`);
    throw error;
  }
}

/**
 * 获取默认翻译
 */
export async function getDefaultTranslations(
  namespace: TranslationNamespace,
  language?: LanguageCode,
): Promise<Record<string, unknown>> {
  try {
    const response = await axiosForBackend({
      url: `/api/translations/${namespace}/default`,
      method: 'GET',
      params: { language },
    });
    return response.data;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to get default translations: ${errorMsg}`);
    throw error;
  }
}

/**
 * 更新单个翻译
 */
export async function updateTranslation(
  data: UpdateTranslationRequest,
): Promise<UpdateTranslationResponse> {
  try {
    const response = await axiosForBackend({
      url: '/api/translations',
      method: 'PUT',
      data,
    });
    return response.data;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to update translation: ${errorMsg}`);
    throw error;
  }
}

/**
 * 批量更新翻译
 */
export async function batchUpdateTranslations(
  data: BatchUpdateTranslationRequest,
): Promise<BatchUpdateTranslationResponse> {
  try {
    const response = await axiosForBackend({
      url: '/api/translations/batch',
      method: 'PUT',
      data,
    });
    return response.data;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to batch update translations: ${errorMsg}`);
    throw error;
  }
}

/**
 * 重置翻译为默认值
 */
export async function resetTranslation(
  namespace: TranslationNamespace,
  language: LanguageCode,
  keyPath: string,
): Promise<ResetTranslationResponse> {
  try {
    const response = await axiosForBackend({
      url: `/api/translations/${namespace}/${language}/${keyPath}`,
      method: 'DELETE',
    });
    return response.data;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to reset translation: ${errorMsg}`);
    throw error;
  }
}
