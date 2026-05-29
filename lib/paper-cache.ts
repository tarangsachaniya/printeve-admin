import { api } from './api'

const cache = new Map<string, Promise<unknown>>()

export function cachedGet<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    cache.set(path, api.get<T>(path).catch((err) => {
      cache.delete(path)
      throw err
    }))
  }
  return cache.get(path) as Promise<T>
}

export function invalidatePaperCache() {
  cache.clear()
}
