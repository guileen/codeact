import chalk from 'chalk';
import * as spinners from 'cli-spinners';

// ANSI 控制码
const ANSI = {
  // 清除当前行
  CLEAR_LINE: '\r\x1b[K',
  // 光标上移
  UP: (lines: number) => `\x1b[${lines}A`,
  // 光标下移
  DOWN: (lines: number) => `\x1b[${lines}B`,
  // 保存光标位置
  SAVE_CURSOR: '\x1b[s',
  // 恢复光标位置
  RESTORE_CURSOR: '\x1b[u',
  // 隐藏光标
  HIDE_CURSOR: '\x1b[?25l',
  // 显示光标
  SHOW_CURSOR: '\x1b[?25h'
};

// 颜色定义
export const Colors = {
  primary: '#00D9FF',
  secondary: '#FF00FF',
  success: '#00FF88',
  warning: '#FFAA00',
  error: '#FF4444',
  info: '#00AAFF',
  muted: '#666666'
};

// 简化的样式工具
export const Style = {
  border: (char: string = '═') => chalk.hex(Colors.primary)(char.repeat(50)),
  title: (text: string) => chalk.hex(Colors.primary).bold(text),
  success: (text: string) => chalk.hex(Colors.success).bold(text),
  error: (text: string) => chalk.hex(Colors.error).bold(text),
  warning: (text: string) => chalk.hex(Colors.warning).bold(text),
  info: (text: string) => chalk.hex(Colors.info).bold(text),
  muted: (text: string) => chalk.hex(Colors.muted)(text),
  highlight: (text: string, color?: string) => chalk.hex(color || Colors.primary).bold(text),
  code: (text: string) => chalk.gray(text)
};

// 工具图标
export const Icons = {
  bash: '💻',
  javascript: '⚡',
  python: '🐍',
  user_input: '💭',
  thinking: '🧠',
  success: '✅',
  error: '❌',
  processing: '⚡',
  waiting: '⏳'
};

// 单行状态显示器
export class StatusBar {
  private currentLine: string = '';
  private isVisible: boolean = false;

  /**
   * 显示单行状态
   */
  show(text: string, icon?: string): void {
    // 清除当前行
    process.stdout.write(ANSI.CLEAR_LINE);

    // 构建状态文本
    const iconText = icon ? `${icon} ` : '';
    this.currentLine = `${iconText}${text}`;

    // 显示新状态
    process.stdout.write(`${Style.info(this.currentLine)}`);
    this.isVisible = true;
  }

  /**
   * 更新状态（不清除历史）
   */
  update(text: string, icon?: string): void {
    this.show(text, icon);
  }

  /**
   * 清除状态行，保留历史
   */
  clear(): void {
    if (this.isVisible) {
      process.stdout.write(ANSI.CLEAR_LINE);
      process.stdout.write('\r'); // 回到行首
      this.isVisible = false;
      this.currentLine = '';
    }
  }

  /**
   * 完成状态并保留在历史中
   */
  complete(text: string, icon?: string): void {
    const iconText = icon ? `${icon} ` : '';
    const finalText = `${iconText}${text}`;

    // 清除当前状态
    this.clear();

    // 输出完成消息到历史
    console.log(Style.success(finalText));
  }

  /**
   * 错误状态并保留在历史中
   */
  error(text: string, icon?: string): void {
    const iconText = icon ? `${icon} ` : '';
    const errorText = `${iconText}${text}`;

    // 清除当前状态
    this.clear();

    // 输出错误消息到历史
    console.log(Style.error(errorText));
  }
}

// 单行加载动画
export class SingleLineSpinner {
  private statusBar: StatusBar;
  private interval: NodeJS.Timeout | null = null;
  private index: number = 0;
  private spinner: string[];
  private isActive: boolean = false;

