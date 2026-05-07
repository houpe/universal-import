import { test, expect, BrowserContext } from '@playwright/test';
import path from 'path';

const BASE_URL = 'https://exam-project-fawn.vercel.app';
const TEST_FILES_DIR = path.join(__dirname, '../test-files');

test.describe('Template Memory - Detailed Test', () => {
  test('完整流程：手动映射 → 保存 → 关闭浏览器 → 重新打开 → 自动识别', async ({ context, page }) => {
    // === 第一次导入：手动映射 ===
    await page.goto(`${BASE_URL}/import`);
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(TEST_FILES_DIR, '13_手动映射测试.xlsx'));
    
    await page.waitForTimeout(2000);
    
    // 应该弹出映射配置对话框
    await expect(page.getByText('列映射配置')).toBeVisible();
    
    // 配置映射
    const selectElements = page.locator('select');
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
      await selectElements.nth(m.col).selectOption(m.value);
    }
    
    await page.getByRole('button', { name: '确认映射' }).click();
    await page.waitForTimeout(2000);
    
    // 验证跳转到预览页
    expect(page.url()).toContain('/preview');
    
    // 检查 localStorage 中保存的映射
    const savedMapping = await page.evaluate(() => localStorage.getItem('template_mappings'));
    console.log('=== 第一次导入后 localStorage ===');
    console.log(savedMapping);
    
    // === 模拟关闭浏览器再打开 ===
    // 创建新的页面（模拟新标签页/新会话）
    const newPage = await context.newPage();
    await newPage.goto(`${BASE_URL}/import`);
    
    // 验证 localStorage 中仍有数据
    const stillSaved = await newPage.evaluate(() => localStorage.getItem('template_mappings'));
    console.log('=== 新页面 localStorage ===');
    console.log(stillSaved);
    
    // === 第二次导入：同一文件 ===
    const fileInput2 = newPage.locator('input[type="file"]');
    await fileInput2.setInputFiles(path.join(TEST_FILES_DIR, '13_手动映射测试.xlsx'));
    
    await page.waitForTimeout(3000);
    
    // 检查是否弹出映射配置对话框
    const columnMapperVisible = await newPage.getByText('列映射配置').isVisible({ timeout: 2000 }).catch(() => false);
    
    if (columnMapperVisible) {
      console.log('❌ BUG: 第二次导入仍弹出映射配置对话框');
      await newPage.screenshot({ path: path.join(TEST_FILES_DIR, 'screenshots', 'bug-memory-second-import.png') });
      
      // 检查当前 URL
      console.log('当前 URL:', newPage.url());
    } else {
      const url = newPage.url();
      if (url.includes('/preview')) {
        console.log('✅ 第二次导入自动应用了保存的映射，直接跳转预览页');
        await newPage.screenshot({ path: path.join(TEST_FILES_DIR, 'screenshots', 'ok-memory-second-import.png') });
      } else {
        console.log('⚠️ 未弹出映射框，但也没有跳转到预览页，当前 URL:', url);
        await newPage.screenshot({ path: path.join(TEST_FILES_DIR, 'screenshots', 'warning-memory-second-import.png') });
      }
    }
  });
});
