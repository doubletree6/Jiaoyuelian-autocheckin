// checkin.js - 皎月连自动签到
const puppeteer = require('puppeteer');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    if (!url) return resolve();
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (res) => {
      const file = fs.createWriteStream(filepath);
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', reject);
  });
}

function solveWithOpenCV(bgPath, jigPath) {
  const result = execSync(`python3 ${__dirname}/solve_slider.py "${bgPath}" "${jigPath}"`);
  return parseInt(result.toString().trim());
}

async function autoCheckIn() {
  let browser;
  let checkinResult = '';
  
  try {
    const USERNAME = process.env.NATPIERCE_USERNAME;
    const PASSWORD = process.env.NATPIERCE_PASSWORD;
    
    browser = await puppeteer.launch({ 
      headless: true, 
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] 
    });
    const page = await browser.newPage();
    
    // 设置User-Agent和视口
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setViewport({ width: 1280, height: 720 });
    
    console.log('登录中...');
    await page.goto('https://www.natpierce.cn/pc/login/login.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(2000);
    
    await page.waitForSelector('input[placeholder="请输入手机号或邮箱"]', { timeout: 30000 });
    await page.waitForSelector('input[placeholder="请输入密码"]', { timeout: 30000 });
    
    await page.focus('input[placeholder="请输入手机号或邮箱"]');
    await page.keyboard.type(USERNAME);
    await page.focus('input[placeholder="请输入密码"]');
    await page.keyboard.type(PASSWORD);
    await page.click('div.login_btn');
    
    console.log('等待登录完成...');
    await delay(3000);
    
    // 检查登录后的URL
    try {
      await page.waitForFunction(() => window.location.href.includes('natpierce.cn') && !window.location.href.includes('login'), { timeout: 30000 });
    } catch (e) {
      console.log('登录导航检查超时，继续...');
    }
    console.log(`当前URL: ${page.url()}`);
    
    console.log('进入签到页...');
    if (!page.url().includes('sign')) {
      await page.goto('https://www.natpierce.cn/pc/sign/index.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
    }
    await delay(2000);
    
    // 等待签到按钮
    await page.waitForSelector('#qiandao', { timeout: 30000 });
    
    // 检查按钮状态
    const buttonText = await page.evaluate(() => document.querySelector('#qiandao')?.innerText);
    console.log(`按钮文本: ${buttonText}`);
    
    console.log('点击签到按钮...');
    await page.click('#qiandao');
    await delay(5000);
    
    // 检查是否需要验证码
    const images = await page.evaluate(() => {
      const bg = document.querySelector('img.yidun_bg-img');
      const jig = document.querySelector('img.yidun_jigsaw');
      return { bg: bg?.src, jig: jig?.src };
    });
    
    if (images.bg && images.jig) {
      console.log('检测到验证码，解决中...');
      await downloadImage(images.bg, '/tmp/captcha_bg.jpg');
      await downloadImage(images.jig, '/tmp/captcha_jig.png');
      
      const offset = solveWithOpenCV('/tmp/captcha_bg.jpg', '/tmp/captcha_jig.png');
      console.log('计算偏移:', offset);
      
      const slider = await page.$('.yidun_slider');
      if (slider) {
        const box = await slider.boundingBox();
        console.log('拖动滑块...');
        await page.mouse.move(box.x + box.width/2, box.y + box.height/2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width/2 + offset, box.y + box.height/2, { steps: 30 });
        await page.mouse.up();
      }
      
      await delay(3000);
    }
    
    // 调用签到API
    console.log('调用签到API...');
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        $.post('/pc/sign/qiandao.html', {}, function(t) { resolve(t); }, 'json');
      });
    });
    
    console.log('API返回:', JSON.stringify(result));
    
    // 签到成功后刷新页面获取最新的下次可签到时间
    if (result.code === 200) {
      console.log('签到成功，刷新页面获取最新时间...');
      await delay(1000);
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
      await delay(2000);
    }
    
    // 获取最终状态
    const finalContent = await page.content();
    const nextTimeMatch = finalContent.match(/下次可签到时间[：:]\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
    const nextTime = nextTimeMatch ? nextTimeMatch[1] : '未知';
    
    if (result.code === 200) {
      checkinResult = `签到成功！下次可签到时间: ${nextTime}`;
      console.log('签到成功!');
    } else if (result.message && result.message.includes('服务尚未到期')) {
      checkinResult = `${result.message}，下次可签到时间: ${nextTime}`;
      console.log('服务尚未到期');
    } else {
      checkinResult = `签到失败: ${JSON.stringify(result)}`;
      console.log('签到失败:', result);
    }
    
  } catch (error) {
    checkinResult = `签到出错: ${error.message}`;
    console.error('错误:', error.message);
  } finally {
    if (browser) await browser.close();
  }
  
  // 输出结果供 workflow 提取
  console.log(`CHECKIN_RESULT: ${checkinResult}`);
}

autoCheckIn();