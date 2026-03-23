import { All, Controller, Get, Req, Res } from '@nestjs/common';
import { request as httpRequest } from 'http';
import type { Request, Response } from 'express';

@Controller()
export class ViewController {
  private readonly clientDevPort = Number(process.env.CLIENT_DEV_PORT || '8080');

  private readonly devAssetPrefixes = [
    '/@vite',
    '/@react-refresh',
    '/@runtime.js',
    '/@error-overlay.js',
    '/@id/',
    '/@fs/',
    '/__vite/',
    '/client/',
    '/node_modules/',
    '/dev/',
  ];

  private isDevAssetRequest(req: Request): boolean {
    const pathname = req.path || req.url?.split('?')[0] || '';

    return (
      this.devAssetPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix)) ||
      /\.(js|mjs|ts|tsx|jsx|css|map|json|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i.test(pathname)
    );
  }

  private proxyToClientDevServer(req: Request, res: Response): void {
    const proxyReq = httpRequest(
      {
        hostname: 'localhost',
        port: this.clientDevPort,
        path: req.originalUrl || req.url,
        method: req.method,
        headers: {
          ...req.headers,
          host: `localhost:${this.clientDevPort}`,
        },
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
        proxyRes.pipe(res);
      },
    );

    proxyReq.on('error', (error) => {
      if (!res.headersSent) {
        res.status(502).json({
          error: 'client_dev_proxy_failed',
          message: error.message,
          target: `http://localhost:${this.clientDevPort}`,
          path: req.originalUrl || req.url,
        });
      }
    });

    req.pipe(proxyReq);
  }

  private renderIndex(req: Request, res: Response): void {
    const platformData = req.__platform_data__ ?? {};
    res.render('index', { __platform__: JSON.stringify(platformData) });
  }

  // 处理根路径 /af/p/app_xxx
  @Get()
  root(@Req() req: Request, @Res() res: Response) {
    this.renderIndex(req, res);
  }

  // 处理所有子路径 /af/p/app_xxx/*
  @All('*')
  all(@Req() req: Request, @Res() res: Response) {
    if (process.env.NODE_ENV === 'development' && this.isDevAssetRequest(req)) {
      this.proxyToClientDevServer(req, res);
      return;
    }

    this.renderIndex(req, res);
  }
}
