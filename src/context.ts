import { DEFAULT_SANDBOX_CONFIG } from './config';
import * as fs from 'fs';

export interface SandboxConfig {
  timeout: number;
  maxMemory: number;
  allowNetwork: boolean;
  workingDirectory: string;
  allowedPaths: string[];
  forbiddenPaths: string[];
}

export interface AgentContext {
  workingDirectory: string;
  sandboxConfig: SandboxConfig;
  sessionId: string;
  startTime: Date;
  userRequest: string;
}

export class ContextManager {
  private static instance: ContextManager;
  private context: AgentContext | null = null;

  private constructor() {}

  static getInstance(): ContextManager {
    if (!ContextManager.instance) {
      ContextManager.instance = new ContextManager();
    }
    return ContextManager.instance;
  }

  initializeContext(userRequest: string, workingDirectory?: string): AgentContext {
    const workDir = workingDirectory || process.cwd();
    
    this.context = {
      workingDirectory: workDir,
      sandboxConfig: {
        ...DEFAULT_SANDBOX_CONFIG,
        workingDirectory: workDir,
        allowedPaths: [workDir],
        forbiddenPaths: this.getForbiddenPaths(workDir)
      },
      sessionId: this.generateSessionId(),
      startTime: new Date(),
      userRequest
    };

    return this.context;
  }

  getContext(): AgentContext {
    if (!this.context) {
      throw new Error('Context not initialized. Call initializeContext first.');
    }
    return this.context;
  }

  updateWorkingDirectory(newDirectory: string): void {
    if (!this.context) {
      throw new Error('Context not initialized.');
    }
    
    this.context.workingDirectory = newDirectory;
    this.context.sandboxConfig.workingDirectory = newDirectory;
    this.context.sandboxConfig.allowedPaths = [newDirectory];
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getForbiddenPaths(workingDirectory: string): string[] {
    const forbidden = [
      // 敏感系统配置文件（防止修改）
      '/etc/passwd',
      '/etc/shadow',
      '/etc/sudoers',
      '/etc/hosts',
      '/etc/fstab',
      '/etc/crontab',

      // 系统核心目录（防止意外破坏）
      '/System/Library',
      '/usr/libexec',
      '/boot',
      '/proc',
      '/sys',

      // 用户敏感配置（防止修改）
      '~/.ssh/id_rsa*',
      '~/.ssh/known_hosts',
      '~/.aws/credentials',
      '~/.kube/config',
      '~/.config/gcloud',

      // 高危系统命令（防止误用）
      '/usr/bin/passwd',
      '/usr/bin/sudo',
      '/usr/bin/chmod',
      '/usr/bin/chown',
      '/usr/bin/chattr',
      '/usr/bin/su',
      '/usr/bin/dpkg',
      '/usr/bin/rpm',
      '/usr/bin/pacman'
    ];

    // 添加工作目录下的forbidden_area
    const forbiddenArea = `${workingDirectory}/forbidden_area`;
    try {
      if (fs.existsSync(forbiddenArea)) {
        forbidden.push(forbiddenArea);
      }
    } catch (e) {
      // 忽略错误
    }

    return forbidden;
  }

  reset(): void {
    this.context = null;
  }
}