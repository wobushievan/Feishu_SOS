import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, HelpCircle, Plane, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { getFeedbackEventInfo, submitFeedback } from '@/api';
import { toast } from 'sonner';
import { getDataloom } from '@lark-apaas/client-toolkit/dataloom';
import type { FeedbackStatus } from '@shared/api.interface';

// 状态按钮配置
const getStatusButtons = (t: (key: string) => string): {
  status: Exclude<FeedbackStatus, 'no_response'>;
  label: string;
  description: string;
  icon: typeof Shield;
  color: string;
  bgColor: string;
  hoverColor: string;
}[] => [
  {
    status: 'safe',
    label: t('feedback:status.safe.label'),
    description: t('feedback:status.safe.description'),
    icon: Shield,
    color: 'text-safe-bg-dark',
    bgColor: 'bg-safe-bg',
    hoverColor: 'hover:bg-safe-bg/80',
  },
  {
    status: 'need_help',
    label: t('feedback:status.needHelp.label'),
    description: t('feedback:status.needHelp.description'),
    icon: HelpCircle,
    color: 'text-help-bg-dark',
    bgColor: 'bg-help-bg',
    hoverColor: 'hover:bg-help-bg/80',
  },
  {
    status: 'not_applicable',
    label: t('feedback:status.notApplicable.label'),
    description: t('feedback:status.notApplicable.description'),
    icon: Plane,
    color: 'text-away-bg-dark',
    bgColor: 'bg-away-bg',
    hoverColor: 'hover:bg-away-bg/80',
  },
];

export default function EmployeeFeedbackPage() {
  const { t } = useTranslation(['feedback', 'common']);
  const { eventId } = useParams<{ eventId: string }>();
  const [searchParams] = useSearchParams();
  const urlUserId = searchParams.get('userId');
  const [autoUserId, setAutoUserId] = useState<string | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const statusButtons = getStatusButtons(t);

  // 如果 URL 中没有 userId，自动从飞书环境获取
  useEffect(() => {
    if (urlUserId) {
      setAutoUserId(urlUserId);
      setIsUserLoading(false);
      return;
    }

    getDataloom()
      .then(dataloom => dataloom.service.session.getUserInfo())
      .then(result => {
        if (result.data?.user_info?.user_id) {
          setAutoUserId(String(result.data.user_info.user_id));
        }
      })
      .catch(() => {
        // 获取失败时保持 null
      })
      .finally(() => {
        setIsUserLoading(false);
      });
  }, [urlUserId]);

  const userId = urlUserId || autoUserId;

  // 获取事件信息 - 并行化：即使没有 userId 也发起请求（使用占位符），获取到后重新请求
  const { data: eventInfo, isLoading: isEventLoading } = useQuery({
    queryKey: ['feedback-event', eventId, userId || 'pending'],
    queryFn: () => getFeedbackEventInfo(eventId!, userId || 'pending'),
    enabled: !!eventId,
  });

  // 骨架屏加载状态：只等待事件信息，不等待 userId
  const isLoading = isEventLoading;

  // 提交反馈Mutation
  const submitMutation = useMutation({
    mutationFn: (status: Exclude<FeedbackStatus, 'no_response'>) =>
      submitFeedback(eventId!, userId!, { status }),
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        setSubmitted(true);
      } else {
        toast.error(data.message);
      }
    },
    onError: () => {
      toast.error(t('common:toast.submitError'));
    },
  });

  // 检查是否已截止
  const isExpired = eventInfo && new Date() > new Date(eventInfo.deadlineTime);

  // 已提交成功页面
  if (submitted || eventInfo?.alreadySubmitted) {
    const currentStatus = eventInfo?.currentStatus;
    const statusConfig = currentStatus
      ? statusButtons.find((s) => s.status === currentStatus)
      : null;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 pb-6 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-safe-bg flex items-center justify-center">
                <CheckCircle2 className="size-8 text-safe" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-1">{t('feedback:submitted.title')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('feedback:submitted.message')}
                </p>
              </div>
              {statusConfig && (
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}
                >
                  <statusConfig.icon className="size-4" />
                  <span className="font-medium">{statusConfig.label}</span>
                </div>
              )}
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => window.close()}
              >
                {t('feedback:submitted.close')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 缺少用户ID（且已完成加载/获取）
  if (!userId && !isUserLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="size-4" />
          <AlertDescription>
            无法获取员工信息，请通过飞书消息中的链接访问
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // 骨架屏加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-md mx-auto space-y-6">
          {/* 事件信息骨架屏 */}
          <Card>
            <CardHeader className="pb-3">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-2/3" />
            </CardHeader>
          </Card>

          {/* 状态按钮骨架屏 */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-32 mx-auto mb-4" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  // 事件不存在
  if (!eventInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="size-4" />
          <AlertDescription>{t('feedback:notFound.message')}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // 已截止
  if (isExpired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 pb-6 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Clock className="size-8 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-1">{t('feedback:expired.title')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('feedback:expired.message')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* 事件信息区 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{eventInfo.title}</CardTitle>
            {eventInfo.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {eventInfo.description}
              </p>
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
              <Clock className="size-3" />
              {t('feedback:endTime')}: {new Date(eventInfo.deadlineTime).toLocaleString()}
            </div>
          </CardHeader>
        </Card>

        {/* 状态按钮区 */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-center text-muted-foreground">
            {t('feedback:subtitle')}
          </p>
          {statusButtons.map((button) => (
            <Button
              key={button.status}
              variant="ghost"
              className={`w-full h-auto py-6 px-4 ${button.bgColor} ${button.color} ${button.hoverColor} border-0`}
              onClick={() => submitMutation.mutate(button.status)}
              disabled={submitMutation.isPending}
            >
              <div className="flex items-center gap-4 w-full">
                <div className={`p-3 rounded-full bg-white/50`}>
                  <button.icon className="size-6" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-base">{button.label}</div>
                  <div className="text-xs opacity-80">{button.description}</div>
                </div>
              </div>
            </Button>
          ))}
        </div>

        {/* 提示信息 */}
        <p className="text-xs text-center text-muted-foreground">
          {t('feedback:hint')}
        </p>
      </div>
    </div>
  );
}
