#!/usr/bin/env node
import "dotenv/config";
import readline from "node:readline";
import { Agent } from "./agent.js";

async function single(prompt: string) {
  const agent = new Agent();
  const res = await agent.run(prompt);
  process.stdout.write(`${res.text}\n`);
}

async function interactive() {
  const agent = new Agent();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  process.stdout.write("CodeAct对话模式，输入exit退出\n");
  const ask = () => rl.question("> ", async q => {
    if (!q.trim()) return ask();
    if (q.trim().toLowerCase() === "exit") { rl.close(); return; }
    const res = await agent.run(q);
    process.stdout.write(`${res.text}\n`);
    ask();
  });
  ask();
}

const args = process.argv.slice(2);
if (args.length) single(args.join(" "));
else interactive();
