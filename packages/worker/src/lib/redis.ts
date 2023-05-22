import { env } from '@arlecchino/secrets'
import Redis from 'ioredis'

export const redis = new Redis( {
	db: env.REDIS_DB,
	host: env.REDIS_HOST,
	maxRetriesPerRequest: null,
	password: env.REDIS_PASSWORD,
	port: env.REDIS_PORT,
	username: env.REDIS_USERNAME
} )
