'use client';

import { useState, useCallback, useMemo } from 'react';
import { BaseCombobox } from '@client/src/components/business-ui/entity-combobox/base-combobox';
import { BaseComboboxItem } from '@client/src/components/business-ui/entity-combobox/base-combobox-item';
import type { ItemValue } from '@client/src/components/business-ui/entity-combobox/types';
import { User, Users, Search } from 'lucide-react';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { searchUsers as searchUsersService } from '@client/src/components/business-ui/api/users/service';
import type { NotificationTarget } from '@shared/api.interface';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';

export type RecipientType = 'user' | 'chat';

export interface RecipientTarget {
  id: string;
  type: RecipientType;
  name: string;
  avatar?: string;
  description?: string;
  department?: string;  // 显式部门字段
  memberCount?: number;
}

export interface RecipientSelectorProps {
  value?: RecipientTarget[];
  onChange?: (value: RecipientTarget[]) => void;
  placeholder?: string;
  disabled?: boolean;
  multiple?: boolean;
}

interface SearchUserResult {
  id: string;
  name: string;
  avatar?: string;
}

interface SearchChatResult {
  id: string;
  name: string;
  description?: string;
  memberCount?: number;
}

interface CombinedSearchResult {
  users: SearchUserResult[];
  chats: SearchChatResult[];
}

interface RecipientItemValue extends ItemValue<RecipientTarget> {
  id: string;
  name: string;
  avatar?: string;
  raw: RecipientTarget;
}

async function searchRecipients(query: string): Promise<{ items: RecipientTarget[] }> {
  if (!query || query.length < 1) {
    return { items: [] };
  }

  try {
    const items: RecipientTarget[] = [];

    // 使用内置 UserService 搜索飞书员工
    const userResponse = await searchUsersService({
      query: query,
      pageSize: 20,
    });

    if (userResponse.data?.userList) {
      items.push(
        ...userResponse.data.userList.map(
          (user: { 
            userID: string; 
            name: { zh_cn: string; en_us?: string }; 
            avatar?: { image?: { large?: string } } | string;
            department?: { name?: { zh_cn?: string; en_us?: string } };
          }) => {
            const deptName = user.department?.name?.zh_cn || user.department?.name?.en_us || '';
            return {
              id: user.userID,
              type: 'user' as RecipientType,
              name: user.name?.zh_cn || user.name?.en_us || '',
              avatar: typeof user.avatar === 'string' 
                ? user.avatar 
                : user.avatar?.image?.large,
              description: deptName,  // 保持向后兼容
              department: deptName,   // 显式字段
            };
          }
        )
      );
    }

    // 群组仍使用后端 API
    try {
      const chatResponse = await axiosForBackend({
        url: '/api/recipients/search',
        method: 'GET',
        params: { query, pageSize: 20 },
      });

      const data = chatResponse.data as CombinedSearchResult;
      items.push(
        ...(data.chats || []).map((chat) => ({
          id: chat.id,
          type: 'chat' as RecipientType,
          name: chat.name,
          description: chat.description,
          memberCount: chat.memberCount,
        }))
      );
    } catch (chatError) {
      // 群组搜索失败不影响用户搜索结果
      logger.warn('Failed to search chats:', chatError);
    }

    return { items };
  } catch (error) {
    toast.error('Failed to search recipients');
    return { items: [] };
  }
}

const RecipientItem = ({
  item,
  isSelected,
  className,
}: {
  item: RecipientTarget;
  isSelected: boolean;
  className?: string;
}) => {
  const isUser = item.type === 'user';

  return (
    <div className={`flex items-center gap-3 px-3 py-2 ${className}`}>
      <div className="flex-shrink-0">
        {isUser ? (
          item.avatar ? (
            <img
              src={item.avatar}
              alt={item.name}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
          )
        ) : (
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <Users className="w-4 h-4 text-accent-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{item.name}</div>
        <div className="text-xs text-muted-foreground">
          {isUser
            ? item.description || 'User'
            : item.memberCount
              ? `${item.memberCount} members`
              : 'Group'}
        </div>
      </div>
      {isSelected && (
        <div className="flex-shrink-0 text-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </div>
  );
};

const RecipientTag = ({
  target,
  onClose,
}: {
  target: RecipientTarget;
  onClose: (e: React.MouseEvent) => void;
}) => {
  const isUser = target.type === 'user';

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-accent text-accent-foreground text-sm max-w-full">
      <div className="flex-shrink-0">
        {isUser ? (
          target.avatar ? (
            <img
              src={target.avatar}
              alt={target.name}
              className="w-4 h-4 rounded-full object-cover"
            />
          ) : (
            <User className="w-3.5 h-3.5" />
          )
        ) : (
          <Users className="w-3.5 h-3.5" />
        )}
      </div>
      <span className="truncate">{target.name}</span>
      <button
        type="button"
        onClick={onClose}
        className="flex-shrink-0 hover:text-foreground transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export const RecipientSelector: React.FC<RecipientSelectorProps> = ({
  value = [],
  onChange,
  placeholder = 'Search users or groups...',
  disabled = false,
  multiple = true,
}) => {
  const [internalValue, setInternalValue] = useState<RecipientTarget[]>(value);

  const currentValue = value !== undefined ? value : internalValue;

  const handleChange = useCallback(
    (newValue: RecipientItemValue | RecipientItemValue[] | null) => {
      const targets: RecipientTarget[] = Array.isArray(newValue)
        ? newValue.map(v => v.raw)
        : newValue
          ? [newValue.raw]
          : [];

      // 注意：department 补全逻辑已移至提交前统一处理（EventListPage.onSubmit）
      // 这里保持同步，确保 onChange 能被正确等待

      if (value === undefined) {
        setInternalValue(targets);
      }

      onChange?.(targets);
    },
    [onChange, value],
  );

  const getItemValue = useCallback(
    (item: RecipientTarget): RecipientItemValue => ({
      id: `${item.type}:${item.id}`,
      name: item.name,
      avatar: item.avatar,
      raw: item,
    }),
    [],
  );

  const itemValues: RecipientItemValue[] = useMemo(
    () => currentValue.map(target => getItemValue(target)),
    [currentValue, getItemValue],
  );

  const renderItem = useCallback(
    (item: RecipientTarget, isSelected: boolean, className?: string, disabled?: boolean) => (
      <BaseComboboxItem
        key={`${item.type}:${item.id}`}
        item={item}
        getItemValue={getItemValue}
        isSelected={isSelected}
        className={className}
        disabled={disabled}
      >
        <RecipientItem item={item} isSelected={isSelected} />
      </BaseComboboxItem>
    ),
    [getItemValue],
  );

  const renderTag = useCallback(
    (itemValue: RecipientItemValue, onClose: (value: RecipientItemValue, e: React.MouseEvent) => void) => (
      <RecipientTag
        target={itemValue.raw}
        onClose={(e) => onClose(itemValue, e)}
      />
    ),
    [],
  );

  return (
    <BaseCombobox
      fetchFn={searchRecipients}
      multiple={multiple}
      value={itemValues}
      onChange={handleChange}
      disabled={disabled}
      placeholder={placeholder}
      searchPlaceholder="Search by name..."
      emptyText="No users or groups found"
      renderItem={renderItem}
      renderTag={renderTag}
      getItemValue={getItemValue}
      showSearch
      debounce={300}
    />
  );
};
