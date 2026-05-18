# SellerFast 收款实操指南

> 目标：让用户付钱给你，零代码，30分钟搞定

---

## 一、最简方案：Lemon Squeezy

### 为什么选它

| | Lemon Squeezy | Stripe | PayPal | Gumroad |
|---|---|---|---|---|
| 注册门槛 | 极低 | 需企业/公司 | 需绑卡 | 低 |
| 支持支付宝 | ✅ | ❌ | ❌ | ❌ |
| 支持微信支付 | ✅ | ❌ | ❌ | ❌ |
| 税务处理 | 自动（MoR） | 自己报税 | 自己报税 | 视地区 |
| 手续费 | 5% + $0.50 | 2.9% + $0.30 | 4.4% | 10% |
| 提现到中国 | 支持 | 困难 | 支持 | 支持 |

**核心优势**：Lemon Squeezy 是「商家记录商」(Merchant of Record)——他们处理全球税务，你只管收钱。

---

## 二、注册步骤（30分钟）

### Step 1：注册 Lemon Squeezy 账号

```
① 打开 lemonsqueezy.com
② 点 Sign Up → 用邮箱注册
③ 选 "I'm a creator / selling digital products"
```

### Step 2：创建产品

```
① Dashboard → Products → New Product
② 类型选 "Software / Digital"
③ 名称：SellerFast Pro
④ 描述：Unlimited product monitoring, AI review analysis, 
   5-language translation for Amazon & Shopee sellers.
⑤ 价格：$19/month
⑥ 添加年付选项：$159/year（省30%）
```

### Step 3：设置收款

```
① Settings → Payouts
② 选择提现方式：
   - PayPal（最方便，中国PayPal可以收）
   - 银行转账（支持中国银行）
③ 填写税务信息（Lemon Squeezy 会引导你填写 W-8BEN 表单）
```

### Step 4：获取付款链接

```
① 回到产品页面
② 点 "Get payment link"
③ 复制链接，类似：https://sellerfast.lemonsqueezy.com/checkout/xxx
④ 这就是你的收款链接！
```

---

## 三、怎么植入扩展

### 免费版用户遇到限制时

```
用户在免费版添加第 6 个商品 →
弹窗：「免费版最多监控 5 个商品。升级 Pro 无限监控 + AI 分析」
按钮：「升级 Pro $19/月」→ 打开 Lemon Squeezy 链接
```

### 代码实现（5行）

```typescript
const PRO_CHECKOUT = "https://sellerfast.lemonsqueezy.com/checkout/xxx"

function promptUpgrade(feature: string) {
  if (confirm(`"${feature}" 是 Pro 功能。¥140/月，去升级？`)) {
    chrome.tabs.create({ url: PRO_CHECKOUT })
  }
}
```

---

## 四、替代方案

### 方案 B：Gumroad（更简单但更贵）

```
① gumroad.com 注册
② 创建产品，定价 $19/月
③ 获得链接
④ 手续费：10%（比 Lemon Squeezy 贵一倍）
⑤ 适合：不想填任何税务表格的人
```

### 方案 C：微信公众号赞赏 + 手动发 Key

```
① 开通微信公众号赞赏
② 用户赞赏后，手动发 Pro 激活码
③ 优点：零手续费、支持微信支付
④ 缺点：完全手动、不专业、无法自动续费
```

**不建议**——太累，用户也不信任。

### 方案 D：Telegram + USDT（极客方案）

```
适合：不想碰任何传统支付渠道的人
优点：零费用、全球通用
缺点：用户群太小、不专业
```

---

## 五、什么时候开始收费

```
Firefox 审核通过 ✅
  │
  ▼
免费期 2-4 周：收集反馈、打磨产品
  │
  ▼
满足任一条件开始收费：
  · 周活用户 > 50
  · 有 3 个用户主动问"有没有付费版"
  · 第 4 周末（不管数据，必须验证付费）
  │
  ▼
上线 Pro 套餐
```

---

## 六、第一笔钱到手的时间线

```
Week 1-2  审核期（等待 Firefox 上架）
Week 3-4  推广期（发帖、发群、找用户）
Week 5     开始观察是否有用户主动问付费
Week 6-8   上线 Pro，第一笔可预期
```

---

## 现在要做

1. 打开 [lemonsqueezy.com](https://lemonsqueezy.com) 注册
2. 创建 SellerFast Pro 产品（$19/月 + $159/年）
3. 把付款链接发给我，我植入到扩展里
