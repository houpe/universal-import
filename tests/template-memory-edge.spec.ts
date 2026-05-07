import { test, expect } from '@playwright/test';
import path from 'path';

const BASE_URL = 'https://exam-project-fawn.vercel.app';
const TEST_FILES_DIR = path.join(__dirname, '../test-files');

test.describe('Template Memory Edge Cases', () => {
  test('边界1: 相同文件但修改了一列内容', async ({ context, page }) => {
    // 先上传原始文件，手动映射
    await page.goto(`${BASE_URL}/import`);
    await page.locator('input[type="file"]').setInputFiles(path.join(TEST_FILES_DIR, '13_手动映射测试.xlsx'));
    await page.waitForTimeout(2000);
    
    await expect(page.getByText('列映射配置')).toBeVisible();
    
    const selects = page.locator('select');
    const mappings = [
      { col: 0, value: 'sender_name' },
      { col: 1, value: 'sender_phone' },
      { col: 2, value: 'sender_address' },
      { col: 3, value: 'receiver_name' },
      { col: 4, value: 'receiver_phone' },
      { col: 5, value: 'receiver_address' },
      { col: 6, value: 'weight' },
      { col: 7, value: 'quantity' },
      { col: 8, value: 'temp_zone' },
      { col: 9, value: 'external_code' },
      { col: 10, value: 'remark' },
    ];
    
    for (const m of mappings) {
      await selects.nth(m.col).selectOption(m.value);
    }
    
    await page.getByRole('button', { name: '确认映射' }).click();
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/preview');
    
    // 创建修改后的文件（数据不同但表头相同）
    const { execSync } = require('child_process');
    execSync(`python3 -c "
from openpyxl import load_workbook
wb = load_workbook('${TEST_FILES_DIR}/13_手动映射测试.xlsx')
ws = wb.active
ws['A2'] = '新张三'
ws['B2'] = '13800138001'
wb.save('${TEST_FILES_DIR}/13_手动映射测试_修改版.xlsx')
"`);
    
    // 上传修改后的文件（相同表头，不同数据）
    await page.goto(`${BASE_URL}/import`);
    await page.locator('input[type="file"]').setInputFiles(path.join(TEST_FILES_DIR, '13_手动映射测试_修改版.xlsx'));
    await page.waitForTimeout(3000);
    
    const columnMapperVisible = await page.getByText('列映射配置').isVisible({ timeout: 2000 }).catch(() => false);
    
    if (columnMapperVisible) {
      console.log('❌ 修改数据后仍弹出映射配置');
      await page.screenshot({ path: path.join(TEST_FILES_DIR, 'screenshots', 'bug-modified-data.png') });
    } else {
      const url = page.url();
      if (url.includes('/preview')) {
        console.log('✅ 修改数据后自动应用映射');
        await page.screenshot({ path: path.join(TEST_FILES_DIR, 'screenshots', 'ok-modified-data.png') });
      } else {
        console.log('⚠️ 未弹出映射框也未跳转预览，URL:', url);
      }
    }
  });

  test('边界2: 相同表头但列顺序不同', async ({ context, page }) => {
    // 创建列顺序不同的文件
    const { execSync } = require('child_process');
    execSync(`python3 -c "
from openpyxl import Workbook
wb = Workbook()
ws = wb.active
ws.title = '订单数据'
# 不同的列顺序
headers = ['特殊说明', '客户参考号', '温控类型', '箱数', '毛重', '接收地址', '接收电话', '接收方', '出发地址', '出发电话', '出发方']
ws.append(headers)
ws.append(['加急处理', 'EXT-001', '常温', 2, 5.5, '上海市浦东新区yyy路2号', '13900139000', '李四', '北京市朝阳区xxx街道1号', '13800138000', '张三'])
ws.append(['', 'EXT-002', '冷藏', 1, 3.2, '深圳市南山区aaa道4号', '13600136000', '赵六', '广州市天河区zzz街3号', '13700137000', '王五'])
wb.save('${TEST_FILES_DIR}/13_手动映射测试_乱序.xlsx')
"`);
    
    // 上传乱序文件
    await page.goto(`${BASE_URL}/import`);
    await page.locator('input[type="file"]').setInputFiles(path.join(TEST_FILES_DIR, '13_手动映射测试_乱序.xlsx'));
    await page.waitForTimeout(2000);
    
    // 应该弹出映射配置（因为指纹不同）
    await expect(page.getByText('列映射配置')).toBeVisible();
    console.log('✅ 乱序文件正确弹出映射配置（指纹不同）');
    
    // 手动配置
    const selects = page.locator('select');
    const mappings = [
      { col: 0, value: 'remark' },
      { col: 1, value: 'external_code' },
      { col: 2, value: 'temp_zone' },
      { col: 3, value: 'quantity' },
      { col: 4, value: 'weight' },
      { col: 5, value: 'receiver_address' },
      { col: 6, value: 'receiver_phone' },
      { col: 7, value: 'receiver_name' },
      { col: 8, value: 'sender_address' },
      { col: 9, value: 'sender_phone' },
      { col: 10, value: 'sender_name' },
    ];
    
    for (const m of mappings) {
      await selects.nth(m.col).selectOption(m.value);
    }
    
    await page.getByRole('button', { name: '确认映射' }).click();
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/preview');
    
    // 再上传一次乱序文件，应该自动应用
    await page.goto(`${BASE_URL}/import`);
    await page.locator('input[type="file"]').setInputFiles(path.join(TEST_FILES_DIR, '13_手动映射测试_乱序.xlsx'));
    await page.waitForTimeout(3000);
    
    const columnMapperVisible = await page.getByText('列映射配置').isVisible({ timeout: 2000 }).catch(() => false);
    
    if (columnMapperVisible) {
      console.log('❌ 乱序文件第二次仍弹出映射配置');
    } else {
      const url = page.url();
      if (url.includes('/preview')) {
        console.log('✅ 乱序文件第二次自动应用映射');
      } else {
        console.log('⚠️ 未跳转预览，URL:', url);
      }
    }
  });

  test('边界3: 表头多一个空格', async ({ context, page }) => {
    // 创建表头有空格的文件
    const { execSync } = require('child_process');
    execSync(`python3 -c "
from openpyxl import Workbook
wb = Workbook()
ws = wb.active
ws.title = '订单数据'
# 表头多空格
headers = ['出发方 ', ' 出发电话', '出发 地址', '接收方', '接收电话', '接收地址', '毛重', '箱数', '温控类型', '客户参考号', '特殊说明']
ws.append(headers)
ws.append(['张三', '13800138000', '北京市朝阳区xxx街道1号', '李四', '13900139000', '上海市浦东新区yyy路2号', 5.5, 2, '常温', 'EXT-001', '加急'])
wb.save('${TEST_FILES_DIR}/13_手动映射测试_空格.xlsx')
"`);
    
    await page.goto(`${BASE_URL}/import`);
    await page.locator('input[type="file"]').setInputFiles(path.join(TEST_FILES_DIR, '13_手动映射测试_空格.xlsx'));
    await page.waitForTimeout(2000);
    
    // 应该弹出映射配置（指纹不同）
    await expect(page.getByText('列映射配置')).toBeVisible();
    console.log('✅ 空格文件正确弹出映射配置');
    
    // 手动配置
    const selects = page.locator('select');
    const mappings = [
      { col: 0, value: 'sender_name' },
      { col: 1, value: 'sender_phone' },
      { col: 2, value: 'sender_address' },
      { col: 3, value: 'receiver_name' },
      { col: 4, value: 'receiver_phone' },
      { col: 5, value: 'receiver_address' },
      { col: 6, value: 'weight' },
      { col: 7, value: 'quantity' },
      { col: 8, value: 'temp_zone' },
      { col: 9, value: 'external_code' },
      { col: 10, value: 'remark' },
    ];
    
    for (const m of mappings) {
      await selects.nth(m.col).selectOption(m.value);
    }
    
    await page.getByRole('button', { name: '确认映射' }).click();
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/preview');
    
    // 上传相同空格文件，应该自动应用
    await page.goto(`${BASE_URL}/import`);
    await page.locator('input[type="file"]').setInputFiles(path.join(TEST_FILES_DIR, '13_手动映射测试_空格.xlsx'));
    await page.waitForTimeout(3000);
    
    const columnMapperVisible = await page.getByText('列映射配置').isVisible({ timeout: 2000 }).catch(() => false);
    
    if (columnMapperVisible) {
      console.log('❌ 空格文件第二次仍弹出映射配置');
    } else {
      const url = page.url();
      if (url.includes('/preview')) {
        console.log('✅ 空格文件第二次自动应用映射');
      } else {
        console.log('⚠️ 未跳转预览，URL:', url);
      }
    }
  });
});
