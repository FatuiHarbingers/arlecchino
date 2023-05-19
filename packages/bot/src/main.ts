import { env } from '@arlecchino/secrets'
import { REST } from '@discordjs/rest'
import { WebSocketManager } from '@discordjs/ws'

export const rest = new REST( {
	authPrefix: 'Bot',
	version: '10'
} ).setToken( env.DISCORD_TOKEN )

export const ws = new WebSocketManager( {
	intents: 0,
	rest,
	token: env.DISCORD_TOKEN
} )
