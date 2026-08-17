const db = require('../../config/database');
const config = require('../../config');
const logger = require('../../utils/logger');

class AiService {
  /**
   * Demand forecasting + smart reorder. Computes sales velocity from recent
   * order history and projects when each product will run out, suggesting a
   * reorder quantity to cover the lead time + a safety buffer.
   */
  async reorderSuggestions(tenantId, { days = 30, leadTimeDays = 7, coverDays = 14 } = {}) {
    const lookback = Math.max(7, parseInt(days, 10) || 30);
    const result = await db.query(
      `WITH sales AS (
         SELECT oi.product_id,
                SUM(oi.quantity)::numeric AS units_sold
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE oi.tenant_id = $1
           AND o.status IN ('paid', 'completed')
           AND o.created_at >= NOW() - ($2 || ' days')::interval
           AND oi.product_id IS NOT NULL
         GROUP BY oi.product_id
       )
       SELECT p.id, p.name, p.sku, p.stock_quantity, p.low_stock_threshold, p.cost_price,
              COALESCE(s.units_sold, 0) AS units_sold
       FROM products p
       LEFT JOIN sales s ON s.product_id = p.id
       WHERE p.tenant_id = $1 AND p.status = 'active'`,
      [tenantId, String(lookback)]
    );

    const lead = Math.max(1, parseInt(leadTimeDays, 10) || 7);
    const cover = Math.max(1, parseInt(coverDays, 10) || 14);

    const suggestions = result.rows.map((p) => {
      const velocity = Number(p.units_sold) / lookback; // units/day
      const stock = Number(p.stock_quantity) || 0;
      const daysOfStock = velocity > 0 ? stock / velocity : Infinity;
      const reorderPoint = Math.ceil(velocity * lead + velocity * 3); // lead demand + 3-day safety
      const targetStock = Math.ceil(velocity * (lead + cover));
      const suggestedQty = Math.max(0, targetStock - stock);

      let urgency = 'ok';
      if (velocity > 0) {
        if (stock <= 0) urgency = 'critical';
        else if (daysOfStock <= lead) urgency = 'urgent';
        else if (stock <= reorderPoint || stock <= Number(p.low_stock_threshold)) urgency = 'soon';
      } else if (stock <= 0) {
        urgency = 'critical';
      }

      return {
        product_id: p.id,
        name: p.name,
        sku: p.sku,
        stock_quantity: stock,
        units_sold: Number(p.units_sold),
        daily_velocity: +velocity.toFixed(2),
        days_of_stock: Number.isFinite(daysOfStock) ? Math.floor(daysOfStock) : null,
        reorder_point: reorderPoint,
        suggested_quantity: suggestedQty,
        estimated_cost: +(suggestedQty * Number(p.cost_price || 0)).toFixed(2),
        urgency,
      };
    });

    const rank = { critical: 0, urgent: 1, soon: 2, ok: 3 };
    suggestions.sort((a, b) => rank[a.urgency] - rank[b.urgency] || b.daily_velocity - a.daily_velocity);

    return {
      window_days: lookback,
      lead_time_days: lead,
      cover_days: cover,
      generated_at: new Date().toISOString(),
      suggestions: suggestions.filter((s) => s.urgency !== 'ok' || s.suggested_quantity > 0),
    };
  }

