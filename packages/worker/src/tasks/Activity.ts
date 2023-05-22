import { type APIUser, Routes } from 'discord-api-types/v10'
import { BaseStrategy, Wiki } from '@quority/core'
import { Fandom } from '@quority/fandom'
import type { Job } from 'bullmq'
import { prisma, redis } from '../lib'
import { rest } from '@arlecchino/bot'
import { s } from '@sapphire/shapeshift'
import { Task } from '../framework'
import { Time } from '@sapphire/duration'
import { WebhookManager } from '../discord'
import { ActivityManager } from '../discord/ActivityManager'
import { request } from 'undici'
import { ProfileType } from '@arlecchino/prisma'
import ico2png from 'ico-to-png'

export class ActivityTask extends Task {
	protected api: string
	protected favicon: Buffer | null = null
	protected sitename: string | null = null
	protected wiki: Wiki

	public constructor( job: Job ) {
		super( 'wiki', job )
		this.api = s.string.parse( job.data )
		const label = this.api.replace( /(https:\/\/|\/api\.php)/g, '' )
		this.logger = this.logger.child( { label } )

		this.wiki = new Wiki( {
			api: this.api,
			platform: this.api.includes( 'fandom.com' ) ? Fandom : BaseStrategy
		} )
	}

	public async run(): Promise<void> {
		this.logger.info( 'Starting task' )
		const lastCheck = new Date( '2023-05-19T21:43:21.110Z' )// await this.getLastCheck()
		const now = new Date( Date.now() - Time.Second * 3 )
		const avatar = await this.getDefaultAvatar()

		try {
			const activity = new ActivityManager( {
				from: lastCheck,
				to: now,
				wiki: this.wiki
			} )
			const activityCount = await activity.loadActivity()
			if ( activityCount === 0 ) return

			const configs = await prisma.configuration.findMany( {
				include: { profiles: true },
				where: { wiki: this.api }
			} )
			if ( configs.length === 0 ) return

			for ( const config of configs ) {
				const webhooks = await WebhookManager.getWebhookComponents( config.channel )
				let idx: 0 | 1 = 0

				for await ( const { embed, profileType } of activity.generateEmbeds() ) {
					idx = Math.abs( 1 - idx ) as 0 | 1
					const [ webhookId, webhookToken ] = webhooks[ idx ]

					const profile = config.profiles.find( p => p.type === profileType )
						?? config.profiles.find( p => p.type === ProfileType.Default )
						?? config.profiles.at( 0 )

					embed.setColor( profile?.color ?? 0x0088ff )
					embed.setFooter( {
						iconURL: 'attachment://favicon.png',
						text: `${ await this.getSitename() }${ embed.data.footer?.text ?? '' }`
					} )

					await rest.post( Routes.webhook( webhookId, webhookToken ), {
						body: {
							avatar_url: profile?.avatar ?? avatar,
							embeds: [ embed.toJSON() ],
							username: profile?.name ?? undefined
						},
						files: [ {
							contentType: 'image/x-png',
							data: await this.getFavicon() ?? '',
							name: 'favicon.png'
						} ]
					} )
				}
			}
		} catch ( e ) {
			this.logger.error( e )
		}
	}

	protected async getDefaultAvatar(): Promise<string> {
		const key = 'bot:avatar'

		const stored = await redis.get( key )
		if ( stored ) {
			return stored
		}

		const { avatar, id } = await rest.get( Routes.user() ) as APIUser
		const url = `https://cdn.discordapp.com/avatars/${ id }/${ avatar ?? '' }.png`
		await redis.set( key, url )
		await redis.expire( key, 60 * 15 )

		return url
	}

	protected async getLastCheck(): Promise<Date> {
		const key = `wa:${ this.api }/last-check`
		const stored = parseInt( await redis.get( key ) ?? '', 10 )
		if ( isNaN( stored ) ) {
			return new Date( Date.now() - Time.Minute * 5 + Time.Second )
		} else {
			return new Date( stored + Time.Second )
		}
	}

	protected async getSitename(): Promise<string> {
		if ( !this.sitename ) {
			const siteinfo = await this.wiki.getSiteInfo( 'general' )
			this.sitename = siteinfo.query.general.sitename
		}
		return this.sitename
	}

	protected async getFavicon(): Promise<Buffer | null> {
		if ( this.favicon ) {
			return this.favicon
		}

		const faviconName = this.wiki.api.host.endsWith( 'fandom.com' )
			? 'Site-favicon.ico'
			: 'Favicon.ico'
		let url = this.wiki.getUrl( `Special:Redirect/file/${ faviconName }` ).href
		let redirect: string | undefined = url

		while ( redirect ) {
			url = redirect
			const { headers, statusCode } = await request( url, { method: 'HEAD' } )
			if ( statusCode > 400 ) return null

			redirect = Array.isArray( headers.location ) ? headers.location.at( 0 ) : headers.location
		}

		const { body, headers } = await request( url )
		const favicon = Buffer.from( await body.arrayBuffer() )
		if ( headers[ 'content-type' ] === 'image/x-icon' ) {
			return ico2png( favicon, 32 )
		} else {
			return favicon
		}
	}
}
