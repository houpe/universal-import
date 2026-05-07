import { test, expect } from '@playwright/test';
import path from 'path';

const BASE_URL = 'https://exam-project-fawn.vercel.app';
const TEST_FILES_DIR = path.join(__dirname, '../test-files');

test.describe('Manual Mapping Test', () => {
  test('手动映射：上传非常用列名文件，系统弹出映射配置', async ({ page }) => {
    await page.goto(`${BASE_URL}/import`);
    await expect(page.getByRole('heading', { name: '万能导入' })).toBeVisible();
    
    // 上传非常用列名的文件
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(TEST_FILES_DIR, '13_手动映射测试.xlsx'));
    
    // 等待解析完成
    await page.waitForTimeout(2000);
    
    // 应该弹出 ColumnMapper 模态框（因为自动识别不完整）
    await expect(page.getByText('列映射配置')).toBeVisible();
    await expect(page.getByText('请为每列 Excel 数据选择对应的系统字段')).toBeVisible();
    
    // 验证显示了所有列
    await expect(page.getByText('出发方')).toBeVisible();
    await expect(page.getByText('出发电话')).toBeVisible();
    await expect(page.getByText('接收方')).toBeVisible();
    await expect(page.getByText('毛重')).toBeVisible();
    await expect(page.getByText('箱数')).toBeVisible();
    
    // 截图保存
    await page.screenshot({ path: path.join(TEST_FILES_DIR, 'screenshots', 'test-manual-mapping-dialog.png') });
    
    // 手动配置映射
    const selectElements = page.locator('select');
    
    // 为每个下拉框选择对应的系统字段
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
    
    // 点击确认映射
    await page.getByRole('button', { name: '确认映射' }).click();
    
    // 应该跳转到预览页面
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).toContain('/preview');
    
    // 验证数据加载成功
    await expect(page.getByText(/共 \d+ 条数据/).first()).toBeVisible();
    
    // 截图保存
    await page.screenshot({ path: path.join(TEST_FILES_DIR, 'screenshots', 'test-manual-mapping-preview.png') });
  });
});