  constructor(statusBar: StatusBar, type: string = 'dots') {
    this.statusBar = statusBar;
    this.spinner = (spinners as any)[type]?.frames || ['⠋', '⠙', '⠹', '⠸'];
  }

  start(text: string, icon?: string): void {
    if (this.isActive) return;

    this.isActive = true;
    this.interval = setInterval(() => {
      const frame = this.spinner[this.index];
      this.statusBar.show(`${text}`, icon || frame);
      this.index = (this.index + 1) % this.spinner.length;
    }, 100);
  }

  stop(finalText?: string, icon?: string): void {
    if (!this.isActive) return;

    this.isActive = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    if (finalText) {
      this.statusBar.complete(finalText, icon || Icons.success);
    } else {
      this.statusBar.clear();
    }
  }

  complete(text: string, icon?: string): void {
    this.stop(text, icon);
  }

  update(text: string, icon?: string): void {
    if (this.isActive && this.interval) {
      clearInterval(this.interval);
      this.start(text, icon);
    }
  }
}

// 紧凑的结果显示器
export class CompactDisplay {
  /**
   * 显示工具执行开始
   */
  showToolStart(toolType: string, description?: string): void {
    const icon = this.getToolIcon(toolType);
    const toolName = toolType.toUpperCase();
    const desc = description ? ` - ${description}` : '';
    console.log(`${Style.info(icon)} ${Style.highlight(toolName)}${Style.muted(desc)}`);
  }

  /**
   * 显示工具执行结果（单行）
   */
  showToolResult(toolType: string, success: boolean, output?: string, error?: string): void {
    const icon = success ? Icons.success : Icons.error;
    const toolName = toolType.toUpperCase();
    const status = success ? '成功' : '失败';

    let result = `${icon} ${toolName} ${status}`;

    if (output && output.length > 0) {
      const preview = output.length > 50 ? `${output.substring(0, 50)}...` : output;
      result += ` ${Style.muted(`| ${preview}`)}`;
    }

    if (error) {
      result += ` ${Style.error(`| ${error}`)}`;
    }

    console.log(result);
  }

  /**
   * 显示思考过程（紧凑版）
   */
  showThinking(): void {
    console.log(`${Icons.thinking} ${Style.muted('AI思考中...')}`);
  }

  /**
   * 显示任务完成
   */
  showCompletion(taskDescription: string, resultSummary?: string): void {
    console.log(`${Icons.success} ${Style.success('任务完成:')} ${taskDescription}`);
    if (resultSummary) {
      console.log(`${Style.muted(`结果: ${resultSummary}`)}`);
    }
  }

  private getToolIcon(toolType: string): string {
    const iconMap: { [key: string]: string } = {
      bash: Icons.bash,
      javascript: Icons.javascript,
      python: Icons.python,
      user_input: Icons.user_input
    };
    return iconMap[toolType.toLowerCase()] || Icons.processing;
  }
}

// 简化的状态面板（只显示关键信息）
export class MinimalStatusPanel {
  /**
   * 显示会话状态（单行）
   */
  showSessionStatus(completedTasks: number, sessionDuration: number, currentTask?: string): void {
    const minutes = Math.floor(sessionDuration / 60);
    const seconds = sessionDuration % 60;

    let status = `${Style.info('会话:')} ${minutes}分${seconds}秒 | ${Style.success('完成:')} ${completedTasks}个任务`;

    if (currentTask) {
      const taskPreview = currentTask.length > 30 ? `${currentTask.substring(0, 30)}...` : currentTask;
      status += ` | ${Style.warning('当前:')} ${taskPreview}`;
    }

    console.log(`${Style.muted('─'.repeat(50))}`);
    console.log(status);
    console.log(`${Style.muted('─'.repeat(50))}`);
  }
}

// 主要导出对象
export const CleanUI = {
  ANSI,
  Colors,
  Style,
  Icons,
  StatusBar,
  SingleLineSpinner,
  CompactDisplay,
  MinimalStatusPanel
};