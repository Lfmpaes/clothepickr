import { ConvexReactClient } from 'convex/react'

let reactClient: ConvexReactClient | undefined

export function isConvexConfigured() {
  return Boolean(import.meta.env.VITE_CONVEX_URL)
}

export function getConvexReactClient(): ConvexReactClient {
  if (!reactClient) {
    reactClient = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL!)
  }
  return reactClient
}
