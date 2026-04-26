import type { Server } from 'node:http'

import { createApp } from './app.js'
import { env } from './config/env.js'
import { connectMongo, disconnectMongo } from './db/mongoose.js'

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })
}

async function bootstrap(): Promise<void> {
  try {
    await connectMongo()
  } catch (error) {
    console.error('[lifequest-api] failed to connect to MongoDB', error)
    process.exit(1)
  }

  const app = createApp()
  const server = app.listen(env.port, () => {
    console.log(`[lifequest-api] listening on port ${env.port}`)
  })

  const shutdown = async (signal: NodeJS.Signals) => {
    console.log(`[lifequest-api] received ${signal}, shutting down...`)

    try {
      await closeServer(server)
      await disconnectMongo()
      process.exit(0)
    } catch (error) {
      console.error('[lifequest-api] graceful shutdown failed', error)
      process.exit(1)
    }
  }

  process.once('SIGINT', () => {
    void shutdown('SIGINT')
  })

  process.once('SIGTERM', () => {
    void shutdown('SIGTERM')
  })

  server.on('error', async (error) => {
    console.error('[lifequest-api] server error', error)

    try {
      await disconnectMongo()
    } finally {
      process.exit(1)
    }
  })
}

void bootstrap()
