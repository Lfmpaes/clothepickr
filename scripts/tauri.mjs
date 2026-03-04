import { existsSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

const tauriArgs = process.argv.slice(2)
if (tauriArgs.length === 0) {
  console.error('Missing Tauri command. Example: bun run scripts/tauri.mjs dev')
  process.exit(1)
}

const cargoBin = path.join(os.homedir(), '.cargo', 'bin')
const env = { ...process.env }
if (existsSync(cargoBin)) {
  env.PATH = `${cargoBin}${path.delimiter}${process.env.PATH ?? ''}`
}

const bunCommand = process.execPath
const child = spawn(bunCommand, ['x', 'tauri', ...tauriArgs], {
  env,
  stdio: 'inherit',
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 1)
})
