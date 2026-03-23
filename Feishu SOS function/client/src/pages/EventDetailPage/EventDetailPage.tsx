import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import { UserDisplay } from '@/components/business-ui/user-display';
import { useUsersByIds } from '@/components/business-ui/api/users/queries';
import {
  Users,
  CheckCircle2,
  AlertCircle,
  Shield,
  HelpCircle,
  Plane,
  MessageCircle,
  Download,
  Calendar,
  Clock,
  Copy,
  Check,
} from 'lucide-react';
import dayjs from 'dayjs';
import { getEventDetail, getEventStatistics, getFeedbackList, remindUnreplied, exportFeedbackList } from '@/api';
import { toast } from 'sonner';
import type { EmployeeFeedback, FeedbackStatus, EventStatus } from '@shared/api.interface';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import * as XLSX from 'xlsx';

// 状态映射
const getStatusMap = (t: (key: string) => string): Record<EventStatus, { label: string; color: string }> => ({
  draft: { label: t('common:status.draft'), color: 'bg-muted text-muted-foreground' },
  ongoing: { label: t('common:status.ongoing'), color: 'bg-warning text-warning-foreground' },
  completed: { label: t('common:status.completed'), color: 'bg-success text-success-foreground' },
});

const getFeedbackStatusMap = (t: (key: string) => string): Record<FeedbackStatus, { label: string; color: string; bgColor: string; icon: typeof Shield }> => ({
  safe: { label: t('event:statistics.safe'), color: 'text-safe-bg-dark', bgColor: 'bg-safe-bg', icon: Shield },
  need_help: { label: t('event:statistics.needHelp'), color: 'text-help-bg-dark', bgColor: 'bg-help-bg', icon: HelpCircle },
  not_applicable: { label: t('event:statistics.notApplicable'), color: 'text-away-bg-dark', bgColor: 'bg-away-bg', icon: Plane },
  no_response: { label: t('event:list.columns.noResponse'), color: 'text-none-foreground', bgColor: 'bg-none-bg', icon: AlertCircle },
});

// 统计卡片组件
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
}

