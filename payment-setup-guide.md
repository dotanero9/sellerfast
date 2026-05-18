# SellerFast 收款实操指南（修正版）

---

## 收款管道

```
用户付款                    你收钱
─────────                  ──────
信用卡/借记卡  ──┐
PayPal（用户端）──┼──→ Lemon Squeezy ──→ PayPal（你的中国账号）
Apple Pay      ──┘      （中间商）        或 Wise 银行转账
```

> 你的目标用户是跨境卖家，他们**有 PayPal 和信用卡**（做跨境必备），所以付款不是瓶颈。

---

## 一、方案：Lemon Squeezy + 中国 PayPal

### Step 1：注册中国 PayPal（10分钟）

1. 打开 paypal.cn 或 paypal.com
2. 注册「个人账户」
3. 绑定你的中国银行卡（借记卡即可，不需要 Visa）
4. 验证邮箱
5. 完成——你可以接收美元了

> 中国 PayPal 接收国际付款完全没问题，提现到中国银行卡有 35 美元/笔的手续费，建议积累到一定金额再提。

### Step 2：注册 Lemon Squeezy（15分钟）

1. [lemonsqueezy.com](https://lemonsqueezy.com) → Sign Up
2. 选 "Creator / Selling digital products"
3. Settings → Payouts → 关联 PayPal 账号
4. 填写税务信息（W-8BEN，勾选中国即可）

### Step 3：创建产品

1. Products → New → Software/Digital
2. 名称：**SellerFast Pro**
3. 定价：**$19/month** + **$159/year**
4. 复制 checkout 链接，类似：
   `https://sellerfast.lemonsqueezy.com/checkout/xxx`

### Step 4：植入扩展

拿到链接后，我在扩展里加一行代码，免费用户触发限制时跳转付费。

---

## 二、费用分析

| 环节 | 费用 |
|------|------|
| Lemon Squeezy 手续费 | 5% + $0.50/笔 |
| PayPal 收款 | 4.4% + $0.30 |
| PayPal 提现到中国银行卡 | $35/笔（一次性） |
| **实际到手** | **约 90%**（月付）/ **约 92%**（年付） |

以 $19/月为例：

```
$19.00  →  用户付款
-$1.45   →  Lemon Squeezy (5% + $0.50)
-$0.78   →  PayPal (4.4% + $0.30)
────────
$16.77   →  到 PayPal 余额
积累到 $500 再提现：15 个用户 × 1 个月 = $285，提现到手 $250
```

---

## 三、如果不想用 Lemon Squeezy

### 方案 B：直接 PayPal 订阅链接

- PayPal 自带 "订阅按钮"，生成链接
- 跳过中间商，只付 PayPal 手续费
- 缺点：无税务处理、无发票、无自动 VAT
- 适合：收入 < $1000/月阶段

### 方案 C：Paddle

- 类似 Lemon Squeezy，但审核严
- 需要公司资质
- 不适合个人开发者

### 方案 D：USDT / 加密货币

- 零手续费
- 用户群极小
- 不适合起步

---

## 四、现在要做

1. 注册中国 PayPal（paypal.cn）→ 5 分钟
2. 注册 Lemon Squeezy（lemonsqueezy.com）→ 10 分钟
3. 创建产品，把 checkout 链接发给我 → 5 分钟

> 一共 20 分钟。之后用户在扩展里点击升级，直接跳到付款页面。
