// DeepSeek API client (OpenAI-compatible)
const DEEPSEEK_BASE = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

async function chat(messages, options = {}) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY not set');

  const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1024,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepSeek API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

// Analyze product reviews - extract negative review themes
async function analyzeReviews(productName, reviews) {
  const reviewTexts = reviews.map(r => `[${r.rating}星] ${r.title}: ${r.body}`).join('\n');

  const prompt = `分析以下亚马逊商品评价，提取差评中的核心问题：

商品：${productName}

评价列表：
${reviewTexts}

请用中文输出：
1. 差评关键词（3-5个高频词）
2. 主要问题总结（一句话）
3. 改进建议（3条，每条不超过20字）`;

  return await chat([
    { role: 'system', content: '你是亚马逊运营专家，擅长分析用户评价并给出可执行的改进建议。只输出分析结果，不输出无关内容。' },
    { role: 'user', content: prompt }
  ], { temperature: 0.3 });
}

// Translate listing to multiple languages
async function translateListing(chineseText, targetLanguages = ['en', 'ja', 'de']) {
  const langNames = { en: '英语', ja: '日语', de: '德语', fr: '法语', es: '西班牙语' };
  const targets = targetLanguages.map(l => langNames[l] || l).join('、');

  const prompt = `将以下电商Listing文案翻译为${targets}，保留卖点语气：

原文：${chineseText}

要求：
- 保持营销语气，符合目标市场习惯
- 专业术语准确（如"透气""减震"等）
- 按格式输出：语种: 译文`;

  return await chat([
    { role: 'system', content: '你是跨境电商翻译专家。只输出翻译结果，按指定格式。' },
    { role: 'user', content: prompt }
  ], { temperature: 0.2, maxTokens: 2048 });
}

async function checkConnection() {
  try {
    const result = await chat([
      { role: 'user', content: '回复"OK"' }
    ], { maxTokens: 10 });
    return result.includes('OK');
  } catch {
    return false;
  }
}

module.exports = { chat, analyzeReviews, translateListing, checkConnection };
