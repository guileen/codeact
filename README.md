# CodeAct & LightAgent

最小化的 AI Code Agent - 用代码解决一切问题。

## 🎯 核心原理

**严格四步法**：思考 → 写代码 → 等结果 → 给答案

- **绝不直接回答** - 必须先用代码验证
- **代码必须执行** - 输出到 stdout 被观察
- **结果驱动回答** - 基于代码输出给答案

## 🚀 快速开始

```bash
# 安装
pnpm install

# 配置 .env
echo "OPENAI_API_KEY=your_key" > .env

# 运行
pnpm dev
```

### 非交互模式（直接附加提示词）

```bash
# 一句话执行，直接获取结果
pnpm dev "计算 1+1 的结果"

# 批量处理
pnpm dev "列出当前目录所有 Python 文件"
pnpm dev "创建一个包含姓名的文件"

# 管道组合使用
echo "删除所有临时文件" | pnpm dev
```

## 🆕 LightAgent TypeScript

This project now includes a complete TypeScript rewrite of LightAgent with enhanced features:

### Quick Start

```bash
# Install dependencies
npm install

# Set your OpenAI API key
export OPENAI_API_KEY="your-key-here"

# Build the project
npm run build

# Run examples
npx tsx examples/01-single-agent-simple.ts
npx tsx examples/04-multi-agent-simple.ts
```

### Features

- **Type Safety**: Full TypeScript support with type definitions
- **Tool System**: Decorator-based tool creation with metadata
- **Multi-Agent Support**: Swarm management for coordinated agent operations
- **Streaming**: Real-time response streaming capabilities
- **Memory Integration**: Plugin memory system for conversational context
- **MCP Support**: Model Context Protocol integration
- **Extensible Architecture**: Modular design for easy customization

### Core Components

```typescript
import { LightAgent, LightSwarm, tool } from './src';

// Create agent with tools
const agent = new LightAgent({
  name: 'MyAgent',
  instructions: 'You are a helpful assistant.',
  model: 'gpt-4o-mini',
  tools: [myTool]
});

// Create swarm for multi-agent coordination
const swarm = new LightSwarm();
swarm.registerAgent(agent1, agent2, agent3);
```

## 💡 核心示例

### 数学计算
```bash
> 2 + 2 等于多少？

# AI 思考后执行：
console.log(2 + 2);

# 观察输出：4
# 回答：2 + 2 = 4
```

### 文件操作
```bash
> 当前目录有几个文件？

# AI 执行：
ls -1 | wc -l

# 观察输出：8
# 回答：当前目录有 8 个文件
```

### 创建文件
```bash
> 创建 hello.txt 写入 "Hello"

# AI 执行：
echo "Hello" > hello.txt

# 观察输出：(无错误)
# 回答：已创建 hello.txt 文件
```

## 🏗️ 架构

```
src/
├── agent.ts     # Agent 大脑
├── sandbox.ts   # 代码执行沙箱
├── llm.ts       # AI 对话接口
└── cli.ts       # 命令行入口
```

## 📖 学习路径

1. 看 `src/cli.ts` - 入口逻辑
2. 改 `src/prompt.ts` - 提示词工程
3. 扩 `src/sandbox.ts` - 执行能力

MIT License