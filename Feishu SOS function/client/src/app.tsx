import './i18n';
import React, { useEffect } from 'react';
import { Route, Routes, Navigate, useLocation, useParams } from 'react-router-dom';

import Layout from './components/Layout';
import NotFound from './pages/NotFound/NotFound';
import EventListPage from './pages/EventListPage/EventListPage';
import EventDetailPage from './pages/EventDetailPage/EventDetailPage';
import FeishuCallbackPage from './pages/FeishuCallbackPage/FeishuCallbackPage';
import EmployeeFeedbackPage from './pages/EmployeeFeedbackPage/EmployeeFeedbackPage';
import TranslationPage from './pages/TranslationPage/TranslationPage';
import { logger } from '@lark-apaas/client-toolkit/logger';

// 调试日志组件 - 打印路由相关信息
const DebugLogger: React.FC = () => {
  const location = useLocation();
  const params = useParams();
  
  useEffect(() => {
    logger.info('[Debug] window.location.pathname:', window.location.pathname);
    logger.info('[Debug] useLocation().pathname:', location.pathname);
    logger.info('[Debug] useParams():', JSON.stringify(params));
    logger.info('[Debug] basename:', (process.env.CLIENT_BASE_PATH || '/'));
  }, [location, params]);
  
  return null;
};

// 带调试日志的反馈页面包装组件
const EmployeeFeedbackPageWithDebug: React.FC = () => {
  return (
    <>
      <DebugLogger />
      <EmployeeFeedbackPage />
    </>
  );
};

// 通配符路由处理器 - 仅处理回调页面
const WildcardRouteHandler: React.FC = () => {
  const location = useLocation();
  const pathname = location.pathname;
  
  // 检查是否是飞书回调页面路径 (包含 /callback/)
  if (pathname.includes('/callback/')) {
    return <FeishuCallbackPage />;
  }
  
  return <NotFound />;
};

const RoutesComponent: React.FC = () => {
  // 调试：打印当前路径信息
  const location = window.location;
  logger.info('[Route Debug] pathname:', location.pathname);
  logger.info('[Route Debug] search:', location.search);
  logger.info('[Route Debug] basename:', (process.env.CLIENT_BASE_PATH || '/'));
  
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/events" replace />} />
        <Route path="/events" element={<EventListPage />} />
        <Route path="/events/:eventId" element={<EventDetailPage />} />
        <Route path="/translations" element={<TranslationPage />} />
      </Route>
      {/* 员工反馈页面 - 独立布局，无侧边栏 */}
      <Route path="/feedback/events/:eventId" element={<EmployeeFeedbackPageWithDebug />} />
      {/* 通配符路由 - 处理所有其他路径 */}
      <Route path="*" element={<WildcardRouteHandler />} />
    </Routes>
  );
};

export default RoutesComponent;