  async _gatherBusinessContext(tenantId) {
    const [sales, topProducts, lowStock, expenses] = await Promise.all([
      db.query(
        `SELECT COUNT(*)::int AS orders,
                COALESCE(SUM(total_amount), 0)::numeric AS revenue,
                COALESCE(AVG(total_amount), 0)::numeric AS avg_order
         FROM orders
         WHERE tenant_id = $1 AND status IN ('paid','completed')
           AND created_at >= NOW() - INTERVAL '30 days'`,
        [tenantId]
      ),
      db.query(
        `SELECT oi.product_name, SUM(oi.quantity)::int AS qty, SUM(oi.total)::numeric AS revenue
         FROM order_items oi JOIN orders o ON o.id = oi.order_id
         WHERE oi.tenant_id = $1 AND o.status IN ('paid','completed')
           AND o.created_at >= NOW() - INTERVAL '30 days'
         GROUP BY oi.product_name ORDER BY revenue DESC LIMIT 5`,
        [tenantId]
      ),
      db.query(
        `SELECT COUNT(*)::int AS c FROM products
         WHERE tenant_id = $1 AND status = 'active' AND stock_quantity <= low_stock_threshold`,
        [tenantId]
      ),
      db.query(
        `SELECT COALESCE(SUM(amount), 0)::numeric AS total FROM expenses
         WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
        [tenantId]
      ),
    ]);

    return {
      period: 'last 30 days',
      orders: sales.rows[0].orders,
      revenue: Number(sales.rows[0].revenue),
      avg_order_value: +Number(sales.rows[0].avg_order).toFixed(2),
      expenses: Number(expenses.rows[0].total),
      gross_profit_estimate: +(Number(sales.rows[0].revenue) - Number(expenses.rows[0].total)).toFixed(2),
      low_stock_products: lowStock.rows[0].c,
      top_products: topProducts.rows.map((r) => ({
        name: r.product_name, units: r.qty, revenue: Number(r.revenue),
      })),
    };
  }

  /**
   * Analytics copilot. Answers a natural-language question using the tenant's
   * own data. Uses OpenAI when configured, otherwise returns a deterministic
   * heuristic summary so the feature always works.
   */
  async ask(tenantId, question) {
    const context = await this._gatherBusinessContext(tenantId);

    if (config.ai.provider === 'openai' && config.ai.openaiApiKey) {
      try {
        const answer = await this._askOpenAI(question, context);
        return { answer, context, source: 'openai' };
      } catch (err) {
        logger.warn('AI copilot OpenAI call failed, using heuristic', { error: err.message });
      }
    }

    return { answer: this._heuristicAnswer(question, context), context, source: 'heuristic' };
  }

  async _askOpenAI(question, context) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.ai.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.ai.model,
        messages: [
          {
            role: 'system',
            content: 'You are a concise retail analytics assistant for a POS system. Answer using ONLY the JSON business data provided. Use the data\'s figures. Keep answers under 120 words.',
          },
          { role: 'user', content: `Business data: ${JSON.stringify(context)}\n\nQuestion: ${question}` },
        ],
        temperature: 0.2,
        max_tokens: 300,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || 'OpenAI request failed');
    return data.choices?.[0]?.message?.content?.trim() || 'No answer generated.';
  }

  _heuristicAnswer(question, c) {
    const top = c.top_products[0];
    const lines = [
      `Over the ${c.period}, you had ${c.orders} sales totalling ${c.revenue.toLocaleString()} (avg ${c.avg_order_value} per order).`,
      `Estimated gross profit after ${c.expenses.toLocaleString()} in expenses is about ${c.gross_profit_estimate.toLocaleString()}.`,
      top ? `Your best seller is "${top.name}" (${top.units} units, ${top.revenue.toLocaleString()} revenue).` : 'No sales were recorded in this period.',
      c.low_stock_products > 0 ? `${c.low_stock_products} product(s) are at or below their low-stock threshold — consider reordering.` : 'Stock levels look healthy.',
    ];
    return lines.join(' ');
  }

  async _logGeneration(tenantId, kind, input, output, tokensUsed, userId) {
    try {
      await db.query(
        `INSERT INTO ai_generations (tenant_id, kind, input, output, tokens_used, created_by)
         VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6)`,
        [tenantId, kind, JSON.stringify(input || {}), JSON.stringify(output || {}), tokensUsed || 0, userId || null]
      );
    } catch (err) {
      logger.warn('Failed to log ai_generation', { error: err.message });
    }
  }

  async forecastSales(tenantId, { days = 30 } = {}, userId = null) {
    const lookback = Math.max(14, parseInt(days, 10) || 30);
    const history = await db.query(
      `SELECT created_at::date AS day,
              COALESCE(SUM(total_amount), 0)::numeric AS revenue,
              COUNT(*)::int AS orders
       FROM orders
       WHERE tenant_id = $1 AND status IN ('paid', 'completed')
         AND created_at >= NOW() - ($2 || ' days')::interval
       GROUP BY 1 ORDER BY 1`,
      [tenantId, String(lookback)]
    );

    const rows = history.rows;
    const avgRevenue = rows.length
      ? rows.reduce((s, r) => s + Number(r.revenue), 0) / rows.length
      : 0;
    const avgOrders = rows.length
      ? rows.reduce((s, r) => s + Number(r.orders), 0) / rows.length
      : 0;

    // Simple linear trend on daily revenue
    let slope = 0;
    if (rows.length >= 2) {
      const n = rows.length;
      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumXX = 0;
      rows.forEach((r, i) => {
        const y = Number(r.revenue);
        sumX += i;
        sumY += y;
        sumXY += i * y;
        sumXX += i * i;
      });
      const denom = n * sumXX - sumX * sumX;
      slope = denom ? (n * sumXY - sumX * sumY) / denom : 0;
    }

    const horizon = 7;
    const forecast = [];
    for (let i = 1; i <= horizon; i += 1) {
      const projected = Math.max(0, avgRevenue + slope * (rows.length + i - 1));
      forecast.push({
        day_offset: i,
        projected_revenue: +projected.toFixed(2),
        projected_orders: Math.max(0, Math.round(avgOrders)),
      });
    }

    const output = {
      lookback_days: lookback,
      avg_daily_revenue: +avgRevenue.toFixed(2),
      trend_slope: +slope.toFixed(4),
      forecast,
      source: 'heuristic',
    };

    if (config.ai.provider === 'openai' && config.ai.openaiApiKey) {
      try {
        const answer = await this._askOpenAI(
          `Forecast next ${horizon} days of sales from this history JSON. Return brief narrative only.`,
          { history: rows.slice(-14), forecast }
        );
        output.narrative = answer;
        output.source = 'openai';
      } catch (err) {
        logger.warn('forecastSales OpenAI failed', { error: err.message });
        output.narrative = `Based on the last ${lookback} days, expect ~${avgRevenue.toFixed(0)}/day with a ${slope >= 0 ? 'rising' : 'softening'} trend.`;
      }
    } else {
      output.narrative = `Based on the last ${lookback} days, expect ~${avgRevenue.toFixed(0)}/day with a ${slope >= 0 ? 'rising' : 'softening'} trend.`;
    }

    await this._logGeneration(tenantId, 'forecast_sales', { days: lookback }, output, 0, userId);
    return output;
  }

  async generateProductDescription(tenantId, data = {}, userId = null) {
    const name = data.name || data.product_name || 'Product';
    const attrs = data.attributes || data.features || [];
    const category = data.category || '';

    let description;
    let source = 'heuristic';
    if (config.ai.provider === 'openai' && config.ai.openaiApiKey) {
      try {
        description = await this._askOpenAI(
          `Write a compelling 2-3 sentence retail product description for "${name}"` +
            (category ? ` in category ${category}` : '') +
            (attrs.length ? `. Features: ${JSON.stringify(attrs)}` : '') +
            '. No markdown.',
          { name, category, attrs }
        );
        source = 'openai';
      } catch (err) {
        logger.warn('generateProductDescription OpenAI failed', { error: err.message });
      }
    }
    if (!description) {
      const featureText = Array.isArray(attrs) && attrs.length
        ? ` Highlights: ${attrs.slice(0, 4).join(', ')}.`
        : '';
      description = `${name}${category ? ` (${category})` : ''} is a customer favorite, crafted for everyday use.${featureText} Add it to your cart today.`;
    }

    const output = { description, source };
    await this._logGeneration(tenantId, 'product_description', { name, category, attrs }, output, 0, userId);
    return output;
  }

  async generateEmail(tenantId, data = {}, userId = null) {
    const purpose = data.purpose || data.type || 'promo';
    const audience = data.audience || 'customers';
    const product = data.product_name || data.offer || '';

    let subject;
    let body;
    let source = 'heuristic';

    if (config.ai.provider === 'openai' && config.ai.openaiApiKey) {
      try {
        const answer = await this._askOpenAI(
          `Write a short marketing email (subject + body HTML paragraph) for purpose="${purpose}", audience="${audience}", offer="${product}". Format as SUBJECT: ... then BODY: ...`,
          { purpose, audience, product }
        );
        const subjMatch = answer.match(/SUBJECT:\s*(.+)/i);
        const bodyMatch = answer.match(/BODY:\s*([\s\S]+)/i);
        subject = subjMatch?.[1]?.trim() || `${purpose} update`;
        body = bodyMatch?.[1]?.trim() || `<p>${answer}</p>`;
        source = 'openai';
      } catch (err) {
        logger.warn('generateEmail OpenAI failed', { error: err.message });
      }
    }

    if (!subject) {
      subject = product ? `Don't miss ${product}` : `A special ${purpose} just for you`;
      body = `<p>Hi there,</p><p>We wanted to share a quick ${purpose} with our ${audience}${product ? `: <strong>${product}</strong>` : ''}.</p><p>Shop now before it ends!</p>`;
    }

    const output = { subject, body, source };
    await this._logGeneration(tenantId, 'email', { purpose, audience, product }, output, 0, userId);
    return output;
  }

  async chatSupport(tenantId, { message, history = [] } = {}, userId = null) {
    if (!message) {
      const { ValidationError } = require('../../shared/errors');
      throw new ValidationError('message is required');
    }
    const context = await this._gatherBusinessContext(tenantId);
    let answer;
    let source = 'heuristic';

    if (config.ai.provider === 'openai' && config.ai.openaiApiKey) {
      try {
        answer = await this._askOpenAI(
          `Customer support question: ${message}. Recent chat: ${JSON.stringify(history.slice(-4))}`,
          context
        );
        source = 'openai';
      } catch (err) {
        logger.warn('chatSupport OpenAI failed', { error: err.message });
      }
    }

    if (!answer) {
      answer = `Thanks for reaching out. Over the last 30 days this store processed ${context.orders} orders` +
        (context.top_products[0] ? ` and top sellers include "${context.top_products[0].name}"` : '') +
        `. For order-specific help, share your order number and our team can assist.`;
    }

    const output = { answer, source };
    await this._logGeneration(tenantId, 'chat_support', { message, history }, output, 0, userId);
    return output;
  }
}

module.exports = new AiService();
