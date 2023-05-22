import { type ActivityItem, getActivity } from '@quority/activity'
import i18next, { type InitOptions } from 'i18next'
import type { EmbedBuilder } from '@discordjs/builders'
import type { Wiki } from '@quority/core'
import { type ActivityFormatter, DiscussionsFormatter, LogEventsFormatter, RecentChangesFormatter } from './activity-formatters'
import path from 'path'
import Backend, { type FsBackendOptions } from 'i18next-fs-backend'
import { lstatSync, readdirSync } from 'fs'
import { ProfileType } from '@arlecchino/prisma'

let i18nInitialized = false

export interface ActivityManagerOptions {
	from: Date
	to: Date
	wiki: Wiki
}

export class ActivityManager {
	protected activity: ActivityItem[] | null = null
	protected formatters: Record<'discussions' | 'logevents' | 'recentchanges', ActivityFormatter<ActivityItem>>
	protected from: Date
	protected language = 'en'
	protected to: Date
	protected readonly wiki: Wiki

	public constructor( options: ActivityManagerOptions ) {
		this.from = options.from
		this.to = options.to
		this.wiki = options.wiki
		this.formatters = {
			discussions: new DiscussionsFormatter( this.wiki ),
			logevents: new LogEventsFormatter( this.wiki ),
			recentchanges: new RecentChangesFormatter( this.wiki )
		}
	}

	protected async initI18n(): Promise<void> {
		if ( i18nInitialized ) return

		i18next.use( Backend )
		await i18next.init( {
			backend: {
				loadPath: path.resolve( __dirname, '../locales/{{lng}}/{{ns}}.json' )
			},
			defaultNS: 'general',
			fallbackLng: 'en',
			initImmediate: false,
			interpolation: {
				escapeValue: false
			},
			load: 'all',
			ns: 'general',
			partialBundledLanguages: true,
			preload: readdirSync( path.join( __dirname, '../locales' ) ).filter( filename => {
				const filepath = path.join( __dirname, '../locales', filename )
				const isDirectory = lstatSync( filepath ).isDirectory()
				return isDirectory
			} )
		} as InitOptions<FsBackendOptions> )

		i18nInitialized = true
	}

	public async loadActivity(): Promise<number> {
		if ( this.activity !== null ) return 0

		this.activity = await getActivity( this.wiki, this.from, this.to )
		return this.activity.length
	}

	public setLanguage( lang: string ): void {
		this.language = lang
	}

	public async *generateEmbeds(): AsyncIterableIterator<{ embed: EmbedBuilder, profileType: ProfileType }> {
		await this.loadActivity()
		await this.initI18n()

		for ( const item of this.activity ?? [] ) {
			const [ embed, profileType ] = this.createEmbed( item ) ?? []

			if ( embed && profileType ) {
				yield { embed, profileType }
			}
		}
	}

	protected createEmbed( item: ActivityItem ): [ EmbedBuilder, ProfileType ] | null {
		const t = i18next.getFixedT( this.language )

		if ( item.isDiscussions() ) {
			return [ this.formatters.discussions.createEmbed( item, t ), ProfileType.Discussions ]
		} else if ( item.isLogEvents() ) {
			return [ this.formatters.logevents.createEmbed( item, t ), ProfileType.LogEvents ]
		} else if ( item.isRecentChanges() ) {
			return [ this.formatters.recentchanges.createEmbed( item, t ), ProfileType.RecentChanges ]
		}

		return null
	}
}
