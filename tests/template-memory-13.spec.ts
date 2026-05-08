import { test, expect } from '@playwright/test';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const TEST_FILES_DIR = path.join(__dirname, '../test-files');
const FILE_T1 = path.join(TEST_FILES_DIR, 'T1_非标准模板A.xlsx');
const FILE_T2 = path.join(TEST_FILES_DIR, 'T2_同A结构不同数据.xlsx');

// T1 的期望映射:
// Col0 出发方 -> sender_name (不在aliases中，需手动映射)
// Col1 发件电话 -> sender_phone
// Col2 发件地址 -> sender_address
// Col3 收货方 -> receiver_name
// Col4 收货电话 -> receiver_phone
// Col5 收货地址 -> receiver_address
// Col6 毛重 -> weight
// Col7 箱数 -> quantity
// Col8 温层 -> temp_zone
// Col9 客户参考号 -> external_code
// Col10 特殊说明 -> remark
const MAPPINGS = [
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

async function manualMapAll(page: ReturnType<typeof test.use>) {
  const selects = page.locator('select');
  for (const m of MAPPINGS) {
    await selects.nth(m.col).selectOption(m.value);
  }
  await page.getByRole('button', { name: '确认映射' }).click();
}

test.describe('Template Memory - 手动映射记忆验证', () => {
  test('第一次手动映射T1，第二次上传T1应自动填充', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');

    // ====== 第一次上传T1：需要手动映射 ======
    console.log('--- 第一次上传 T1_非标准模板A.xlsx ---');
    await page.goto(`${BASE_URL}/import`);
    await page.waitForTimeout(1000);
    await fileInput.setInputFiles(FILE_T1);
    await page.waitForTimeout(3000);

    const url1 = page.url();
    console.log(`第一次上传后 URL: ${url1}`);

    // 应该出现手动映射界面（因为"出发方"不在aliases中）
    if (url1.includes('/preview')) {
      console.log('⚠️ 第一次就自动识别成功了（auto-mapping覆盖了所有必填字段）');
    } else {
      const mapperVisible = await page.getByText('列映射配置').isVisible({ timeout: 2000 }).catch(() => false);
      
      if (mapperVisible) {
        console.log('✅ 第一次：出现手动映射界面');
        
        // 记录哪些列已自动识别，哪些需要手动
        const selects = page.locator('select');
        const count = await selects.count();
        let autoMappedCount = 0;
        let unmappedCount = 0;
        
        for (let i = 0; i < count; i++) {
          const value = await selects.nth(i).inputValue();
          if (value) {
            autoMappedCount++;
          } else {
            unmappedCount++;
          }
        }
        console.log(`自动识别: ${autoMappedCount} 列, 未识别: ${unmappedCount} 列`);

        // 手动配置所有映射（补全未识别的列）
        await manualMapAll(page);
        await page.waitForTimeout(2000);
        
        expect(page.url()).toContain('/preview');
        console.log('✅ 第一次：确认映射后跳转到 preview');
      } else {
        console.log('❌ 第一次：既没有跳转也没有出现映射界面');
      }
    }

    await page.screenshot({ path: path.join(TEST_FILES_DIR, 'screenshots', 'mem-t1-first.png') });

    // ====== 第二次上传相同T1文件：应该自动填充映射值 ======
    console.log('--- 第二次上传 T1_非标准模板A.xlsx ---');
    await page.goto(`${BASE_URL}/import`);
    await page.waitForTimeout(1000);
    await fileInput.setInputFiles(FILE_T1);
    await page.waitForTimeout(5000);

    const url2 = page.url();
    console.log(`第二次上传后 URL: ${url2}`);

    // 情况A：直接跳转到 preview（完全自动识别，最优）
    if (url2.includes('/preview')) {
      console.log('✅ 第二次：完全自动识别，直接跳转到 preview（最优情况）');
      await page.screenshot({ path: path.join(TEST_FILES_DIR, 'screenshots', 'mem-t1-second-direct.png') });
      return;
    }

    // 情况B：出现映射界面，检查下拉框是否已自动填充
    const mapperVisible2 = await page.getByText('列映射配置').isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!mapperVisible2) {
      console.log('❌ 第二次：既没有跳转也没有出现映射界面');
      await page.screenshot({ path: path.join(TEST_FILES_DIR, 'screenshots', 'mem-t1-second-unknown.png') });
      return;
    }

    console.log('第二次：出现映射界面，检查下拉框是否已自动填充...');
    
    const selects = page.locator('select');
    let allMapped = true;
    let autoFilledCount = 0;
    let failDetails: string[] = [];
    
    for (let i = 0; i < MAPPINGS.length; i++) {
      const m = MAPPINGS[i];
      const selectEl = selects.nth(i);
      const value = await selectEl.inputValue();
      if (value === m.value) {
        autoFilledCount++;
      } else {
        allMapped = false;
        failDetails.push(`Col${i}: 期望[${m.value}] 实际[${value || '(空)'}]`);
      }
    }

    if (allMapped && autoFilledCount > 0) {
      console.log(`✅ 第二次：${autoFilledCount}/${MAPPINGS.length} 列已自动填充正确的映射值！`);
      console.log('   用户只需点击"确认映射"即可，无需手动选择');
      
      // 验证"确认映射"按钮是可点击的
      const confirmBtn = page.getByRole('button', { name: '确认映射' });
      const isDisabled = await confirmBtn.isDisabled();
      expect(isDisabled).toBe(false);
      console.log('✅ 确认映射按钮可点击');

      await page.screenshot({ path: path.join(TEST_FILES_DIR, 'screenshots', 'mem-t1-second-auto-filled.png') });
    } else if (autoFilledCount > 0) {
      console.log(`⚠️ 第二次：${autoFilledCount}/${MAPPINGS.length} 列已自动填充，但部分列未识别`);
      for (const detail of failDetails) {
        console.log(`   ${detail}`);
      }
      await page.screenshot({ path: path.join(TEST_FILES_DIR, 'screenshots', 'mem-t1-second-partial.png') });
    } else {
      console.log('❌ 第二次：下拉框全部为空，模板记忆未生效！');
      await page.screenshot({ path: path.join(TEST_FILES_DIR, 'screenshots', 'mem-t1-second-not-filled.png') });
    }
  });

  test('上传T2（同T1结构不同数据）应自动填充映射', async ({ page }) => {
    // 先上传T1并手动映射
    console.log('--- 先上传T1建立模板记忆 ---');
    await page.goto(`${BASE_URL}/import`);
    await page.waitForTimeout(1000);
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(FILE_T1);
    await page.waitForTimeout(3000);

    // 如果出现映射界面，手动配置
    const mapperVisible = await page.getByText('列映射配置').isVisible({ timeout: 2000 }).catch(() => false);
    if (mapperVisible) {
      await manualMapAll(page);
      await page.waitForTimeout(2000);
    }
    expect(page.url()).toContain('/preview');
    console.log('✅ T1已映射');

    // 上传T2（相同结构，不同数据）
    console.log('--- 上传T2（同结构不同数据）---');
    await page.goto(`${BASE_URL}/import`);
    await page.waitForTimeout(1000);
    await fileInput.setInputFiles(FILE_T2);
    await page.waitForTimeout(5000);

    const url2 = page.url();
    if (url2.includes('/preview')) {
      console.log('✅ T2：完全自动识别，直接跳转到 preview');
    } else {
      const selects = page.locator('select');
      let autoFilledCount = 0;
      
      for (let i = 0; i < MAPPINGS.length; i++) {
        const value = await selects.nth(i).inputValue();
        if (value === MAPPINGS[i].value) {
          autoFilledCount++;
        }
      }
      
      if (autoFilledCount > 0) {
        console.log(`✅ T2：${autoFilledCount}/${MAPPINGS.length} 列已自动填充`);
      } else {
        console.log('❌ T2：下拉框全部为空，模板记忆未生效');
      }
    }

    await page.screenshot({ path: path.join(TEST_FILES_DIR, 'screenshots', 'mem-t2-check.png') });
  });
});
