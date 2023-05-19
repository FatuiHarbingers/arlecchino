import { load } from 'ts-dotenv'

export const env = load( {
	DISCORD_TOKEN: String,
	REDIS_DB: {
		default: 1,
		type: Number
	},
	REDIS_HOST: String,
	REDIS_PASSWORD: {
		default: '',
		type: String
	},
	REDIS_PORT: {
		default: 6379,
		type: Number
	},
	REDIS_USERNAME: {
		default: '',
		type: String
	}
} )
