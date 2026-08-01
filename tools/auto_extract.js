const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const LANGUAGES = [
    { code: 'en', url: 'https://poe2db.tw/us/Gem', file: 'skills_en.json' },
    { code: 'sc', url: 'https://poe2db.tw/cn/Gem', file: 'skills_sc.json' },
    { code: 'tc', url: 'https://poe2db.tw/tw/Gem', file: 'skills_tc.json' },
];

const MAX_RETRIES = 3;
const PAGE_TIMEOUT = 60000;
const WAIT_TIMEOUT = 30000;

const EXTRACT_SCRIPT = `
(() => {
    const results = [];
    const seenIds = new Set();
    const debug = { totalCols: 0, withGem: 0, withoutGem: 0, duplicates: 0, empty: 0, unused: 0 };

    const rows = document.querySelectorAll('.row.row-cols-1.row-cols-lg-2.g-2');

    rows.forEach(row => {
        const cols = row.querySelectorAll(':scope > .col');

        cols.forEach((col) => {
            debug.totalCols++;

            try {
                let nameText = '';
                let id = '';
                const allLinks = col.querySelectorAll('a');
                for (const link of allLinks) {
                    const cls = link.className || '';
                    if (!/gemitem|gem_/.test(cls) || /GemTags/.test(cls)) continue;
                    const text = link.textContent.trim();
                    if (text) {
                        nameText = text;
                        const href = link.getAttribute('href') || '';
                        const idMatch = href.match(/\\/(?:us|cn|tw)\\/(.+)/);
                        id = idMatch ? idMatch[1] : '';
                        break;
                    }
                }

                if (!id) {
                    debug.empty++;
                    return;
                }

                if (id.includes('DNT-UNUSED') || id.includes('UNUSED')) {
                    debug.unused++;
                    return;
                }

                if (seenIds.has(id)) {
                    debug.duplicates++;
                    return;
                }
                seenIds.add(id);

                let icon = '';
                const iconEl = col.querySelector('img[src]');
                if (iconEl) {
                    icon = iconEl.getAttribute('src') || '';
                    icon = icon.replace(/\\\`/g, '').trim();
                    if (icon && !icon.startsWith('http')) {
                        icon = 'https://poe2db.tw' + icon;
                    }
                }

                const imgEl = col.querySelector('img[alt]');
                const imgAlt = imgEl ? imgEl.getAttribute('alt') : id;

                const defaultDiv = col.querySelector('.default');
                const tags = [];
                if (defaultDiv) {
                    const tagEls = defaultDiv.querySelectorAll('a.GemTags');
                    tagEls.forEach(t => {
                        const txt = t.textContent.trim();
                        if (txt && !tags.includes(txt)) tags.push(txt);
                    });
                }

                let description = '';
                const flexGrow = col.querySelector('.flex-grow-1');
                if (flexGrow) {
                    const clone = flexGrow.cloneNode(true);
                    const cloneDefault = clone.querySelector('.default');
                    if (cloneDefault) {
                        let prev = cloneDefault.previousSibling;
                        while (prev) {
                            const toRemove = prev;
                            prev = prev.previousSibling;
                            clone.removeChild(toRemove);
                        }
                        clone.removeChild(cloneDefault);
                    }
                    description = (clone.innerText || clone.textContent || '').trim();
                    description = description.replace(/\\s+/g, ' ').trim();
                }

                results.push({ id, name: nameText, icon, img_alt: imgAlt, tags, description });
            } catch (e) {}
        });
    });

    return { skills: results, debug: { ...debug, uniqueIds: results.length } };
})()
`;

async function extractLanguage(page, langConfig) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            if (attempt > 1) {
                console.log(`[${langConfig.code}] 第 ${attempt} 次重试...`);
                await new Promise(r => setTimeout(r, 3000));
            }

            console.log(`[${langConfig.code}] 正在访问 ${langConfig.url}... (尝试 ${attempt}/${MAX_RETRIES})`);
            
            await page.goto(langConfig.url, { 
                waitUntil: 'domcontentloaded', 
                timeout: PAGE_TIMEOUT 
            });
            
            console.log(`[${langConfig.code}] 等待元素加载...`);
            await page.waitForSelector('.row.row-cols-1.row-cols-lg-2.g-2 .col', { 
                timeout: WAIT_TIMEOUT 
            }).catch(() => {
                console.log(`[${langConfig.code}] 警告: 可能未找到所有元素`);
            });
            
            // 额外等待，让图片和动态内容加载
            await new Promise(r => setTimeout(r, 3000));
            
            // 尝试滚动页面触发懒加载
            await page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
            });
            await new Promise(r => setTimeout(r, 1000));
            await page.evaluate(() => {
                window.scrollTo(0, 0);
            });
            
            console.log(`[${langConfig.code}] 正在提取数据...`);
            const result = await page.evaluate(EXTRACT_SCRIPT);
            const skills = result.skills;
            const d = result.debug;
            
            console.log(`[${langConfig.code}] 共 ${d.totalCols} 个col, 其中 ${d.empty} 个无ID, ${d.unused} 个废弃, ${d.duplicates} 个重复`);
            console.log(`[${langConfig.code}] 最终提取 ${skills.length} 个技能`);
            return skills;
            
        } catch (err) {
            console.log(`[${langConfig.code}] 第 ${attempt} 次失败: ${err.message}`);
            if (attempt === MAX_RETRIES) {
                throw err;
            }
        }
    }
}

function findChromePath() {
    const paths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
    ];
    for (const p of paths) {
        if (fs.existsSync(p)) return p;
    }
    return null;
}

async function main() {
    const dataDir = path.join(__dirname, '..', 'data');
    
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const chromePath = findChromePath();
    const launchOptions = { 
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
        ]
    };
    
    if (chromePath) {
        console.log(`使用系统 Chrome: ${chromePath}`);
        launchOptions.executablePath = chromePath;
    } else {
        console.log('未找到系统 Chrome，使用 puppeteer 内置浏览器...');
    }
    
    console.log('启动浏览器...');
    const browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    
    // 设置 User-Agent 伪装
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    try {
        for (const lang of LANGUAGES) {
            try {
                const skills = await extractLanguage(page, lang);
                
                const filePath = path.join(dataDir, lang.file);
                fs.writeFileSync(filePath, JSON.stringify(skills, null, 2), 'utf-8');
                console.log(`[${lang.code}] ✅ 已保存 ${skills.length} 条数据 -> ${filePath}`);
            } catch (err) {
                console.error(`[${lang.code}] ❌ 提取失败（已重试${MAX_RETRIES}次）:`, err.message);
            }
        }
        
        console.log('\n========================================');
        console.log('  数据提取完成！');
        console.log('  下一步: 运行 go run tools/merge_skills.go');
        console.log('========================================');
    } finally {
        await browser.close();
    }
}

main().catch(console.error);