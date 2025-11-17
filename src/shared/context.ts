import { createSandboxConfig, SecurityMode, SECURITY_MODE_CONFIGS } from './config';
import { SandboxRuntimeConfig } from "@anthropic-ai/sandbox-runtime";
import * as fs from 'fs';
import * as path from 'path';

export interface AgentContext {
  workingDirectory: string;
  sandboxConfig: SandboxRuntimeConfig;
  securityMode: SecurityMode;
  sessionId: string;
  startTime: Date;
  userRequest: string;
}

export interface UserPreferences {
  securityMode: SecurityMode;
  allowedDomains?: string[];
  allowLocalBinding?: boolean;
  extraAllowWrite?: string[];
  extraDenyRead?: string[];
  extraDenyWrite?: string[];
}

const DEFAULT_PREFS: UserPreferences = {
  securityMode: 'moderate',
  allowedDomains: ["localhost", "127.0.0.1"],
  allowLocalBinding: true
};

export class ContextManager {
  private static instance: ContextManager;
  private context: AgentContext | null = null;
  private prefs: UserPreferences;

  private constructor(prefs: Partial<UserPreferences> = {}) {
    this.prefs = { ...DEFAULT_PREFS, ...prefs };
  }

  static getInstance(prefs?: Partial<UserPreferences>): ContextManager {
    if (!ContextManager.instance) {
      ContextManager.instance = new ContextManager(prefs);
    } else if (prefs) {
      ContextManager.instance.updatePrefs(prefs);
    }
    return ContextManager.instance;
  }

  static createInstance(prefs: Partial<UserPreferences> = {}): ContextManager {
    return new ContextManager(prefs);
  }

  updatePrefs(prefs: Partial<UserPreferences>): void {
    this.prefs = { ...this.prefs, ...prefs };
    if (this.context) {
      this.context.sandboxConfig = createSandboxConfig(this.context.workingDirectory, this.prefs.securityMode, this.prefs);
      this.context.securityMode = this.prefs.securityMode;
    }
  }

  getPrefs(): UserPreferences {
    return { ...this.prefs };
  }

  initializeContext(userRequest: string, workingDirectory?: string): AgentContext {
    const workDir = workingDirectory || process.cwd();

    // 添加工作目录下的禁止区域
    const extraDeny = [...(this.prefs.extraDenyWrite || [])];
    const forbiddenArea = path.join(workDir, 'forbidden_area');
    if (fs.existsSync(forbiddenArea)) extraDeny.push(forbiddenArea);

    this.context = {
      workingDirectory: workDir,
      sandboxConfig: createSandboxConfig(workDir, this.prefs.securityMode, { ...this.prefs, extraDenyWrite: extraDeny }),
      securityMode: this.prefs.securityMode,
      sessionId: this.generateSessionId(),
      startTime: new Date(),
      userRequest
    };
    return this.context;
  }

  getContext(): AgentContext {
    if (!this.context) throw new Error('Context not initialized');
    return this.context;
  }

  updateWorkingDirectory(newDirectory: string): void {
    if (!this.context) throw new Error('Context not initialized');

    // 更新工作目录并重新生成配置
    const extraDeny = [...(this.prefs.extraDenyWrite || [])];
    const forbiddenArea = path.join(newDirectory, 'forbidden_area');
    if (fs.existsSync(forbiddenArea)) extraDeny.push(forbiddenArea);

    this.context.workingDirectory = newDirectory;
    this.context.sandboxConfig = createSandboxConfig(newDirectory, this.prefs.securityMode, { ...this.prefs, extraDenyWrite: extraDeny });
  }

  requiresUserConfirmation(operation: 'read' | 'write'): boolean {
    return this.prefs.securityMode === 'inquire' && operation === 'write';
  }

  getSecurityModeDescription(): string {
    return SECURITY_MODE_CONFIGS[this.prefs.securityMode];
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  resetPrefs(): void {
    this.prefs = { ...DEFAULT_PREFS };
    if (this.context) {
      this.context.sandboxConfig = createSandboxConfig(this.context.workingDirectory, this.prefs.securityMode, this.prefs);
      this.context.securityMode = this.prefs.securityMode;
    }
  }

  reset(): void {
    this.context = null;
  }
}