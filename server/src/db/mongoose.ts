import mongoose from 'mongoose'

import { env } from '../config/env.js'

export type MongoStatus = 'disconnected' | 'connected' | 'connecting' | 'disconnecting'

const statusMap: Record<number, MongoStatus> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
  99: 'disconnected',
}

let listenersBound = false

function bindConnectionListeners(): void {
  if (listenersBound) {
    return
  }

  mongoose.connection.on('connected', () => {
    console.log('[mongo] connected')
  })

  mongoose.connection.on('disconnected', () => {
    console.warn('[mongo] disconnected')
  })

  mongoose.connection.on('error', (error) => {
    console.error('[mongo] connection error', error)
  })

  listenersBound = true
}

export function getMongoStatus(): MongoStatus {
  return statusMap[mongoose.connection.readyState] ?? 'disconnected'
}

export async function connectMongo(): Promise<typeof mongoose> {
  bindConnectionListeners()

  return mongoose.connect(env.mongoUri)
}

export async function disconnectMongo(): Promise<void> {
  const status = getMongoStatus()

  if (status === 'disconnected' || status === 'disconnecting') {
    return
  }

  await mongoose.disconnect()
}
