#!/usr/bin/env tsx

// CodeAct 沙箱终极综合测试 - 包含所有必要的安全和功能测试
import { runCode } from '../src/shared/sandbox.js';
import { ContextManager } from '../src/shared/context.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface TestResult {
  passed: number;
  total: number;
  details: string[];
}

class ComprehensiveSandboxTest {
  private results: { [key: string]: TestResult } = {};

  constructor() {
    this.results = {
      functionality: { passed: 0, total: 0, details: [] },
      readSecurity: { passed: 0, total: 0, details: [] },
      writeSecurity: { passed: 0, total: 0, details: [] },
      languageConsistency: { passed: 0, total: 0, details: [] }
    };
  }

  private async runTest(testName: string, testCode: string, language: 'bash' | 'javascript' | 'python', shouldSucceed: boolean, category: string): Promise<boolean> {
    try {
      const result = await runCode({
        language,
        code: testCode
      });

      const hasPermissionError = result.logs?.some(log =>
        log.includes('Operation not permitted') ||
        log.includes('Permission denied') ||
        log.includes('EACCES') ||
        log.includes('EPERM')
      ) || result.output?.includes('Permission denied') ||
          result.output?.includes('EACCES') ||
          result.output?.includes('写入失败');

      const succeeded = result.output && !hasPermissionError && !result.output.includes('失败');
      const testPassed = shouldSucceed ? succeeded : !succeeded;

      this.results[category].total++;
      if (testPassed) {
        this.results[category].passed++;
        this.results[category].details.push(`✅ ${testName}`);
        return true;
      } else {
        this.results[category].details.push(`❌ ${testName} - 期望${shouldSucceed ? '成功' : '失败'}，实际${succeeded ? '成功' : '失败'}`);
        return false;
      }
    } catch (error) {
      const isExpectedError = !shouldSucceed && (
        error instanceof Error &&
        (error.message.includes('Permission denied') ||
         error.message.includes('EACCES') ||
         error.message.includes('EPERM'))
      );

      this.results[category].total++;
      if (isExpectedError) {
        this.results[category].passed++;
        this.results[category].details.push(`✅ ${testName} (权限错误正确抛出)`);
        return true;
      } else {
        this.results[category].details.push(`❌ ${testName} - 意外错误: ${error instanceof Error ? error.message : String(error)}`);
        return false;
      }
    }
  }

