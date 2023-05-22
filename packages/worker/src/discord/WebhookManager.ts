import { type APIUser, type APIWebhook, Routes } from 'discord-api-types/v10'
import { redis } from '../lib'
import { rest } from '@arlecchino/bot'
import { request } from 'undici'
import { s } from '@sapphire/shapeshift'

type TokenWebhook = APIWebhook & {
	token: string
	url: string
}

export class WebhookManager {
	protected static botId: string | null = null
	public static readonly validator = s.tuple( [ s.string.url(), s.string.url() ] )

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	private constructor() {}

	protected static async getBotId(): Promise<string> {
		if ( this.botId ) return this.botId

		const cached = await redis.get( 'bot:id' )
		if ( cached ) {
			this.botId = cached
			return this.botId
		}

		const user = await rest.get( Routes.user() ) as APIUser
		await redis.set( 'bot:id', user.id )
		this.botId = user.id
		return this.botId
	}

	protected static async createWebhook( channel: string ): Promise<TokenWebhook> {
		const req = await rest.post( Routes.channelWebhooks( channel ), {
			body: {
				name: 'Wiki Activity'
			}
		} ) as TokenWebhook
		return req
	}

	protected static async getGuildWebhooks( channel: string ): Promise<string[]> {
		const botId = await this.getBotId()

		const webhooks = await rest.get( Routes.channelWebhooks( channel ) ) as TokenWebhook[]
		const ownedWebhooks = webhooks.filter( w => w.application_id === botId )

		return ownedWebhooks.map( i => i.url )
	}

	protected static async checkWebhook( webhook: string ): Promise<boolean> {
		try {
			const req = await request( webhook, { method: 'HEAD' } )
			return req.statusCode === 200
		} catch {
			return false
		}
	}

	public static async getWebhooks( channel: string ): Promise<[ string, string ]> {
		const key = `webhooks:${ channel }`
		const cached = this.validator.run( await redis.lrange( key, 0, 1 ) )
		if ( cached.isOk() ) {
			const webhooks = cached.unwrap()
			const [ valid1, valid2 ] = await Promise.all( [
				this.checkWebhook( webhooks[ 0 ] ),
				this.checkWebhook( webhooks[ 1 ] )
			] )

			if ( valid1 && valid2 ) {
				return webhooks
			}
		}

		await redis.del( key )
		const guildWebhooks = await this.getGuildWebhooks( channel )
		const webhooks: string[] = []

		for ( const guildWebhook of guildWebhooks ) {
			const valid = await this.checkWebhook( guildWebhook )
			if ( valid ) webhooks.push( guildWebhook )

			if ( webhooks.length === 2 ) break
		}

		while ( webhooks.length < 2 ) {
			const webhook = await this.createWebhook( channel )
			webhooks.push( webhook.url )
		}

		await redis.lpush( key, ...webhooks )
		return this.validator.parse( webhooks )
	}

	public static async getWebhookComponents( channel: string ): Promise<[ [ string, string ], [ string, string ] ]> {
		const webhooks = await this.getWebhooks( channel )
		return webhooks.map( w => {
			const split = w.split( /\//g ).slice( -2 )
			return split
		} ) as [ [ string, string ], [ string, string ] ]
	}
}
