import { readFile } from 'node:fs/promises'

export const loadConfig = async (path: string): Promise<string> => {
  return readFile(path, 'utf8')
}
