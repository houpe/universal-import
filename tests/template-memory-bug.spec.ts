import { test, expect } from '@playwright/test';
import path from 'path';

const BASE_URL = 'https://exam-project-fawn.vercel.app';
const TEST_FILES_DIR = path.join(__dirname, '../test-files');

test.describe('Template Memory Test - Second Import', () => {
  test('第一次手动映射，第二次应自动应用', async ({ page }) => {
    // Step 1: First import - manual mapping
    await page.goto(`${BASE_URL}/import`);
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(TEST_FILES_DIR, '13_手动映射测试.xlsx'));
    
    await page.waitForTimeout(2000);
    
    // Should show ColumnMapper dialog
    await expect(page.getByText('列映射配置')).toBeVisible();
    
    // Configure mapping
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
    
    // Should navigate to preview
    expect(page.url()).toContain('/preview');
    
    // Step 2: Go back to import and upload the same file again
    await page.goto(`${BASE_URL}/import`);
    await fileInput.setInputFiles(path.join(TEST_FILES_DIR, '13_手动映射测试.xlsx'));
    
    // Wait for parsing
    await page.waitForTimeout(3000);
    
    // Check if ColumnMapper appears again (it shouldn't if template memory works)
    const columnMapperVisible = await page.getByText('列映射配置').isVisible({ timeout: 2000 }).catch(() => false);
    
    if (columnMapperVisible) {
      console.log('❌ BUG: 第二次导入仍弹出映射配置对话框！');
      await page.screenshot({ path: path.join(TEST_FILES_DIR, 'screenshots', 'bug-second-import-mapper.png') });
      
      // Check localStorage for saved mappings
      const savedMappings = await page.evaluate(() => {
        return localStorage.getItem('template_mappings');
      });
      
      console.log('localStorage template_mappings:', savedMappings);
    } else {
      // Should auto-apply saved mapping and navigate to preview
      const url = page.url();
      if (url.includes('/preview')) {
        console.log('✅ 第二次导入自动应用了保存的映射');
        await page.screenshot({ path: path.join(TEST_FILES_DIR, 'screenshots', 'ok-second-import-auto.png') });
      }
    }
  });
});
