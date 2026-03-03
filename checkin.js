// checkin.js
const puppeteer = require('puppeteer');
const fs = require('fs').promises; // For file operations
const path = require('path'); // For path manipulation
const { exec } = require('child_process'); // For running Python script

// 从环境变量获取敏感信息，对应GitHub Secrets
const USERNAME = process.env.NATPIERCE_USERNAME;
const PASSWORD = process.env.NATPIERCE_PASSWORD;
const LOGIN_URL = 'https://www.natpierce.cn/pc/login/login.html'; // 明确登录页
const SIGN_URL = 'https://www.natpierce.cn/pc/sign/index.html';   // 签到页

async function solveCaptcha(page, bgImgUrl, jigsawImgUrl) {
    console.log('Attempting to solve captcha by passing image data directly...');
    const captchaContainerSelector = '#captcha';
    const sliderHandleSelector = '.yidun_slider';

    try {
        await page.waitForSelector(sliderHandleSelector, { timeout: 10000 });
        console.log('Slider handle detected.');

        console.log(`Fetching images via browser's native fetch...`);

        const fetchImageAsBase64 = async (url) => {
            // This function runs in the browser context
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
            }
            const buffer = await response.arrayBuffer();
            // Convert ArrayBuffer to a plain array of numbers to pass back to Node.js
            return Array.from(new Uint8Array(buffer));
        };

        const bgImageData = await page.evaluate(fetchImageAsBase64, bgImgUrl);
        const jigsawImageData = await page.evaluate(fetchImageAsBase64, jigsawImgUrl);

        if (!bgImageData || bgImageData.length === 0) {
            throw new Error('Downloaded background image data is empty.');
        }
        if (!jigsawImageData || jigsawImageData.length === 0) {
            throw new Error('Downloaded jigsaw image data is empty.');
        }
        console.log(`Background image downloaded, size: ${bgImageData.length} bytes.`);
        console.log(`Jigsaw image downloaded, size: ${jigsawImageData.length} bytes.`);

        // Convert the array of numbers back to a Node.js Buffer
        const bgImgBuffer = Buffer.from(bgImageData);
        const jigsawImgBuffer = Buffer.from(jigsawImageData);

        const bgBase64 = bgImgBuffer.toString('base64');
        const jigsawBase64 = jigsawImgBuffer.toString('base64');
        console.log('Images converted to Base64.');

        const solveResult = await new Promise((resolve, reject) => {
            const pythonProcess = exec('python solve_captcha.py', (error, stdout, stderr) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                    return reject(error);
                }
                if (stderr) {
                    console.error(`Python stderr: ${stderr}`);
                }
                resolve(stdout.trim());
            });

            // Send image data to Python script via stdin
            const payload = JSON.stringify({
                background: bgBase64,
                jigsaw: jigsawBase64
            });
            pythonProcess.stdin.write(payload);
            pythonProcess.stdin.end();
        });

        const offset = parseFloat(solveResult);
        if (isNaN(offset)) {
            throw new Error(`Failed to get valid offset from Python script: ${solveResult}`);
        }
        console.log(`Raw calculated offset: ${offset}`);

        // 验证码图片是 @2x 分辨率，需要除以2
        // 并且需要加上校准值来补偿滑块左边的空白
        const CALIBRATION_OFFSET = 45;
        const scaledOffset = Math.round(offset / 2) + CALIBRATION_OFFSET;
        console.log(`Scaled offset (÷2 + ${CALIBRATION_OFFSET}): ${scaledOffset}`);

        // Perform slider drag
        const sliderHandle = await page.$(sliderHandleSelector);
        const sliderBoundingBox = await sliderHandle.boundingBox();

        if (!sliderBoundingBox) {
            throw new Error('Could not get bounding box for slider handle.');
        }

        const startX = sliderBoundingBox.x + sliderBoundingBox.width / 2;
        const startY = sliderBoundingBox.y + sliderBoundingBox.height / 2;
        const endX = startX + scaledOffset;
        const endY = startY;

        console.log(`Dragging from (${startX}, ${startY}) to (${endX}, ${endY})`);

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(endX, endY, { steps: 20 });
        await page.mouse.up();
        console.log('Slider drag performed.');

        // Add a short delay to allow the server to process the captcha and respond
        await new Promise(resolve => setTimeout(resolve, 1500));

        await page.waitForSelector(captchaContainerSelector, { hidden: true, timeout: 10000 })
            .catch(() => console.log('Captcha container did not disappear, might be a retry or success message.'));

        console.log('Captcha solving attempt finished.');
        return true;
    } catch (error) {
        console.error('Error solving captcha:', error);
        return false;
    }
}


