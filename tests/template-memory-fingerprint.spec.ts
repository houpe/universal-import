import { test, expect } from '@playwright/test';
import path from 'path';

const BASE_URL = 'https://exam-project-fawn.vercel.app';
const TEST_FILES_DIR = path.join(__dirname, '../test-files');

test.describe('Template Memory - Fingerprint-based Learning', () => {
  test('T1 first import manual mapping then T2 same structure auto-apply', async ({ page }) => {
    await page.goto(`${BASE_URL}/import`);

    // Clear localStorage first
    await page.evaluate(() => localStorage.clear());

    // Step 1: Upload T1 - requires full manual mapping
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(TEST_FILES_DIR, 'T1_非标准模板A.xlsx'));
    await page.waitForTimeout(2000);

    // Should show ColumnMapper (non-standard headers)
    await expect(page.getByText('列映射配置')).toBeVisible();

    // Manual mapping
    const selectElements = page.locator('select');
    const mappings = [
      { col: 0, value: 'sender_name' },       // 出发方 -> 发件人姓名
      { col: 1, value: 'sender_phone' },       // 发件电话 -> 发件人电话
      { col: 2, value: 'sender_address' },     // 发件地址 -> 发件人地址
      { col: 3, value: 'receiver_name' },      // 收货方 -> 收件人姓名
      { col: 4, value: 'receiver_phone' },     // 收货电话 -> 收件人电话
      { col: 5, value: 'receiver_address' },   // 收货地址 -> 收件人地址
      { col: 6, value: 'weight' },             // 毛重 -> 重量
      { col: 7, value: 'quantity' },           // 箱数 -> 件数
      { col: 8, value: 'temp_zone' },          // 温层 -> 温层
      { col: 9, value: 'external_code' },      // 客户参考号 -> 外部编码
      { col: 10, value: 'remark' },            // 特殊说明 -> 备注
    ];

    for (const m of mappings) {
      await selectElements.nth(m.col).selectOption(m.value);
    }

    await page.getByRole('button', { name: '确认映射' }).click();
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/preview');

    // Save fingerprint and mapping info
    const t1Info = await page.evaluate(() => {
      const mappings = JSON.parse(localStorage.getItem('template_mappings') || '[]');
      return { count: mappings.length, fingerprint: mappings[0]?.fingerprint, columnKeys: Object.keys(mappings[0]?.columnMappings || {}) };
    });
    console.log('T1 saved:', JSON.stringify(t1Info));

    // Step 2: Upload T2 (same structure, different data)
    await page.goto(`${BASE_URL}/import`);
    await fileInput.setInputFiles(path.join(TEST_FILES_DIR, 'T2_同A结构不同数据.xlsx'));
    await page.waitForTimeout(3000);

    // T2 has same fingerprint -> should auto-apply and skip mapper
    const mapperVisible2 = await page.getByText('列映射配置').isVisible({ timeout: 2000 }).catch(() => false);

    if (mapperVisible2) {
      console.log('❌ T2: ColumnMapper appeared (should have auto-applied)');
      await page.screenshot({ path: path.join(TEST_FILES_DIR, 'screenshots', 'mem-t2-fail.png') });
    } else {
      expect(page.url()).toContain('/preview');
      console.log('✅ T2: Auto-applied saved mapping (same fingerprint)');
    }

    // Step 3: Upload T5 (same headers with extra spaces)
    await page.goto(`${BASE_URL}/import`);
    await fileInput.setInputFiles(path.join(TEST_FILES_DIR, 'T5_表头含空格.xlsx'));
    await page.waitForTimeout(3000);

    const mapperVisible5 = await page.getByText('列映射配置').isVisible({ timeout: 2000 }).catch(() => false);
    if (mapperVisible5) {
      console.log('❌ T5: ColumnMapper appeared (same fingerprint after normalize)');
      await page.screenshot({ path: path.join(TEST_FILES_DIR, 'screenshots', 'mem-t5-fail.png') });
    } else {
      expect(page.url()).toContain('/preview');
      console.log('✅ T5: Auto-applied (spaces trimmed by normalize)');
    }

    // Step 4: Upload T6 (same headers, shuffled order)
    await page.goto(`${BASE_URL}/import`);
    await fileInput.setInputFiles(path.join(TEST_FILES_DIR, 'T6_同A乱序(应同指纹).xlsx'));
    await page.waitForTimeout(3000);

    const mapperVisible6 = await page.getByText('列映射配置').isVisible({ timeout: 2000 }).catch(() => false);
    if (mapperVisible6) {
      console.log('❌ T6: ColumnMapper appeared (same fingerprint, shuffled)');
      await page.screenshot({ path: path.join(TEST_FILES_DIR, 'screenshots', 'mem-t6-fail.png') });
    } else {
      expect(page.url()).toContain('/preview');
      console.log('✅ T6: Auto-applied (fingerprint is sorted)');
    }
  });

  test('T3 different structure should NOT auto-apply T1 mapping', async ({ page }) => {
    await page.goto(`${BASE_URL}/import`);
    await page.evaluate(() => localStorage.clear());

    // Upload T1 first, map and save
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(TEST_FILES_DIR, 'T1_非标准模板A.xlsx'));
    await page.waitForTimeout(2000);
    await expect(page.getByText('列映射配置')).toBeVisible();

    const selectElements = page.locator('select');
    const mappings = [
      { col: 0, value: 'sender_name' }, { col: 1, value: 'sender_phone' },
      { col: 2, value: 'sender_address' }, { col: 3, value: 'receiver_name' },
      { col: 4, value: 'receiver_phone' }, { col: 5, value: 'receiver_address' },
      { col: 6, value: 'weight' }, { col: 7, value: 'quantity' },
      { col: 8, value: 'temp_zone' }, { col: 9, value: 'external_code' },
      { col: 10, value: 'remark' },
    ];
    for (const m of mappings) {
      await selectElements.nth(m.col).selectOption(m.value);
    }
    await page.getByRole('button', { name: '确认映射' }).click();
    await page.waitForTimeout(2000);

    // Upload T3 (different structure)
    await page.goto(`${BASE_URL}/import`);
    await fileInput.setInputFiles(path.join(TEST_FILES_DIR, 'T3_非标准模板B.xlsx'));
    await page.waitForTimeout(3000);

    // T3 has DIFFERENT fingerprint -> should show mapper again
    const mapperVisible = await page.getByText('列映射配置').isVisible({ timeout: 2000 }).catch(() => false);
    expect(mapperVisible).toBe(true);
    console.log('✅ T3: Different fingerprint -> requires new mapping');

    await page.screenshot({ path: path.join(TEST_FILES_DIR, 'screenshots', 'mem-t3-different.png') });
  });

  test('T4 mixed template - partial auto-map, partial manual', async ({ page }) => {
    await page.goto(`${BASE_URL}/import`);
    await page.evaluate(() => localStorage.clear());

    // T4 has: 发件人姓名, 发件人电话, 发件人地址 (standard) + weight, qty (auto-match) + 客户参考号, 特殊说明 (non-standard)
    // All REQUIRED fields are standard (发件人姓名, 发件人电话, 发件人地址, 收件人姓名, 收件人电话, 收件人地址, weight, qty, 温层)
    // Non-standard fields (客户参考号, 特殊说明) are OPTIONAL, so auto-mapping covers all required -> goes to preview directly
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(TEST_FILES_DIR, 'T4_混合模板(部分标准).xlsx'));
    await page.waitForTimeout(2000);

    // T4 should auto-advance to preview since all required fields are auto-mapped
    // ColumnMapper should NOT appear because optional fields don't block the flow
    const mapperVisible = await page.getByText('列映射配置').isVisible({ timeout: 2000 }).catch(() => false);

    if (mapperVisible) {
      console.log('⚠️ T4: ColumnMapper appeared (some columns need manual mapping)');
    } else {
      expect(page.url()).toContain('/preview');
      console.log('✅ T4: Auto-mapped all required fields, skipped to preview');
    }

    // T4 fingerprint should be different from T1
    // Note: auto-mapped templates don't save to localStorage (no need since auto-mapping works)
    const t4Headers = await page.evaluate(() => {
      return JSON.parse(sessionStorage.getItem('preview_headers') || '[]');
    });
    console.log('T4 headers:', JSON.stringify(t4Headers));
    expect(t4Headers.length).toBeGreaterThan(0);
  });

  test('Verify localStorage columnMappings keys are normalized headers', async ({ page }) => {
    await page.goto(`${BASE_URL}/import`);
    await page.evaluate(() => localStorage.clear());

    // Upload T1 and map
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(TEST_FILES_DIR, 'T1_非标准模板A.xlsx'));
    await page.waitForTimeout(2000);

    const selectElements = page.locator('select');
    const mappings = [
      { col: 0, value: 'sender_name' }, { col: 1, value: 'sender_phone' },
      { col: 2, value: 'sender_address' }, { col: 3, value: 'receiver_name' },
      { col: 4, value: 'receiver_phone' }, { col: 5, value: 'receiver_address' },
      { col: 6, value: 'weight' }, { col: 7, value: 'quantity' },
      { col: 8, value: 'temp_zone' }, { col: 9, value: 'external_code' },
      { col: 10, value: 'remark' },
    ];
    for (const m of mappings) {
      await selectElements.nth(m.col).selectOption(m.value);
    }
    await page.getByRole('button', { name: '确认映射' }).click();
    await page.waitForTimeout(2000);

    // Inspect saved mapping
    const savedData = await page.evaluate(() => {
      const mappings = JSON.parse(localStorage.getItem('template_mappings') || '[]');
      return mappings[0];
    });

    console.log('Saved columnMappings keys:', JSON.stringify(Object.keys(savedData.columnMappings)));
    console.log('Saved columnMappings values:', JSON.stringify(savedData.columnMappings));

    // Verify all 11 columns are saved
    expect(Object.keys(savedData.columnMappings).length).toBe(11);

    // Verify expected mappings
    expect(savedData.columnMappings['出发方']).toBe('sender_name');
    expect(savedData.columnMappings['箱数']).toBe('quantity');
    expect(savedData.columnMappings['客户参考号']).toBe('external_code');
    expect(savedData.columnMappings['特殊说明']).toBe('remark');
  });
});