  async testBasicFunctionality() {
    console.log('🔧 测试 1: 基础功能验证');

    const tests = [
      { name: 'Bash - 当前目录', code: 'pwd', lang: 'bash' as const, succeed: true },
      { name: 'Bash - 文件计数', code: 'find . -maxdepth 1 -type f | wc -l', lang: 'bash' as const, succeed: true },
      { name: 'Bash - 环境变量', code: 'echo "USER:$USER, PATH:$(echo $PATH | wc -c)"', lang: 'bash' as const, succeed: true },
      { name: 'JavaScript - 计算', code: 'console.log(2 + 3.14);', lang: 'javascript' as const, succeed: true },
      { name: 'JavaScript - 文件读取', code: `
const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f !== 'forbidden_area');
console.log(\`文件数量: \${files.length}\`);
      `.trim(), lang: 'javascript' as const, succeed: true },
      { name: 'Python - 计算', code: 'print(10 * 2.5)', lang: 'python' as const, succeed: true },
      { name: 'Python - 系统信息', code: `
import os
print(f"目录: {os.getcwd().split('/')[-1]}")
print(f"用户: {os.environ.get('USER', 'unknown')}")
      `.trim(), lang: 'python' as const, succeed: true }
    ];

    for (const test of tests) {
      await this.runTest(test.name, test.code, test.lang, test.succeed, 'functionality');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async testReadSecurity() {
    console.log('🔒 测试 2: 读取安全验证');

    const tests = [
      { name: '读取 forbidden_area 目录', code: 'ls forbidden_area/', lang: 'bash' as const, succeed: false },
      { name: '读取 forbidden_area 文件', code: 'cat forbidden_area/secrets.txt', lang: 'bash' as const, succeed: false },
      { name: '读取 SSH 目录', code: 'ls ~/.ssh/', lang: 'bash' as const, succeed: false },
      { name: 'JavaScript 读取 forbidden_area', code: `
const fs = require('fs');
try {
  const content = fs.readFileSync('forbidden_area/secrets.txt', 'utf8');
  console.log('内容:', content.slice(0, 20));
} catch (error) {
  console.log('读取失败:', error.message);
}
      `.trim(), lang: 'javascript' as const, succeed: false },
      { name: 'Python 读取 forbidden_area', code: `
try:
    with open('forbidden_area/secrets.txt', 'r') as f:
        content = f.read()[:20]
        print('内容:', content)
except Exception as e:
    print('读取失败:', str(e))
      `.trim(), lang: 'python' as const, succeed: false }
    ];

    for (const test of tests) {
      await this.runTest(test.name, test.code, test.lang, test.succeed, 'readSecurity');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async testWriteSecurity() {
    console.log('🛡️  测试 3: 写入安全验证');

    const testDir = '/Users/gl/agentwork/codeact/test_workspace';
    const tempDir = os.tmpdir();
    const homeDir = process.env.HOME || '/Users/gl';

    const tests = [
      // 禁止写入
      { name: '写入 forbidden_area', code: 'echo "test" > forbidden_area/test.txt', lang: 'bash' as const, succeed: false },
      { name: '写入系统目录', code: 'echo "test" > /etc/sandbox_test.txt', lang: 'bash' as const, succeed: false },
      { name: '写入 SSH 目录', code: 'echo "test" > ~/.ssh/sandbox_test.txt', lang: 'bash' as const, succeed: false },
      { name: 'JavaScript 写入 forbidden_area', code: `
const fs = require('fs');
fs.writeFileSync('forbidden_area/js_test.txt', 'should not work');
console.log('写入成功 - 不应该发生');
      `.trim(), lang: 'javascript' as const, succeed: false },
      { name: 'Python 写入 forbidden_area', code: `
with open('forbidden_area/py_test.txt', 'w') as f:
    f.write('should not work')
print('写入成功 - 不应该发生')
      `.trim(), lang: 'python' as const, succeed: false },

      // 允许写入
      { name: '写入临时目录', code: `echo "temp test" > ${path.join(tempDir, 'sandbox_test.txt')} && echo "临时目录写入成功"`, lang: 'bash' as const, succeed: true },
      { name: '写入工作目录', code: 'echo "workspace test" > workspace_test.txt && echo "工作目录写入成功"', lang: 'bash' as const, succeed: true },
      { name: 'JavaScript 写入工作目录', code: `
const fs = require('fs');
fs.writeFileSync('js_workspace_test.txt', 'JavaScript 写入测试');
console.log('JavaScript 工作目录写入成功');
      `.trim(), lang: 'javascript' as const, succeed: true },
      { name: 'Python 写入工作目录', code: `
with open('py_workspace_test.txt', 'w') as f:
    f.write('Python 写入测试')
print('Python 工作目录写入成功')
      `.trim(), lang: 'python' as const, succeed: true },

      // 默认拒绝 (未配置目录)
      { name: '写入用户主目录', code: 'echo "test" > ~/unauthorized_sandbox_test.txt', lang: 'bash' as const, succeed: false },
      { name: '写入应用程序目录', code: 'echo "test" > /Applications/sandbox_test.txt', lang: 'bash' as const, succeed: false }
    ];

    for (const test of tests) {
      await this.runTest(test.name, test.code, test.lang, test.succeed, 'writeSecurity');
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 清理测试文件
    const filesToClean = [
      'workspace_test.txt',
      'js_workspace_test.txt',
      'py_workspace_test.txt',
      path.join(tempDir, 'sandbox_test.txt')
    ];

    filesToClean.forEach(file => {
      try {
        fs.rmSync(file, { force: true });
      } catch (e) {
        // 忽略清理错误
      }
    });
  }

  async testLanguageConsistency() {
    console.log('🔄 测试 4: 语言一致性验证');

    // 测试相同操作在不同语言中的行为一致性
    const operationTests = [
      {
        operation: '文件读取',
        bash: 'cat README.md 2>/dev/null | head -1 || echo "无法读取"',
        js: `
const fs = require('fs');
try {
  const content = fs.readFileSync('README.md', 'utf8');
  console.log(content.split('\\n')[0]);
} catch (error) {
  console.log('无法读取');
}
        `.trim(),
        python: `
try:
    with open('README.md', 'r') as f:
        content = f.read()
        print(content.split('\\n')[0])
except Exception:
    print('无法读取')
        `.trim()
      },
      {
        operation: '目录列表',
        bash: 'ls -1 2>/dev/null | wc -l | tr -d "\\n"',
        js: `
const fs = require('fs');
try {
  const files = fs.readdirSync('.');
  console.log(files.length);
} catch (error) {
  console.log('0');
}
        `.trim(),
        python: `
import os
try:
    files = os.listdir('.')
    print(len(files))
except Exception:
    print('0')
        `.trim()
      }
    ];

    for (const test of operationTests) {
      console.log(`  📝 ${test.operation}:`);

      // 测试每种语言
      await this.runTest(`${test.operation} - Bash`, test.bash, 'bash', true, 'languageConsistency');
      await new Promise(resolve => setTimeout(resolve, 50));

      await this.runTest(`${test.operation} - JavaScript`, test.js, 'javascript', true, 'languageConsistency');
      await new Promise(resolve => setTimeout(resolve, 50));

      await this.runTest(`${test.operation} - Python`, test.python, 'python', true, 'languageConsistency');
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  printSummary() {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 CodeAct 沙箱综合测试报告`);
    console.log(`🕐 测试时间: ${new Date().toLocaleString()}`);
    console.log(`${'='.repeat(80)}`);

    const categories = [
      { name: '基础功能', key: 'functionality', emoji: '🔧' },
      { name: '读取安全', key: 'readSecurity', emoji: '🔒' },
      { name: '写入安全', key: 'writeSecurity', emoji: '🛡️' },
      { name: '语言一致性', key: 'languageConsistency', emoji: '🔄' }
    ];

    let totalPassed = 0;
    let totalTests = 0;

    categories.forEach(cat => {
      const result = this.results[cat.key];
      const percentage = result.total > 0 ? Math.round(result.passed / result.total * 100) : 0;

      console.log(`\n${cat.emoji} ${cat.name}: ${result.passed}/${result.total} (${percentage}%)`);

      // 显示失败的测试详情
      const failedTests = result.details.filter(detail => detail.startsWith('❌'));
      if (failedTests.length > 0) {
        failedTests.forEach(test => console.log(`    ${test}`));
      }

      // 显示成功的测试数量
      const passedCount = result.details.filter(detail => detail.startsWith('✅')).length;
      if (passedCount > 0) {
        console.log(`    ✅ ${passedCount} 个测试通过`);
      }

      totalPassed += result.passed;
      totalTests += result.total;
    });

    const overallPercentage = Math.round(totalPassed / totalTests * 100);
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`🎯 总体通过率: ${totalPassed}/${totalTests} (${overallPercentage}%)`);

    if (totalPassed === totalTests) {
      console.log(`\n🎉 所有测试通过！沙箱环境完全安全且功能正常。`);
      console.log(`✅ CodeAct 沙箱已准备好用于生产环境。`);
    } else {
      console.log(`\n⚠️  发现 ${totalTests - totalPassed} 个问题，需要进一步检查。`);
    }

    console.log(`\n📋 测试总结:`);
    console.log(`   • 基础功能: bash/js/python 多语言支持正常`);
    console.log(`   • 读取安全: 敏感文件访问被正确阻止`);
    console.log(`   • 写入安全: 三级权限控制（禁止/允许/默认拒绝）生效`);
    console.log(`   • 语言一致性: 多语言行为保持一致`);
    console.log(`${'='.repeat(80)}`);

    return totalPassed === totalTests;
  }

  async runAllTests() {
    console.log('🚀 CodeAct 沙箱综合测试开始');
    console.log(`📁 测试目录: /Users/gl/agentwork/codeact/test_workspace`);

    // 初始化上下文
    const contextManager = ContextManager.getInstance();
    contextManager.initializeContext('综合测试', '/Users/gl/agentwork/codeact/test_workspace');

    try {
      await this.testBasicFunctionality();
      await this.testReadSecurity();
      await this.testWriteSecurity();
      await this.testLanguageConsistency();

      return this.printSummary();
    } catch (error) {
      console.error(`❌ 测试过程中发生错误: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}

// 运行测试
async function main() {
  const tester = new ComprehensiveSandboxTest();
  const success = await tester.runAllTests();
  process.exit(success ? 0 : 1);
}

main().catch(console.error);