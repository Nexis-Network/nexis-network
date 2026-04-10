import React from "react";
import {
  TrendingUp,
  DollarSign,
  Clock,
  Target,
  Zap,
  BarChart3,
  Shield,
} from "lucide-react";

import type { StrategyTemplate } from "./types";

export const TEMPLATE_REGISTRY: Record<string, StrategyTemplate> = {
  "rsi-scalp": {
    id: "rsi-scalp",
    name: "RSI Scalping",
    description: "Buy when RSI < 30, sell when RSI > 70",
    prompt: "Buy BTC when RSI < 30, sell when RSI > 70",
    icon: <TrendingUp className="w-5 h-5" />,
    category: "Technical",
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="strategy_start" x="200" y="100">
    <statement name="DO">
      <block type="controls_if" x="200" y="200">
        <value name="IF0">
          <block type="technical_indicator" x="200" y="250">
            <field name="INDICATOR">RSI</field>
            <field name="OPERATOR">LT</field>
            <value name="VALUE">
              <block type="math_number" x="200" y="300">
                <field name="NUM">30</field>
              </block>
            </value>
            <field name="TIMEFRAME">15m</field>
          </block>
        </value>
        <statement name="DO0">
          <block type="trading_action" x="200" y="350">
            <field name="ACTION">BUY</field>
            <field name="ORDER_TYPE">MARKET</field>
            <value name="AMOUNT">
              <block type="math_number" x="200" y="400">
                <field name="NUM">100</field>
              </block>
            </value>
            <field name="ASSET">BTC_USDT</field>
          </block>
        </statement>
        <next>
          <block type="controls_if" x="200" y="450">
            <value name="IF0">
              <block type="technical_indicator" x="200" y="500">
                <field name="INDICATOR">RSI</field>
                <field name="OPERATOR">GT</field>
                <value name="VALUE">
                  <block type="math_number" x="200" y="550">
                    <field name="NUM">70</field>
                  </block>
                </value>
                <field name="TIMEFRAME">15m</field>
              </block>
            </value>
            <statement name="DO0">
              <block type="trading_action" x="200" y="600">
                <field name="ACTION">SELL</field>
                <field name="ORDER_TYPE">MARKET</field>
                <value name="AMOUNT">
                  <block type="math_number" x="200" y="650">
                    <field name="NUM">100</field>
                  </block>
                </value>
                <field name="ASSET">BTC_USDT</field>
              </block>
            </statement>
          </block>
        </next>
      </block>
    </statement>
  </block>
</xml>`,
  },
  "price-breakout": {
    id: "price-breakout",
    name: "Price Breakout",
    description: "Execute trades when price crosses key levels",
    prompt: "Sell ETH when price crosses $3000",
    icon: <Target className="w-5 h-5" />,
    category: "Technical",
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="strategy_start" x="200" y="100">
    <statement name="DO">
      <block type="controls_if" x="200" y="200">
        <value name="IF0">
          <block type="logic_compare" x="200" y="250">
            <field name="OP">GT</field>
            <value name="A">
              <block type="get_price" x="200" y="300">
                <field name="ASSET">ETH</field>
                <field name="EXCHANGE">BINANCE</field>
              </block>
            </value>
            <value name="B">
              <block type="math_number" x="200" y="350">
                <field name="NUM">3000</field>
              </block>
            </value>
          </block>
        </value>
        <statement name="DO0">
          <block type="trading_action" x="200" y="400">
            <field name="ACTION">SELL</field>
            <field name="ORDER_TYPE">MARKET</field>
            <value name="AMOUNT">
              <block type="math_number" x="200" y="450">
                <field name="NUM">50</field>
              </block>
            </value>
            <field name="ASSET">ETH_USDT</field>
          </block>
        </statement>
      </block>
    </statement>
  </block>
</xml>`,
  },
  "dca-daily": {
    id: "dca-daily",
    name: "Daily DCA",
    description: "Dollar-cost average at scheduled intervals",
    prompt: "Dollar-cost average into SOL every day at 12pm",
    icon: <Clock className="w-5 h-5" />,
    category: "DCA",
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="strategy_start" x="200" y="100">
    <statement name="DO">
      <block type="controls_repeat_ext" x="200" y="200">
        <value name="TIMES">
          <block type="math_number" x="200" y="250">
            <field name="NUM">1</field>
          </block>
        </value>
        <statement name="DO">
          <block type="trading_action" x="200" y="300">
            <field name="ACTION">BUY</field>
            <field name="ORDER_TYPE">MARKET</field>
            <value name="AMOUNT">
              <block type="math_number" x="200" y="350">
                <field name="NUM">25</field>
              </block>
            </value>
            <field name="ASSET">SOL_USDT</field>
          </block>
        </statement>
      </block>
    </statement>
  </block>
</xml>`,
  },
  "gas-optimizer": {
    id: "gas-optimizer",
    name: "Gas Fee Optimizer",
    description: "Trade when gas fees are optimal",
    prompt: "Buy ETH if gas fee drops below 20 gwei",
    icon: <Zap className="w-5 h-5" />,
    category: "DeFi",
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="strategy_start" x="200" y="100">
    <statement name="DO">
      <block type="controls_if" x="200" y="200">
        <value name="IF0">
          <block type="logic_compare" x="200" y="250">
            <field name="OP">LT</field>
            <value name="A">
              <block type="market_data" x="200" y="300">
                <field name="DATA_TYPE">FEAR_GREED</field>
                <field name="ASSET">ETH_USDT</field>
                <field name="TIMEFRAME">1h</field>
              </block>
            </value>
            <value name="B">
              <block type="math_number" x="200" y="350">
                <field name="NUM">20</field>
              </block>
            </value>
          </block>
        </value>
        <statement name="DO0">
          <block type="trading_action" x="200" y="400">
            <field name="ACTION">BUY</field>
            <field name="ORDER_TYPE">MARKET</field>
            <value name="AMOUNT">
              <block type="math_number" x="200" y="450">
                <field name="NUM">100</field>
              </block>
            </value>
            <field name="ASSET">ETH_USDT</field>
          </block>
        </statement>
      </block>
    </statement>
  </block>
</xml>`,
  },
  "momentum-follow": {
    id: "momentum-follow",
    name: "Momentum Following",
    description: "Follow strong price momentum trends",
    prompt: "Buy when 24h volume > 200% average and price up > 5%",
    icon: <BarChart3 className="w-5 h-5" />,
    category: "Technical",
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="strategy_start" x="200" y="100">
    <statement name="DO">
      <block type="controls_if" x="200" y="200">
        <value name="IF0">
          <block type="logic_operation" x="200" y="250">
            <field name="OP">AND</field>
            <value name="A">
              <block type="logic_compare" x="200" y="300">
                <field name="OP">GT</field>
                <value name="A">
                  <block type="market_data" x="200" y="350">
                    <field name="DATA_TYPE">24H_VOLUME</field>
                    <field name="ASSET">BTC_USDT</field>
                    <field name="TIMEFRAME">1d</field>
                  </block>
                </value>
                <value name="B">
                  <block type="math_arithmetic" x="200" y="400">
                    <field name="OP">MULTIPLY</field>
                    <value name="A">
                      <block type="math_number" x="200" y="450">
                        <field name="NUM">2</field>
                      </block>
                    </value>
                    <value name="B">
                      <block type="math_number" x="200" y="500">
                        <field name="NUM">1000000</field>
                      </block>
                    </value>
                  </block>
                </value>
              </block>
            </value>
            <value name="B">
              <block type="logic_compare" x="200" y="550">
                <field name="OP">GT</field>
                <value name="A">
                  <block type="market_data" x="200" y="600">
                    <field name="DATA_TYPE">24H_CHANGE</field>
                    <field name="ASSET">BTC_USDT</field>
                    <field name="TIMEFRAME">1d</field>
                  </block>
                </value>
                <value name="B">
                  <block type="math_number" x="200" y="650">
                    <field name="NUM">5</field>
                  </block>
                </value>
              </block>
            </value>
          </block>
        </value>
        <statement name="DO0">
          <block type="trading_action" x="200" y="700">
            <field name="ACTION">BUY</field>
            <field name="ORDER_TYPE">MARKET</field>
            <value name="AMOUNT">
              <block type="math_number" x="200" y="750">
                <field name="NUM">200</field>
              </block>
            </value>
            <field name="ASSET">BTC_USDT</field>
          </block>
        </statement>
      </block>
    </statement>
  </block>
</xml>`,
  },
  "profit-take": {
    id: "profit-take",
    name: "Profit Taking",
    description: "Systematic profit taking strategy",
    prompt: "Take 25% profit when position is up 20%, stop loss at -10%",
    icon: <DollarSign className="w-5 h-5" />,
    category: "Risk Management",
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="strategy_start" x="200" y="100">
    <statement name="DO">
      <block type="controls_if" x="200" y="200">
        <value name="IF0">
          <block type="logic_compare" x="200" y="250">
            <field name="OP">GT</field>
            <value name="A">
              <block type="portfolio_balance" x="200" y="300">
                <field name="BALANCE_TYPE">UNREALIZED_PNL</field>
                <field name="ASSET">ALL</field>
              </block>
            </value>
            <value name="B">
              <block type="math_arithmetic" x="200" y="350">
                <field name="OP">MULTIPLY</field>
                <value name="A">
                  <block type="portfolio_balance" x="200" y="400">
                    <field name="BALANCE_TYPE">TOTAL_VALUE</field>
                    <field name="ASSET">ALL</field>
                  </block>
                </value>
                <value name="B">
                  <block type="math_number" x="200" y="450">
                    <field name="NUM">0.2</field>
                  </block>
                </value>
              </block>
            </value>
          </block>
        </value>
        <statement name="DO0">
          <block type="trading_action" x="200" y="500">
            <field name="ACTION">SELL</field>
            <field name="ORDER_TYPE">MARKET</field>
            <value name="AMOUNT">
              <block type="math_arithmetic" x="200" y="550">
                <field name="OP">MULTIPLY</field>
                <value name="A">
                  <block type="portfolio_balance" x="200" y="600">
                    <field name="BALANCE_TYPE">POSITION_VALUE</field>
                    <field name="ASSET">ALL</field>
                  </block>
                </value>
                <value name="B">
                  <block type="math_number" x="200" y="650">
                    <field name="NUM">0.25</field>
                  </block>
                </value>
              </block>
            </value>
            <field name="ASSET">BTC_USDT</field>
          </block>
        </statement>
        <next>
          <block type="controls_if" x="200" y="700">
            <value name="IF0">
              <block type="logic_compare" x="200" y="750">
                <field name="OP">LT</field>
                <value name="A">
                  <block type="portfolio_balance" x="200" y="800">
                    <field name="BALANCE_TYPE">UNREALIZED_PNL</field>
                    <field name="ASSET">ALL</field>
                  </block>
                </value>
                <value name="B">
                  <block type="math_arithmetic" x="200" y="850">
                    <field name="OP">MULTIPLY</field>
                    <value name="A">
                      <block type="portfolio_balance" x="200" y="900">
                        <field name="BALANCE_TYPE">TOTAL_VALUE</field>
                        <field name="ASSET">ALL</field>
                      </block>
                    </value>
                    <value name="B">
                      <block type="math_number" x="200" y="950">
                        <field name="NUM">-0.1</field>
                      </block>
                    </value>
                  </block>
                </value>
              </block>
            </value>
            <statement name="DO0">
              <block type="trading_action" x="200" y="1000">
                <field name="ACTION">SELL</field>
                <field name="ORDER_TYPE">STOP_LOSS</field>
                <value name="AMOUNT">
                  <block type="portfolio_balance" x="200" y="1050">
                    <field name="BALANCE_TYPE">POSITION_VALUE</field>
                    <field name="ASSET">ALL</field>
                  </block>
                </value>
                <field name="ASSET">BTC_USDT</field>
              </block>
            </statement>
          </block>
        </next>
      </block>
    </statement>
  </block>
</xml>`,
  },
  "ai-trading-agent": {
    id: "ai-trading-agent",
    name: "AI Trading Agent",
    description: "AI-powered trading with sentiment analysis",
    prompt:
      "Use AI to analyze market sentiment and execute trades based on confidence scores",
    icon: <TrendingUp className="w-5 h-5" />,
    category: "AI",
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="strategy_start" x="200" y="100">
    <statement name="DO">
      <block type="ai_agent" x="200" y="200">
        <field name="AGENT_TYPE">TRADING_AGENT</field>
        <field name="MODEL">GPT4</field>
        <statement name="CONFIG">
          <block type="ai_agent_config" x="200" y="300">
            <field name="TEMPERATURE">0.5</field>
            <field name="MAX_TOKENS">1024</field>
            <field name="STRATEGY">BALANCED</field>
            <field name="UPDATE_FREQUENCY">15MIN</field>
          </block>
          <block type="ai_prompt" x="200" y="400">
            <field name="PROMPT_TEXT">Analyze current market conditions, technical indicators, and sentiment data to determine optimal trading opportunities. Consider RSI, MACD, volume, and market sentiment. Execute trades only when confidence score is above 75%.</field>
            <field name="PROMPT_TYPE">TRADING_DECISION</field>
          </block>
          <block type="ai_data_source" x="200" y="500">
            <field name="DATA_SOURCE">MARKET_DATA</field>
            <field name="UPDATE_FREQUENCY">5MIN</field>
          </block>
          <block type="ai_condition" x="200" y="600">
            <field name="CONDITION_TYPE">CONFIDENCE</field>
            <field name="OPERATOR">GT</field>
            <value name="THRESHOLD">
              <block type="math_number" x="200" y="650">
                <field name="NUM">75</field>
              </block>
            </value>
          </block>
          <block type="trading_action" x="200" y="700">
            <field name="ACTION">BUY</field>
            <field name="ORDER_TYPE">MARKET</field>
            <value name="AMOUNT">
              <block type="math_number" x="200" y="750">
                <field name="NUM">100</field>
              </block>
            </value>
            <field name="ASSET">BTC_USDT</field>
          </block>
        </statement>
      </block>
    </statement>
  </block>
</xml>`,
  },
  "ai-sentiment-trader": {
    id: "ai-sentiment-trader",
    name: "AI Sentiment Trader",
    description: "Trade based on social media and news sentiment analysis",
    prompt:
      "Use AI to analyze social media sentiment and news headlines to predict price movements",
    icon: <TrendingUp className="w-5 h-5" />,
    category: "AI",
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="strategy_start" x="200" y="100">
    <statement name="DO">
      <block type="ai_agent" x="200" y="200">
        <field name="AGENT_TYPE">SENTIMENT_ANALYSIS</field>
        <field name="MODEL">CLAUDE35</field>
        <statement name="CONFIG">
          <block type="ai_agent_config" x="200" y="300">
            <field name="TEMPERATURE">0.3</field>
            <field name="MAX_TOKENS">2048</field>
            <field name="STRATEGY">CONSERVATIVE</field>
            <field name="UPDATE_FREQUENCY">5MIN</field>
          </block>
          <block type="ai_prompt" x="200" y="400">
            <field name="PROMPT_TEXT">Analyze real-time social media sentiment from Twitter, Reddit, and Telegram channels. Monitor news headlines from major crypto publications. Calculate sentiment score and predict short-term price movements. Execute trades when sentiment score exceeds 80% confidence.</field>
            <field name="PROMPT_TYPE">SENTIMENT_ANALYSIS</field>
          </block>
          <block type="ai_data_source" x="200" y="500">
            <field name="DATA_SOURCE">NEWS_SENTIMENT</field>
            <field name="UPDATE_FREQUENCY">1MIN</field>
          </block>
          <block type="ai_condition" x="200" y="600">
            <field name="CONDITION_TYPE">SENTIMENT</field>
            <field name="OPERATOR">GT</field>
            <value name="THRESHOLD">
              <block type="math_number" x="200" y="650">
                <field name="NUM">80</field>
              </block>
            </value>
          </block>
          <block type="trading_action" x="200" y="700">
            <field name="ACTION">BUY</field>
            <field name="ORDER_TYPE">MARKET</field>
            <value name="AMOUNT">
              <block type="math_number" x="200" y="750">
                <field name="NUM">150</field>
              </block>
            </value>
            <field name="ASSET">ETH_USDT</field>
          </block>
        </statement>
      </block>
    </statement>
  </block>
</xml>`,
  },
  "ai-portfolio-optimizer": {
    id: "ai-portfolio-optimizer",
    name: "AI Portfolio Optimizer",
    description: "AI-powered portfolio rebalancing and optimization",
    prompt:
      "Use AI to continuously optimize portfolio allocation based on market conditions and risk tolerance",
    icon: <BarChart3 className="w-5 h-5" />,
    category: "AI",
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="strategy_start" x="200" y="100">
    <statement name="DO">
      <block type="ai_agent" x="200" y="200">
        <field name="AGENT_TYPE">PORTFOLIO_OPTIMIZATION</field>
        <field name="MODEL">GPT4</field>
        <statement name="CONFIG">
          <block type="ai_agent_config" x="200" y="300">
            <field name="TEMPERATURE">0.2</field>
            <field name="MAX_TOKENS">2048</field>
            <field name="STRATEGY">CONSERVATIVE</field>
            <field name="UPDATE_FREQUENCY">1HOUR</field>
          </block>
          <block type="ai_prompt" x="200" y="400">
            <field name="PROMPT_TEXT">Analyze current portfolio allocation, market volatility, correlation between assets, and risk metrics. Optimize portfolio weights using modern portfolio theory. Rebalance when allocation drifts more than 5% from target.</field>
            <field name="PROMPT_TYPE">PORTFOLIO_REVIEW</field>
          </block>
          <block type="ai_data_source" x="200" y="500">
            <field name="DATA_SOURCE">MARKET_DATA</field>
            <field name="UPDATE_FREQUENCY">15MIN</field>
          </block>
          <block type="ai_optimization" x="200" y="600">
            <field name="OPTIMIZATION_TYPE">PORTFOLIO</field>
            <field name="OPTIMIZATION_METHOD">BAYESIAN</field>
          </block>
          <block type="trading_action" x="200" y="700">
            <field name="ACTION">BUY</field>
            <field name="ORDER_TYPE">MARKET</field>
            <value name="AMOUNT">
              <block type="math_number" x="200" y="750">
                <field name="NUM">200</field>
              </block>
            </value>
            <field name="ASSET">BTC_USDT</field>
          </block>
        </statement>
      </block>
    </statement>
  </block>
</xml>`,
  },
  "ai-risk-manager": {
    id: "ai-risk-manager",
    name: "AI Risk Manager",
    description: "AI-powered risk assessment and position sizing",
    prompt:
      "Use AI to dynamically assess market risk and adjust position sizes accordingly",
    icon: <Shield className="w-5 h-5" />,
    category: "AI",
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="strategy_start" x="200" y="100">
    <statement name="DO">
      <block type="ai_agent" x="200" y="200">
        <field name="AGENT_TYPE">RISK_MANAGEMENT</field>
        <field name="MODEL">CLAUDE35</field>
        <statement name="CONFIG">
          <block type="ai_agent_config" x="200" y="300">
            <field name="TEMPERATURE">0.1</field>
            <field name="MAX_TOKENS">1024</field>
            <field name="STRATEGY">CONSERVATIVE</field>
            <field name="UPDATE_FREQUENCY">5MIN</field>
          </block>
          <block type="ai_prompt" x="200" y="400">
            <field name="PROMPT_TEXT">Analyze market volatility, VaR (Value at Risk), maximum drawdown, and correlation risk. Calculate optimal position sizes based on current market conditions. Reduce exposure when risk metrics exceed thresholds.</field>
            <field name="PROMPT_TYPE">RISK_ASSESSMENT</field>
          </block>
          <block type="ai_data_source" x="200" y="500">
            <field name="DATA_SOURCE">MARKET_DATA</field>
            <field name="UPDATE_FREQUENCY">1MIN</field>
          </block>
          <block type="ai_condition" x="200" y="600">
            <field name="CONDITION_TYPE">RISK_SCORE</field>
            <field name="OPERATOR">LT</field>
            <value name="THRESHOLD">
              <block type="math_number" x="200" y="650">
                <field name="NUM">30</field>
              </block>
            </value>
          </block>
          <block type="risk_management" x="200" y="700">
            <field name="RISK_TYPE">MAX_POSITION</field>
            <value name="PERCENTAGE">
              <block type="math_number" x="200" y="750">
                <field name="NUM">5</field>
              </block>
            </value>
          </block>
        </statement>
      </block>
    </statement>
  </block>
</xml>`,
  },
  "ai-news-trader": {
    id: "ai-news-trader",
    name: "AI News Trader",
    description: "Trade based on real-time news analysis and impact assessment",
    prompt:
      "Use AI to analyze breaking news and predict immediate market reactions",
    icon: <Target className="w-5 h-5" />,
    category: "AI",
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="strategy_start" x="200" y="100">
    <statement name="DO">
      <block type="ai_agent" x="200" y="200">
        <field name="AGENT_TYPE">NEWS_ANALYSIS</field>
        <field name="MODEL">GPT4</field>
        <statement name="CONFIG">
          <block type="ai_agent_config" x="200" y="300">
            <field name="TEMPERATURE">0.4</field>
            <field name="MAX_TOKENS">2048</field>
            <field name="STRATEGY">BALANCED</field>
            <field name="UPDATE_FREQUENCY">1MIN</field>
          </block>
          <block type="ai_prompt" x="200" y="400">
            <field name="PROMPT_TEXT">Monitor real-time news from major crypto publications, regulatory announcements, and market-moving events. Analyze news sentiment and predict immediate price impact. Execute trades within 30 seconds of significant news.</field>
            <field name="PROMPT_TYPE">NEWS_IMPACT</field>
          </block>
          <block type="ai_data_source" x="200" y="500">
            <field name="DATA_SOURCE">NEWS_SENTIMENT</field>
            <field name="UPDATE_FREQUENCY">30SEC</field>
          </block>
          <block type="ai_condition" x="200" y="600">
            <field name="CONDITION_TYPE">CONFIDENCE</field>
            <field name="OPERATOR">GT</field>
            <value name="THRESHOLD">
              <block type="math_number" x="200" y="650">
                <field name="NUM">85</field>
              </block>
            </value>
          </block>
          <block type="trading_action" x="200" y="700">
            <field name="ACTION">BUY</field>
            <field name="ORDER_TYPE">MARKET</field>
            <value name="AMOUNT">
              <block type="math_number" x="200" y="750">
                <field name="NUM">300</field>
              </block>
            </value>
            <field name="ASSET">SOL_USDT</field>
          </block>
        </statement>
      </block>
    </statement>
  </block>
</xml>`,
  },
  "defi-yield-farming": {
    id: "defi-yield-farming",
    name: "DeFi Yield Farming",
    description: "Automated yield farming across multiple protocols",
    prompt:
      "Automatically farm yield by moving funds between the highest yielding DeFi protocols",
    icon: <Zap className="w-5 h-5" />,
    category: "DeFi",
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="strategy_start" x="200" y="100">
    <statement name="DO">
      <block type="controls_if" x="200" y="200">
        <value name="IF0">
          <block type="logic_compare" x="200" y="250">
            <field name="OP">GT</field>
            <value name="A">
              <block type="portfolio_balance" x="200" y="300">
                <field name="BALANCE_TYPE">AVAILABLE</field>
                <field name="ASSET">USDT</field>
              </block>
            </value>
            <value name="B">
              <block type="math_number" x="200" y="350">
                <field name="NUM">1000</field>
              </block>
            </value>
          </block>
        </value>
        <statement name="DO0">
          <block type="defi_operation" x="200" y="400">
            <field name="DEFI_ACTION">DEPOSIT</field>
            <value name="AMOUNT">
              <block type="math_number" x="200" y="450">
                <field name="NUM">500</field>
              </block>
            </value>
            <field name="TOKEN">USDT</field>
            <field name="PROTOCOL">AAVE</field>
          </block>
          <block type="defi_operation" x="200" y="500">
            <field name="DEFI_ACTION">ADD_LIQUIDITY</field>
            <value name="AMOUNT">
              <block type="math_number" x="200" y="550">
                <field name="NUM">300</field>
              </block>
            </value>
            <field name="TOKEN">USDT</field>
            <field name="PROTOCOL">UNISWAP</field>
          </block>
          <block type="staking_operation" x="200" y="600">
            <field name="STAKING_ACTION">STAKE</field>
            <value name="AMOUNT">
              <block type="math_number" x="200" y="650">
                <field name="NUM">200</field>
              </block>
            </value>
            <field name="TOKEN">ETH</field>
            <field name="VALIDATOR">LIDO</field>
          </block>
        </statement>
      </block>
    </statement>
  </block>
</xml>`,
  },
  "grid-trading": {
    id: "grid-trading",
    name: "Grid Trading",
    description: "Automated grid trading with dynamic price levels",
    prompt:
      "Set up a grid trading strategy with buy orders at every 2% drop and sell orders at every 2% rise",
    icon: <BarChart3 className="w-5 h-5" />,
    category: "Technical",
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="strategy_start" x="200" y="100">
    <statement name="DO">
      <block type="controls_repeat_ext" x="200" y="200">
        <value name="TIMES">
          <block type="math_number" x="200" y="250">
            <field name="NUM">10</field>
          </block>
        </value>
        <statement name="DO">
          <block type="controls_if" x="200" y="300">
            <value name="IF0">
              <block type="logic_compare" x="200" y="350">
                <field name="OP">LT</field>
                <value name="A">
                  <block type="get_price" x="200" y="400">
                    <field name="ASSET">BTC</field>
                    <field name="EXCHANGE">BINANCE</field>
                  </block>
                </value>
                <value name="B">
                  <block type="math_arithmetic" x="200" y="450">
                    <field name="OP">MULTIPLY</field>
                    <value name="A">
                      <block type="get_price" x="200" y="500">
                        <field name="ASSET">BTC</field>
                        <field name="EXCHANGE">BINANCE</field>
                      </block>
                    </value>
                    <value name="B">
                      <block type="math_number" x="200" y="550">
                        <field name="NUM">0.98</field>
                      </block>
                    </value>
                  </block>
                </value>
              </block>
            </value>
            <statement name="DO0">
              <block type="trading_action" x="200" y="600">
                <field name="ACTION">BUY</field>
                <field name="ORDER_TYPE">LIMIT</field>
                <value name="AMOUNT">
                  <block type="math_number" x="200" y="650">
                    <field name="NUM">50</field>
                  </block>
                </value>
                <field name="ASSET">BTC_USDT</field>
              </block>
            </statement>
            <next>
              <block type="controls_if" x="200" y="700">
                <value name="IF0">
                  <block type="logic_compare" x="200" y="750">
                    <field name="OP">GT</field>
                    <value name="A">
                      <block type="get_price" x="200" y="800">
                        <field name="ASSET">BTC</field>
                        <field name="EXCHANGE">BINANCE</field>
                      </block>
                    </value>
                    <value name="B">
                      <block type="math_arithmetic" x="200" y="850">
                        <field name="OP">MULTIPLY</field>
                        <value name="A">
                          <block type="get_price" x="200" y="900">
                            <field name="ASSET">BTC</field>
                            <field name="EXCHANGE">BINANCE</field>
                          </block>
                        </value>
                        <value name="B">
                          <block type="math_number" x="200" y="950">
                            <field name="NUM">1.02</field>
                          </block>
                        </value>
                      </block>
                    </value>
                  </block>
                </value>
                <statement name="DO0">
                  <block type="trading_action" x="200" y="1000">
                    <field name="ACTION">SELL</field>
                    <field name="ORDER_TYPE">LIMIT</field>
                    <value name="AMOUNT">
                      <block type="math_number" x="200" y="1050">
                        <field name="NUM">50</field>
                      </block>
                    </value>
                    <field name="ASSET">BTC_USDT</field>
                  </block>
                </statement>
              </block>
            </next>
          </block>
        </statement>
      </block>
    </statement>
  </block>
</xml>`,
  },
  "arbitrage-bot": {
    id: "arbitrage-bot",
    name: "Arbitrage Bot",
    description: "Automated arbitrage between exchanges",
    prompt:
      "Monitor price differences between exchanges and execute arbitrage trades when spread > 0.5%",
    icon: <Target className="w-5 h-5" />,
    category: "Technical",
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="strategy_start" x="200" y="100">
    <statement name="DO">
      <block type="controls_if" x="200" y="200">
        <value name="IF0">
          <block type="logic_compare" x="200" y="250">
            <field name="OP">GT</field>
            <value name="A">
              <block type="math_arithmetic" x="200" y="300">
                <field name="OP">MINUS</field>
                <value name="A">
                  <block type="get_price" x="200" y="350">
                    <field name="ASSET">BTC</field>
                    <field name="EXCHANGE">BINANCE</field>
                  </block>
                </value>
                <value name="B">
                  <block type="get_price" x="200" y="400">
                    <field name="ASSET">BTC</field>
                    <field name="EXCHANGE">COINBASE</field>
                  </block>
                </value>
              </block>
            </value>
            <value name="B">
              <block type="math_arithmetic" x="200" y="450">
                <field name="OP">MULTIPLY</field>
                <value name="A">
                  <block type="get_price" x="200" y="500">
                    <field name="ASSET">BTC</field>
                    <field name="EXCHANGE">BINANCE</field>
                  </block>
                </value>
                <value name="B">
                  <block type="math_number" x="200" y="550">
                    <field name="NUM">0.005</field>
                  </block>
                </value>
              </block>
            </value>
          </block>
        </value>
        <statement name="DO0">
          <block type="trading_action" x="200" y="600">
            <field name="ACTION">BUY</field>
            <field name="ORDER_TYPE">MARKET</field>
            <value name="AMOUNT">
              <block type="math_number" x="200" y="650">
                <field name="NUM">100</field>
              </block>
            </value>
            <field name="ASSET">BTC_USDT</field>
          </block>
          <block type="trading_action" x="200" y="700">
            <field name="ACTION">SELL</field>
            <field name="ORDER_TYPE">MARKET</field>
            <value name="AMOUNT">
              <block type="math_number" x="200" y="750">
                <field name="NUM">100</field>
              </block>
            </value>
            <field name="ASSET">BTC_USDT</field>
          </block>
        </statement>
      </block>
    </statement>
  </block>
</xml>`,
  },
  "zeroex-eth-dip-buyer": {
    id: "zeroex-eth-dip-buyer",
    name: "0x ETH Dip Buyer",
    description: "Buy ETH with USDC when price drops below a target",
    prompt: "Buy 150 USDC of ETH when the price falls under $2,800 on Ethereum",
    icon: <BarChart3 className="w-5 h-5" />,
    category: "0x",
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="strategy_start" x="200" y="100">
    <statement name="DO">
      <block type="controls_if" x="200" y="200">
        <value name="IF0">
          <block type="logic_compare" x="200" y="250">
            <field name="OP">LT</field>
            <value name="A">
              <block type="get_price" x="200" y="300">
                <field name="ASSET">ETH</field>
                <field name="EXCHANGE">BINANCE</field>
              </block>
            </value>
            <value name="B">
              <block type="math_number" x="200" y="350">
                <field name="NUM">2800</field>
              </block>
            </value>
          </block>
        </value>
        <statement name="DO0">
          <block type="zeroex_swap" x="200" y="400">
            <field name="AMOUNT_MODE">SELL</field>
            <field name="AMOUNT">150</field>
            <field name="SELL_TOKEN">USDC</field>
            <field name="BUY_TOKEN">ETH</field>
            <field name="CHAIN_ID">1</field>
            <field name="SLIPPAGE_BPS">50</field>
            <field name="TAKER"></field>
          </block>
        </statement>
      </block>
    </statement>
  </block>
</xml>`,
  },
  "zeroex-profit-taker": {
    id: "zeroex-profit-taker",
    name: "0x Profit Taker",
    description: "Trim positions into stablecoins when price rallies",
    prompt: "Swap 0.25 ETH to USDC if ETH trades above $3,400",
    icon: <DollarSign className="w-5 h-5" />,
    category: "0x",
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="strategy_start" x="200" y="100">
    <statement name="DO">
      <block type="controls_if" x="200" y="200">
        <value name="IF0">
          <block type="logic_compare" x="200" y="250">
            <field name="OP">GT</field>
            <value name="A">
              <block type="get_price" x="200" y="300">
                <field name="ASSET">ETH</field>
                <field name="EXCHANGE">BINANCE</field>
              </block>
            </value>
            <value name="B">
              <block type="math_number" x="200" y="350">
                <field name="NUM">3400</field>
              </block>
            </value>
          </block>
        </value>
        <statement name="DO0">
          <block type="zeroex_swap" x="200" y="400">
            <field name="AMOUNT_MODE">SELL</field>
            <field name="AMOUNT">0.25</field>
            <field name="SELL_TOKEN">ETH</field>
            <field name="BUY_TOKEN">USDC</field>
            <field name="CHAIN_ID">1</field>
            <field name="SLIPPAGE_BPS">100</field>
            <field name="TAKER"></field>
          </block>
        </statement>
      </block>
    </statement>
  </block>
</xml>`,
  },
  "zeroex-stable-rotation": {
    id: "zeroex-stable-rotation",
    name: "0x Stable Rotation",
    description: "Rotate between USDC and USDT on Base when spreads appear",
    prompt: "Swap 10,000 USDC to USDT on Base when USDC premium exceeds 0.2%",
    icon: <Shield className="w-5 h-5" />,
    category: "0x",
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="strategy_start" x="200" y="100">
    <statement name="DO">
      <block type="controls_if" x="200" y="200">
        <value name="IF0">
          <block type="logic_compare" x="200" y="250">
            <field name="OP">GT</field>
            <value name="A">
              <block type="get_price" x="200" y="300">
                <field name="ASSET">USDC</field>
                <field name="EXCHANGE">COINBASE</field>
              </block>
            </value>
            <value name="B">
              <block type="math_number" x="200" y="350">
                <field name="NUM">1.002</field>
              </block>
            </value>
          </block>
        </value>
        <statement name="DO0">
          <block type="zeroex_swap" x="200" y="400">
            <field name="AMOUNT_MODE">SELL</field>
            <field name="AMOUNT">10000</field>
            <field name="SELL_TOKEN">USDC</field>
            <field name="BUY_TOKEN">USDT</field>
            <field name="CHAIN_ID">8453</field>
            <field name="SLIPPAGE_BPS">50</field>
            <field name="TAKER"></field>
          </block>
        </statement>
      </block>
    </statement>
  </block>
</xml>`,
  },
  "zeroex-weekly-rebalance": {
    id: "zeroex-weekly-rebalance",
    name: "0x Weekly Rebalance",
    description: "Rebalance portfolio from BTC to ETH once per week using 0x",
    prompt: "Every 7 days swap 0.1 WBTC for ETH on Arbitrum with 1% slippage",
    icon: <Zap className="w-5 h-5" />,
    category: "0x",
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="strategy_start" x="200" y="100">
    <statement name="DO">
      <block type="controls_repeat_ext" x="200" y="200">
        <value name="TIMES">
          <block type="math_number" x="200" y="250">
            <field name="NUM">1</field>
          </block>
        </value>
        <statement name="DO">
          <block type="zeroex_swap" x="200" y="300">
            <field name="AMOUNT_MODE">SELL</field>
            <field name="AMOUNT">0.1</field>
            <field name="SELL_TOKEN">WBTC</field>
            <field name="BUY_TOKEN">ETH</field>
            <field name="CHAIN_ID">42161</field>
            <field name="SLIPPAGE_BPS">100</field>
            <field name="TAKER"></field>
          </block>
        </statement>
      </block>
    </statement>
  </block>
</xml>`,
  },

};

export function getTemplate(id: string): StrategyTemplate | undefined {
  return TEMPLATE_REGISTRY[id];
}

export function getAllTemplates(): StrategyTemplate[] {
  return Object.values(TEMPLATE_REGISTRY);
}

export function getTemplatesByCategory(): Record<string, StrategyTemplate[]> {
  const templates = getAllTemplates();
  const byCategory: Record<string, StrategyTemplate[]> = {};

  templates.forEach((template) => {
    if (!byCategory[template.category]) {
      byCategory[template.category] = [];
    }
    byCategory[template.category].push(template);
  });

  return byCategory;
}