const StatCard = ({ title, value, icon, bgColor, textColor }: StatCardProps) => (
  <Card className={`${bgColor} border-0`}>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${textColor}`}>{title}</p>
          <p className={`text-3xl font-bold mt-1 ${textColor}`}>{value}</p>
        </div>
        <div className={`p-3 rounded-full ${bgColor} bg-opacity-50`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function EventDetailPage() {
  const { t } = useTranslation(['common', 'event', 'feedback']);
  const { eventId } = useParams<{ eventId: string }>();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | undefined>(undefined);
  const [keyword, setKeyword] = useState('');
  const [copied, setCopied] = useState(false);

  const statusMap = getStatusMap(t);
  const feedbackStatusMap = getFeedbackStatusMap(t);

  // 获取事件详情
  const { data: eventDetail } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => getEventDetail(eventId!),
    enabled: !!eventId,
  });

  // 获取事件统计
  const { data: statistics } = useQuery({
    queryKey: ['event-statistics', eventId],
    queryFn: () => getEventStatistics(eventId!),
    enabled: !!eventId,
  });

  // 获取员工反馈列表
  const { data: feedbackList, isLoading: isFeedbackLoading } = useQuery({
    queryKey: ['feedbacks', eventId, statusFilter, keyword],
    queryFn: () => getFeedbackList(eventId!, { status: statusFilter, keyword, page: 1, pageSize: 100 }),
    enabled: !!eventId,
  });

  // 收集所有 employeeId 并去重，批量查询用户信息
  const employeeIds = useMemo(() => {
    const ids = feedbackList?.items?.map(item => item.employeeId) || [];
    return [...new Set(ids)];
  }, [feedbackList]);

  // 批量查询用户信息
  const { data: usersData } = useUsersByIds(employeeIds);
  const userMap = useMemo(() => {
    return usersData?.data?.userInfoMap || {};
  }, [usersData]);

  // 提醒未回复Mutation
  const remindMutation = useMutation({
    mutationFn: () => remindUnreplied(eventId!),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['feedbacks', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-statistics', eventId] });
    },
    onError: () => {
      toast.error(t('common:toast.submitError'));
    },
  });

  // 复制事件ID
  const handleCopyEventId = async () => {
    if (!eventId) return;
    try {
      await navigator.clipboard.writeText(eventId);
      setCopied(true);
      toast.success(t('common:toast.copySuccess') || '复制成功');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('common:toast.copyError') || '复制失败');
    }
  };

  // 导出名单为Excel
  const handleExport = async () => {
    try {
      const data = await exportFeedbackList(eventId!);
      
      // 准备Excel数据
      const excelData = data.map((item: { 员工姓名: string; 部门: string; 反馈状态: string; 反馈时间: string; 最后通知时间: string }) => ({
        '员工姓名': item.员工姓名,
        '部门': item.部门,
        '反馈状态': item.反馈状态,
        '反馈时间': item.反馈时间,
        '最后通知时间': item.最后通知时间,
      }));
      
      // 创建工作簿
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // 设置列宽
      ws['!cols'] = [
        { wch: 15 }, // 员工姓名
        { wch: 20 }, // 部门
        { wch: 12 }, // 反馈状态
        { wch: 20 }, // 反馈时间
        { wch: 20 }, // 最后通知时间
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, '员工反馈名单');
      
      // 导出文件
      const eventTitle = eventDetail?.title || '事件';
      XLSX.writeFile(wb, `${eventTitle}-反馈名单.xlsx`);
      
      toast.success(t('common:toast.exportSuccess'));
    } catch {
      toast.error(t('common:toast.exportError'));
    }
  };

  // 表格列定义
  const columns = [
    {
      title: t('event:table.employee'),
      dataIndex: 'employeeName',
      key: 'employeeName',
      render: (name: string, record: EmployeeFeedback) => {
        const userInfo = userMap[record.employeeId];
        const displayName = userInfo?.name?.zh_cn || userInfo?.name?.en_us || name || record.employeeId;
        return (
          <div className="flex items-center gap-2">
            {userInfo ? (
              <UserDisplay value={[record.employeeId]} showLabel={false} />
            ) : null}
            <span className="font-medium">{displayName}</span>
          </div>
        );
      },
    },
    {
      title: t('event:table.department'),
      dataIndex: 'department',
      key: 'department',
      width: 150,
      render: (dept: string) => dept || '-',
    },
    {
      title: t('event:table.status'),
      dataIndex: 'feedbackStatus',
      key: 'feedbackStatus',
      width: 140,
      render: (status: FeedbackStatus) => {
        const { label, color, bgColor, icon: Icon } = feedbackStatusMap[status];
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${bgColor} ${color}`}>
            <Icon className="size-3.5" />
            {label}
          </span>
        );
      },
    },
    {
      title: t('event:table.feedbackTime'),
      dataIndex: 'feedbackTime',
      key: 'feedbackTime',
      width: 180,
      render: (time: string | undefined) => time ? dayjs(time).format('MMM D, YYYY HH:mm') : '-',
    },
    {
      title: t('event:table.lastNotified'),
      dataIndex: 'lastNotifyTime',
      key: 'lastNotifyTime',
      width: 180,
      render: (time: string | undefined) => time ? dayjs(time).format('MMM D, YYYY HH:mm') : '-',
    },
  ];

  // 行样式 - 需要帮助的人员高亮
  const rowClassName = (record: EmployeeFeedback) => {
    if (record.feedbackStatus === 'need_help') {
      return 'bg-help-bg/30 hover:bg-help-bg/50';
    }
    return '';
  };

  if (!eventDetail) {
    return <div className="p-8 text-center text-muted-foreground">{t('common:actions.loading')}</div>;
  }

  const { label: statusLabel, color: statusColor } = statusMap[eventDetail.status];

  return (
    <div className="space-y-6">
      {/* 状态信息区 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{eventDetail.title}</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground font-mono">ID: {eventId}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 p-0"
                  onClick={handleCopyEventId}
                  title={t('common:actions.copy') || '复制'}
                >
                  {copied ? (
                    <Check className="size-3.5 text-success" />
                  ) : (
                    <Copy className="size-3.5 text-muted-foreground" />
                  )}
                </Button>
              </div>
            <div className="flex items-center gap-4 mt-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                {statusLabel}
              </span>
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Clock className="size-4" />
        {t('event:detail.endTime')}: {dayjs(eventDetail.deadlineTime).format('MMM D, YYYY HH:mm')}
      </div>
            </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={!feedbackList?.items?.length}
              >
                <Download className="mr-2 size-4" />
                {t('event:detail.exportList')}
              </Button>
              <Button
                onClick={() => remindMutation.mutate()}
                disabled={remindMutation.isPending}
              >
                <MessageCircle className="mr-2 size-4" />
                {remindMutation.isPending ? t('common:actions.loading') : t('event:detail.remindUnreplied')}
              </Button>
            </div>
          </div>
          {eventDetail.description && (
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-3 cursor-pointer">
                  {eventDetail.description}
                </p>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-md">
                <p className="text-sm">{eventDetail.description}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </CardHeader>
      </Card>

      {/* 统计卡片区 */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            title={t('event:statistics.total')}
            value={statistics.total}
            icon={<Users className="size-5 text-primary" />}
            bgColor="bg-card"
            textColor="text-foreground"
          />
          <StatCard
            title={t('event:statistics.replied')}
            value={statistics.replied}
            icon={<CheckCircle2 className="size-5 text-safe" />}
            bgColor="bg-safe-bg"
            textColor="text-safe-bg-dark"
          />
          <StatCard
            title={t('event:statistics.unreplied')}
            value={statistics.unreplied}
            icon={<AlertCircle className="size-5 text-muted-foreground" />}
            bgColor="bg-none-bg"
            textColor="text-none-foreground"
          />
          <StatCard
            title={t('event:statistics.safe')}
            value={statistics.safe}
            icon={<Shield className="size-5 text-safe" />}
            bgColor="bg-safe-bg"
            textColor="text-safe-bg-dark"
          />
          <StatCard
            title={t('event:statistics.needHelp')}
            value={statistics.needHelp}
            icon={<HelpCircle className="size-5 text-help" />}
            bgColor="bg-help-bg"
            textColor="text-help-bg-dark"
          />
          <StatCard
            title={t('event:statistics.notApplicable')}
            value={statistics.notApplicable}
            icon={<Plane className="size-5 text-away" />}
            bgColor="bg-away-bg"
            textColor="text-away-bg-dark"
          />
        </div>
      )}

      {/* 员工反馈列表 */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle>{t('event:detail.feedbackList')}</CardTitle>
            <div className="flex items-center gap-4">
              <Input
                placeholder={t('event:form.placeholder.searchName')}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-48 placeholder:text-muted-foreground"
              />
              <Select
                value={statusFilter || 'all'}
                onValueChange={(value) => setStatusFilter(value === 'all' ? undefined : (value as FeedbackStatus))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={t('event:list.filter.allStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('event:list.filter.allStatus')}</SelectItem>
                  <SelectItem value="safe">{t('event:statistics.safe')}</SelectItem>
                  <SelectItem value="need_help">{t('event:statistics.needHelp')}</SelectItem>
                  <SelectItem value="not_applicable">{t('event:statistics.notApplicable')}</SelectItem>
                  <SelectItem value="no_response">{t('event:list.columns.noResponse')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table
            columns={columns}
            dataSource={feedbackList?.items || []}
            loading={isFeedbackLoading}
            rowKey="id"
            pagination={false}
            rowClassName={rowClassName}
          />
        </CardContent>
      </Card>
    </div>
  );
}
