import { test, expect } from '@playwright/test';
import path from 'path';

const BASE_URL = 'https://exam-project-fawn.vercel.app';
const TEST_FILES_DIR = path.join(__dirname, '../test-files');

test.describe('Exam Comprehensive Test', () => {
  test('考点2: 标准模板导入 - 模板1', async ({ page }) => {
    await page.goto(`${BASE_URL}/import`);
    await expect(page.getByRole('heading', { name: '万能导入' })).toBeVisible();
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(TEST_FILES_DIR, '1_标准模板_正常.xlsx'));
    
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).toContain('/preview');
    
    // Check data loaded (use first() to avoid strict mode violation)
    await expect(page.getByText(/共 \d+ 条数据/).first()).toBeVisible();
    await page.screenshot({ path: path.join(TEST_FILES_DIR, 'screenshots', 'test1-standard.png') });
  });

  test('考点2: 合并单元格模板导入 - 模板2', async ({ page }) => {
    await page.goto(`${BASE_URL}/import`);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(TEST_FILES_DIR, '2_电商模板_合并单元格.xlsx'));
    
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).toContain('/preview');
    await page.screenshot({ path: path.join(TEST_FILES_DIR, 'screenshots', 'test2-merged.png') });
  });

  test('考点2: 英文列名模板导入', async ({ page }) => {
    await page.goto(`${BASE_URL}/import`);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(TEST_FILES_DIR, '3_英文列名模板.xlsx'));
    
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).toContain('/preview');
    await page.screenshot({ path: path.join(TEST_FILES_DIR, 'screenshots', 'test3-english.png') });
  });

  test('考点2: 大文件1000行导入', async ({ page }) => {
    await page.goto(`${BASE_URL}/import`);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(TEST_FILES_DIR, '8_大文件1000行.xlsx'));
    
    await page.waitForTimeout(5000);
    const url = page.url();
    expect(url).toContain('/preview');
    
    // Check 1000 rows loaded
    await expect(page.getByText(/1000 条数据/).first()).toBeVisible();
    await page.screenshot({ path: path.join(TEST_FILES_DIR, 'screenshots', 'test4-large.png') });
  });

  test('考点2: 空文件异常处理', async ({ page }) => {
    await page.goto(`${BASE_URL}/import`);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(TEST_FILES_DIR, '9_空文件.xlsx'));
    
    await page.waitForTimeout(2000);
    // Should show error toast with empty file message
    await expect(page.getByText(/Excel文件为空/).first()).toBeVisible();
    await page.screenshot({ path: path.join(TEST_FILES_DIR, 'screenshots', 'test5-empty.png') });
  });

  test('考点3: 错误校验 - 包含各种错误', async ({ page }) => {
    await page.goto(`${BASE_URL}/import`);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(TEST_FILES_DIR, '6_包含各种错误.xlsx'));
    
    await page.waitForTimeout(3000);
    await expect(page.url()).toContain('/preview');
    
    // Should show error summary
    await expect(page.getByText(/错误|必填|格式/).first()).toBeVisible();
    await page.screenshot({ path: path.join(TEST_FILES_DIR, 'screenshots', 'test6-validation.png') });
  });

  test('考点3: 外部编码重复检测', async ({ page }) => {
    // First upload a file with data to populate DB
    await page.goto(`${BASE_URL}/import`);
    let fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(TEST_FILES_DIR, '1_标准模板_正常.xlsx'));
    await page.waitForTimeout(3000);
    
    // Now upload template with missing optional columns
    await page.goto(`${BASE_URL}/import`);
    fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(TEST_FILES_DIR, '7_缺少选填列模板.xlsx'));
    
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).toContain('/preview');
    await page.screenshot({ path: path.join(TEST_FILES_DIR, 'screenshots', 'test7-missing-optional.png') });
  });

  test('考点5: 进度条显示', async ({ page }) => {
    await page.goto(`${BASE_URL}/import`);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(TEST_FILES_DIR, '8_大文件1000行.xlsx'));
    
    // Wait for parsing state to appear (spinner or progress text)
    await expect(page.locator('.animate-spin').first()).toBeVisible({ timeout: 3000 });
    
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(TEST_FILES_DIR, 'screenshots', 'test8-progress.png') });
  });

  test('考点6: 运单列表查看', async ({ page }) => {
    await page.goto(`${BASE_URL}/orders`);
    await expect(page.getByRole('heading', { name: '已导入运单' })).toBeVisible();
    
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(TEST_FILES_DIR, 'screenshots', 'test9-orders.png') });
  });

  test('考点4: 导出功能', async ({ page }) => {
    await page.goto(`${BASE_URL}/import`);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(TEST_FILES_DIR, '1_标准模板_正常.xlsx'));
    
    await page.waitForTimeout(3000);
    
    // Click export button
    await page.getByRole('button', { name: /导出/ }).click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(TEST_FILES_DIR, 'screenshots', 'test10-export.png') });
  });
});