async function autoCheckIn() {
    let browser;
    try {
        // 启动无头浏览器
        browser = await puppeteer.launch({
            headless: true, // 在GitHub Actions中必须是true
            args: [
                '--no-sandbox', // GitHub Actions中需要这个参数
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--disable-dev-shm-usage'
            ]
        });
        const page = await browser.newPage();

        // 设置User-Agent，模拟正常浏览器访问
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.setViewport({ width: 1280, height: 720 });

        console.log('Navigating to login page...');
        await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 }); // 等待DOM加载完成

        // 确保页面加载完成，防止元素找不到
        await page.waitForSelector('input[placeholder="请输入手机号或邮箱"]', { timeout: 30000 });
        await page.waitForSelector('input[placeholder="请输入密码"]', { timeout: 30000 });
        await page.waitForSelector('div.login_btn', { timeout: 30000 }); // 根据用户提供的信息更新登录按钮选择器

        console.log('Typing username...');
        await page.type('input[placeholder="请输入手机号或邮箱"]', USERNAME);

        console.log('Typing password...');
        await page.type('input[placeholder="请输入密码"]', PASSWORD);

        // 点击登录按钮
        console.log('Clicking login button...');
        await page.click('div.login_btn'); // 根据用户提供的信息更新登录按钮选择器

        console.log('Waiting for navigation after login...');
        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }); // 等待登录后的页面跳转

        // 验证是否已跳转到签到页面
        if (page.url() !== SIGN_URL) {
            console.log(`Successfully logged in, now navigating to sign-in page: ${SIGN_URL}`);
            await page.goto(SIGN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        } else {
            console.log('Already on sign-in page after login.');
        }

        // 再次等待页面元素加载，特别是签到按钮
        console.log('Waiting for sign-in button...');
        const checkinButtonSelector = '#qiandao'; // 根据用户提供的信息更新签到按钮选择器
        await page.waitForSelector(checkinButtonSelector, { timeout: 30000 });

        console.log('Clicking check-in button...');
        await page.click(checkinButtonSelector);

        // Wait a moment for any immediate feedback, like a toast message
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check for "无需签到" message first
        const alreadyCheckedInMessage = await page.evaluate(() => {
            const messageElement = document.querySelector('div.layui-layer-content');
            if (messageElement && messageElement.innerText.includes('服务尚未到期')) {
                return messageElement.innerText;
            }
            return null;
        });

        if (alreadyCheckedInMessage) {
            console.log(`Detected message: "${alreadyCheckedInMessage}". Ending script.`);
            console.log(`CHECKIN_RESULT: ${alreadyCheckedInMessage}`);
            return; // Exit the function early
        }

        // If no such message, proceed with captcha handling
        console.log('No "无需签到" message detected, proceeding to check for captcha.');
        try {
            // Wait for any common captcha container that indicates a captcha is present
            await page.waitForSelector('#captcha, .yidun, .yidun_modal__body', { visible: true, timeout: 10000 });
            console.log('Captcha detected.');

            // Try to get captcha image URLs from DOM first
            let bgImgUrl = await page.evaluate(() => {
                const el = document.querySelector('img.yidun_bg-img');
                return el ? el.src : null;
            });
            let jigsawImgUrl = await page.evaluate(() => {
                const el = document.querySelector('img.yidun_jigsaw');
                return el ? el.src : null;
            });

            // Fallback: wait for image network responses if DOM querying failed
            if (!bgImgUrl || !jigsawImgUrl) {
                console.log('DOM-based image lookup failed; attempting to capture image responses from network...');
                const bgResp = await page.waitForResponse(response => response.request().resourceType() === 'image' && response.url().includes('necaptcha'), { timeout: 10000 }).catch(() => null);
                const jigResp = await page.waitForResponse(response => response.request().resourceType() === 'image' && response.url().includes('necaptcha'), { timeout: 10000 }).catch(() => null);
                if (bgResp && !bgImgUrl) bgImgUrl = bgResp.url();
                if (jigResp && !jigsawImgUrl) jigsawImgUrl = jigResp.url();
            }

            if (!bgImgUrl || !jigsawImgUrl) {
                throw new Error('Failed to locate captcha image URLs from DOM or network.');
            }

            console.log('Captcha image URLs:', { bgImgUrl, jigsawImgUrl });
            const captchaSolved = await solveCaptcha(page, bgImgUrl, jigsawImgUrl);
            if (!captchaSolved) {
                console.error('Captcha solving failed. Continuing without forcing exit.');
            }

        } catch (error) {
            // Catch selector/network timeouts or other captcha handling errors
            console.error('Error during captcha handling:', error);
            const debugDir = path.join(__dirname, 'debug');
            await fs.mkdir(debugDir, { recursive: true });
            const screenshotPath = path.join(debugDir, 'debug_screenshot.png');
            await page.screenshot({ path: screenshotPath, fullPage: true });
            console.log(`Debug screenshot saved to ${screenshotPath}`);
            console.log('No captcha detected or an error occurred during captcha handling. Continuing script (no forced exit).');
            // Important: do not call process.exit(1) here; let the workflow continue so artifacts and logs can be inspected
        }

        console.log('Check-in process complete. Now verifying the result...');

        // Wait for either a success toast message or the button to change to "已签到"
        let statusMessage = 'Check-in status unknown.';
        try {
            await page.waitForFunction(
                () => document.querySelector('div.layui-layer-content')?.innerText.includes('成功') || 
                      document.querySelector('#qiandao')?.innerText.includes('已签到'),
                { timeout: 5000 }
            );
            
            statusMessage = await page.evaluate(() => {
                const toast = document.querySelector('div.layui-layer-content');
                if (toast && toast.innerText.includes('成功')) return toast.innerText;
                const button = document.querySelector('#qiandao');
                if (button && button.innerText.includes('已签到')) return '签到成功 (按钮状态已更新)';
                return '签到成功 (状态已确认)';
            });

        } catch (e) {
            console.log('Could not find success message or "已签到" button state.');
            // As a fallback, check for any toast message
            statusMessage = await page.evaluate(() => {
                const messageElement = document.querySelector('div.layui-layer-content');
                return messageElement ? messageElement.innerText : 'No confirmation message found after timeout.';
            });
        }
        const currentStatus = statusMessage;
        console.log(`Check-in result/toast: ${currentStatus}`);

        console.log(`CHECKIN_RESULT: ${currentStatus}`); // Output the check-in result for the workflow

    } catch (error) {
        console.error('An error occurred during automation:', error);
        // If an error occurs, print the error but do not exit with an error code
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

autoCheckIn();
