// 使用方法：
// 1. 打开 https://poe2db.tw/us/Gem (英文版) -> F12 -> Console -> 运行，保存为 skills_en.json
// 2. 打开 https://poe2db.tw/cn/Gem (简体版) -> 同上，保存为 skills_sc.json
// 3. 打开 https://poe2db.tw/tw/Gem (繁体版) -> 同上，保存为 skills_tw.json

function extractSkills(lang) {
    const results = [];
    const seenIds = new Set();

    // 先找到所有 .row 容器，再取其直接子 .col（避免嵌套重复）
    const rows = document.querySelectorAll('.row.row-cols-1.row-cols-lg-2.g-2');
    let totalCols = 0;

    rows.forEach(row => {
        const cols = row.querySelectorAll(':scope > .col');
        totalCols += cols.length;

        cols.forEach((col) => {
            try {
                // 1. 获取技能名和ID - 匹配 gemitem + gem_* 类型，排除 GemTags
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
                        const idMatch = href.match(/\/(?:us|cn|tw)\/(.+)/);
                        id = idMatch ? idMatch[1] : '';
                        break;
                    }
                }
                if (!id) return;

                // 过滤废弃条目
                if (id.includes('DNT-UNUSED') || id.includes('UNUSED')) {
                    return;
                }

                // 去重：同一个ID只保留第一次出现
                if (seenIds.has(id)) return;
                seenIds.add(id);

                // 2. 获取图标alt（英文名）
                const imgEl = col.querySelector('img[alt]');
                const imgAlt = imgEl ? imgEl.getAttribute('alt') : id;

                // 3. 获取图标URL
                let icon = '';
                const iconEl = col.querySelector('img[src]');
                if (iconEl) {
                    icon = iconEl.getAttribute('src') || '';
                    icon = icon.replace(/`/g, '').trim();
                    if (icon && !icon.startsWith('http')) {
                        icon = 'https://poe2db.tw' + icon;
                    }
                }

                // 4. 获取标签 - 从 .default div
                const defaultDiv = col.querySelector('.default');
                const tags = [];
                if (defaultDiv) {
                    const tagEls = defaultDiv.querySelectorAll('a.GemTags');
                    tagEls.forEach(t => {
                        const txt = t.textContent.trim();
                        if (txt && !tags.includes(txt)) {
                            tags.push(txt);
                        }
                    });
                }

                // 5. 获取描述 - 克隆 .flex-grow-1，删除 .default 及之前的
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
                    description = description.replace(/\s+/g, ' ').trim();
                }

                results.push({
                    id: id,
                    name: nameText,
                    icon: icon,
                    img_alt: imgAlt,
                    tags: tags,
                    description: description
                });
            } catch (e) {
                console.warn(`[${lang}] 处理失败:`, e);
            }
        });
    });

    console.log(`[${lang}] 找到 ${totalCols} 个宝石，去重后 ${results.length} 个技能`);
    return results;
}

const lang = window.location.href.includes('/us/') ? 'en'
           : window.location.href.includes('/cn/') ? 'sc'
           : window.location.href.includes('/tw/') ? 'tc'
           : 'unknown';

const skills = extractSkills(lang);
const json = JSON.stringify(skills, null, 2);
const blob = new Blob([json], {type: 'application/json'});
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `skills_${lang}.json`;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
console.log(`✅ [${lang}] 已下载 ${skills.length} 条数据 -> skills_${lang}.json`);

if (skills.length > 0) {
    console.log('数据预览:');
    skills.slice(0, 5).forEach(s => {
        console.log(`  ${s.id} | ${s.name} | tags: [${s.tags.join(', ')}]`);
        console.log(`    desc: "${s.description?.substring(0, 120)}"`);
    });
}