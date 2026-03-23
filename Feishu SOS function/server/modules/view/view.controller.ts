import { Controller, Get, Render, Req, All } from '@nestjs/common';
import type { Request } from 'express';

@Controller()
export class ViewController {

  // 处理根路径 /af/p/app_xxx
  @Get()
  @Render('index')
  root(@Req() req: Request) {
    const platformData = req.__platform_data__ ?? {};
    return { __platform__: JSON.stringify(platformData) };
  }

  // 处理所有子路径 /af/p/app_xxx/*
  @All('*')
  @Render('index')
  all(@Req() req: Request) {
    const platformData = req.__platform_data__ ?? {};
    return { __platform__: JSON.stringify(platformData) };
  }
}
