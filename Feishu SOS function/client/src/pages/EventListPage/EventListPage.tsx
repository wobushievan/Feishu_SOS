import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, Clock, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import { RecipientSelector, type RecipientTarget } from '@/components/RecipientSelector';
import { getEventList, createEvent, deleteEvent } from '@/api';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { SafetyCheckEvent, EventStatus, EventType, SendType } from '@shared/api.interface';
import { UserService } from '@lark-apaas/client-toolkit/tools/services';

// 通知对象 Schema
const notificationTargetSchema = z.object({
  id: z.string(),
  type: z.enum(['user', 'chat']),
  name: z.string(),
});

type CreateEventFormData = {
  eventType: 'daily' | 'emergency';
  title: string;
  description?: string;
  notificationScope: RecipientTarget[];
  sendType: 'immediate' | 'scheduled';
  sendTime?: string;
  deadlineTime: string;
};

// 状态映射
const getStatusMap = (t: (key: string) => string): Record<EventStatus, { label: string; color: string }> => ({
  draft: { label: t('common:status.draft'), color: 'bg-muted text-muted-foreground' },
  ongoing: { label: t('common:status.ongoing'), color: 'bg-warning text-warning-foreground' },
  completed: { label: t('common:status.completed'), color: 'bg-success text-success-foreground' },
});

const getEventTypeMap = (t: (key: string) => string): Record<string, string> => ({
  daily: t('event:type.daily'),
  emergency: t('event:type.emergency'),
});

