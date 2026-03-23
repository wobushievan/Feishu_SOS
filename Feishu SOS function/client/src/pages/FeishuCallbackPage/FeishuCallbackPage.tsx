import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { getDataloom } from '@lark-apaas/client-toolkit/dataloom';
import { submitFeedback } from '@/api';
import type { FeedbackStatus } from '@shared/api.interface';

export default function FeishuCallbackPage() {
  const { t } = useTranslation(['feedback', 'common']);
  const params = useParams<{ eventId: string }>();
  const [searchParams] = useSearchParams();
  
  // 从路由参数获取 eventId
  const eventId = params.eventId;
  // 从 URL 参数获取 status
  const status = searchParams.get('status') as FeedbackStatus | null;
  
  // 自动获取当前用户 ID
  const [userId, setUserId] = useState<string | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  // 获取当前登录用户 ID
  useEffect(() => {
    getDataloom()
      .then(dataloom => dataloom.service.session.getUserInfo())
      .then(result => {
        if (result.data?.user_info?.user_id) {
          setUserId(String(result.data.user_info.user_id));
        }
      })
      .catch(() => {
        // 获取失败时保持 null
      })
      .finally(() => {
        setIsUserLoading(false);
      });
  }, []);

  useEffect(() => {
    // 等待用户信息加载完成
    if (isUserLoading) {
      return;
    }

    if (!eventId || !userId || !status) {
      setState('error');
      setMessage(!eventId ? '事件ID缺失' : !userId ? '未能获取用户信息，请重新打开页面' : '状态参数错误');
      return;
    }

    const statusMap: Record<string, Exclude<FeedbackStatus, 'no_response'>> = {
      safe: 'safe',
      need_help: 'need_help',
      absent: 'not_applicable',
    };

    const actualStatus = statusMap[status];
    if (!actualStatus) {
      setState('error');
      setMessage('无效的状态参数');
      return;
    }

    submitFeedback(eventId, userId, { status: actualStatus })
      .then((result) => {
        if (result.success) {
          setState('success');
          setMessage(result.message);
        } else {
          setState('error');
          setMessage(result.message);
        }
      })
      .catch(() => {
        setState('error');
        setMessage(t('common:toast.submitError'));
      });
  }, [eventId, userId, status, t, isUserLoading]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6 pb-6 text-center">
          {state === 'loading' && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="size-12 animate-spin text-primary" />
              <p className="text-muted-foreground">{t('common:actions.loading')}</p>
            </div>
          )}

          {state === 'success' && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-safe-bg flex items-center justify-center">
                <CheckCircle2 className="size-8 text-safe" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-1">{t('feedback:submitted.title')}</h2>
                <p className="text-sm text-muted-foreground">{message}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-2">您可以关闭此页面返回飞书</p>
            </div>
          )}

          {state === 'error' && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-help-bg flex items-center justify-center">
                <XCircle className="size-8 text-help" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-1">提交失败</h2>
                <p className="text-sm text-muted-foreground">{message}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
