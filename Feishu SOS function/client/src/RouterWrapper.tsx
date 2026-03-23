import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import FeishuCallbackPage from './pages/FeishuCallbackPage/FeishuCallbackPage';

// 检测是否处于反馈页面路径
const isFeedbackPage = () => {
  const pathname = window.location.pathname;
  return pathname.includes('/feedback/events/');
};

// 从当前路径解析 eventId
const extractEventIdFromPath = (): string | null => {
  const pathname = window.location.pathname;
  const match = pathname.match(/feedback\/events\/([^\/\?]+)/);
  return match ? match[1] : null;
};

// 反馈页面包装组件 - 不使用 React Router 的匹配，直接渲染
export const FeedbackRouteHandler: React.FC = () => {
  const eventId = extractEventIdFromPath();
  
  if (!eventId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-red-600">页面不存在</h1>
          <p className="text-gray-500 mt-2">无法找到事件ID</p>
        </div>
      </div>
    );
  }

  // 直接渲染反馈页面，不使用 useParams
  return <FeishuCallbackPageRaw eventId={eventId} />;
};

// 直接传递 eventId 的反馈页面包装
const FeishuCallbackPageRaw: React.FC<{ eventId: string }> = ({ eventId }) => {
  // 获取当前 URL 的 search 参数
  const search = window.location.search;
  
  // 使用 MemoryRouter 模拟路由环境，让 FeishuCallbackPage 的 useParams 和 useSearchParams 能正常工作
  return (
    <MemoryRouter initialEntries={[`/feedback/events/${eventId}${search}`]}>
      <Routes>
        <Route path="/feedback/events/:eventId" element={<FeishuCallbackPage />} />
      </Routes>
    </MemoryRouter>
  );
};

// 自动检测 basename
const detectBasename = (): string => {
  const pathname = window.location.pathname;
  
  // 检查是否是部署路径格式: /spark/faas/app_xxx/...
  const match = pathname.match(/^(\/spark\/faas\/app_[^\/]+)/);
  if (match) {
    return match[1];
  }
  
  return '/';
};

export { detectBasename };