export default function EventListPage() {
  const { t } = useTranslation(['common', 'event', 'validation']);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<SafetyCheckEvent | null>(null);
  const [statusFilter, setStatusFilter] = useState<EventStatus | undefined>(undefined);

  const statusMap = getStatusMap(t);
  const eventTypeMap = getEventTypeMap(t);

  // 分页状态
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
  });

  // 获取事件列表
  const { data: eventListData, isLoading } = useQuery({
    queryKey: ['events', statusFilter, pagination.page, pagination.pageSize],
    queryFn: () => getEventList({
      status: statusFilter,
      page: pagination.page,
      pageSize: pagination.pageSize,
    }),
  });

  // 处理分页变化
  const handleTableChange = (newPagination: { current?: number; pageSize?: number }) => {
    setPagination({
      page: newPagination.current || 1,
      pageSize: newPagination.pageSize || 10,
    });
  };

  // 创建事件Mutation
  const createEventMutation = useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      toast.success(t('common:toast.createSuccess'));
      setIsCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: () => {
      toast.error(t('common:toast.createError'));
    },
  });

  // 删除事件Mutation
  const deleteEventMutation = useMutation({
    mutationFn: (eventId: string) => deleteEvent(eventId),
    onSuccess: () => {
      toast.success(t('common:toast.deleteSuccess'));
      setIsDeleteDialogOpen(false);
      setEventToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: () => {
      toast.error(t('common:toast.deleteError'));
    },
  });

  // 创建表单
  const form = useForm({
    resolver: zodResolver(
      z.object({
        eventType: z.enum(['daily', 'emergency']),
        title: z.string().min(1, t('validation:event.titleRequired')),
        description: z.string().optional(),
        notificationScope: z.array(notificationTargetSchema).min(1, t('validation:event.recipientsRequired')),
        sendType: z.enum(['immediate', 'scheduled']),
        sendTime: z.string().optional(),
        deadlineTime: z.string().min(1, t('validation:event.endTimeRequired')),
      })
    ),
    defaultValues: {
      eventType: 'emergency',
      title: '',
      description: '',
      notificationScope: [],
      sendType: 'immediate',
      deadlineTime: '',
    },
  });

  const watchSendType = form.watch('sendType' as const);

  // 提交表单（异步处理，确保部门信息已补全）
  const onSubmit = async (data: unknown) => {
    const formData = data as CreateEventFormData;

    // 识别需要补充部门信息的用户（type='user' 且没有 department）
    const usersNeedingDept = formData.notificationScope.filter(
      item => item.type === 'user' && !item.department && !item.description
    );

    let enrichedNotificationScope = formData.notificationScope;

    // 如果有需要补充部门信息的用户，批量查询
    if (usersNeedingDept.length > 0) {
      try {
        const userService = new UserService();
        const result = await userService.listUsersByIds(
          usersNeedingDept.map(u => u.id)
        );

        // 构建部门信息 Map
        const deptMap = new Map<string, string>();
        if (result.data?.userInfoMap) {
          Object.entries(result.data.userInfoMap).forEach(([userId, userInfo]) => {
            const deptName = (userInfo as { department?: { name?: { zh_cn?: string; en_us?: string } } }).department?.name?.zh_cn
              || (userInfo as { department?: { name?: { zh_cn?: string; en_us?: string } } }).department?.name?.en_us
              || '';
            deptMap.set(userId, deptName);
          });
        }

        // 合并部门信息到 notificationScope
        enrichedNotificationScope = formData.notificationScope.map(item => {
          if (item.type === 'user' && !item.department && !item.description) {
            const dept = deptMap.get(item.id);
            if (dept) {
              return {
                ...item,
                department: dept,
                description: dept,
              };
            }
          }
          return item;
        });
      } catch (error) {
        logger.error('[CreateEvent] Failed to fetch user departments:', error);
        // 失败时继续提交，不影响事件创建
      }
    }

    const submitData: import('@shared/api.interface').CreateEventRequest = {
      eventType: formData.eventType,
      title: formData.title,
      description: formData.description,
      notificationScope: enrichedNotificationScope.map(item => ({
        id: item.id,
        type: item.type,
        name: item.name,
        department: item.department || item.description || '',
      })),
      sendType: formData.sendType,
      sendTime: formData.sendType === 'immediate' ? new Date().toISOString() : (formData.sendTime || ''),
      deadlineTime: formData.deadlineTime,
    };

    createEventMutation.mutate(submitData);
  };

  // 表格列定义
  const columns = [
    {
      title: t('event:list.columns.id') || 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 280,
      ellipsis: true,
      render: (id: string, record: SafetyCheckEvent) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="font-mono text-xs text-muted-foreground cursor-pointer hover:text-primary truncate" onClick={() => navigate(`/events/${record.id}`)}>
              {id}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{id}</p>
          </TooltipContent>
        </Tooltip>
      ),
    },
    {
      title: t('event:list.columns.title'),
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string, record: SafetyCheckEvent) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="font-medium cursor-pointer hover:text-primary truncate" onClick={() => navigate(`/events/${record.id}`)}>
              {title}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{title}</p>
          </TooltipContent>
        </Tooltip>
      ),
    },
    {
      title: t('event:list.columns.type'),
      dataIndex: 'eventType',
      key: 'eventType',
      render: (type: EventType) => (
        <Badge variant={type === 'emergency' ? 'destructive' : 'secondary'}>
          {eventTypeMap[type]}
        </Badge>
      ),
    },
    {
      title: t('event:list.columns.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: EventStatus) => {
        const { label, color } = statusMap[status];
        return <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>{label}</span>;
      },
    },
    {
      title: t('event:list.columns.endTime'),
      dataIndex: 'deadlineTime',
      key: 'deadlineTime',
      render: (time: string) => (
        <div className="flex items-center gap-1 text-sm text-muted-foreground whitespace-nowrap">
          <Clock className="size-3.5 flex-shrink-0" />
          <span className="truncate">{new Date(time).toLocaleString('en-US')}</span>
        </div>
      ),
    },
    {
      title: t('event:list.columns.recipients'),
      dataIndex: 'notificationScope',
      key: 'notificationScope',
      render: (scope: string[]) => `${scope.length}`,
    },
    {
      title: t('event:list.columns.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (time: string) => (
        <div className="flex items-center gap-1 text-sm text-muted-foreground whitespace-nowrap">
          <Calendar className="size-3.5 flex-shrink-0" />
          <span className="truncate">{new Date(time).toLocaleString('en-US')}</span>
        </div>
      ),
    },
    {
      title: t('common:table.action'),
      key: 'action',
      width: 60,
      render: (_: unknown, record: SafetyCheckEvent) => (
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            setEventToDelete(record);
            setIsDeleteDialogOpen(true);
          }}
        >
          <Trash2 className="size-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select
            value={statusFilter || 'all'}
            onValueChange={(value) => setStatusFilter(value === 'all' ? undefined : (value as EventStatus))}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="筛选状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('event:list.filter.allStatus')}</SelectItem>
              <SelectItem value="draft">{t('common:status.draft')}</SelectItem>
              <SelectItem value="ongoing">{t('common:status.ongoing')}</SelectItem>
              <SelectItem value="completed">{t('common:status.completed')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 size-4" />
          {t('event:list.newEvent')}
        </Button>
      </div>

      {/* 事件列表 */}
      <Card>
        <CardContent className="p-0">
          <TooltipProvider>
            <Table
              columns={columns}
              dataSource={eventListData?.items || []}
              loading={isLoading}
              rowKey="id"
              pagination={{
                current: pagination.page,
                pageSize: pagination.pageSize,
                total: eventListData?.total || 0,
                showSizeChanger: true,
                showTotal: (total: number) => t('common:pagination.total', { total }),
                pageSizeOptions: ['10', '20', '50', '100'],
              }}
              onChange={handleTableChange}
              size="small"
              scroll={{ x: 'max-content' }}
              onRow={(record: SafetyCheckEvent) => ({
                onClick: () => navigate(`/events/${record.id}`),
                className: 'cursor-pointer',
              })}
            />
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* 删除确认对话框 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common:dialog.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common:dialog.deleteWarning', { name: eventToDelete?.title || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEventToDelete(null)}>{t('common:actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => eventToDelete && deleteEventMutation.mutate(eventToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common:actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 创建事件弹窗 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('event:list.newEvent')}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>
                        {t('event:form.title')} <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder={t('event:form.placeholder.title')} className="placeholder:text-muted-foreground" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="eventType"
                  render={({ field }) => (
                    <FormItem className="col-span-1">
                      <FormLabel>
                        {t('event:form.type')} <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('common:actions.select')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="emergency">{t('event:type.emergency')}</SelectItem>
                          <SelectItem value="daily">{t('event:type.daily')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('event:form.description')}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={t('event:form.placeholder.description')} className="placeholder:text-muted-foreground" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notificationScope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('event:form.recipients')} <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <RecipientSelector
                        multiple
                        value={field.value as import('@/components/RecipientSelector').RecipientTarget[]}
                        onChange={field.onChange}
                        placeholder={t('event:form.placeholder.recipients')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sendType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('event:form.sendType')} <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('common:actions.select')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="immediate">{t('event:sendType.immediate')}</SelectItem>
                          <SelectItem value="scheduled">{t('event:sendType.scheduled')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {watchSendType === 'scheduled' && (
                  <FormField
                    control={form.control}
                    name="sendTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('event:form.sendTime')} <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input type="datetime-local" lang="en" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <FormField
                control={form.control}
                name="deadlineTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('event:form.endTime')} <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="datetime-local" lang="en" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  {t('common:actions.cancel')}
                </Button>
                <Button type="submit" disabled={createEventMutation.isPending}>
                  {createEventMutation.isPending ? t('common:actions.loading') : t('common:actions.create')}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
