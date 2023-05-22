import type { RecentChangesItem } from '@quority/activity'
import { EmbedBuilder } from '@discordjs/builders'
import { hyperlink } from '@discordjs/formatters'
import type { TFunction } from 'i18next'
import { ActivityFormatter } from './ActivityFormatter'

export class RecentChangesFormatter extends ActivityFormatter<RecentChangesItem> {
	public createEmbed( item: RecentChangesItem, t: TFunction ): EmbedBuilder {
		const embed = new EmbedBuilder()

		const { anon } = item.data as unknown as {
			anon: boolean
		}
		const userUrl = this.getUrl( anon ? `Special:Contributions/${ item.data.user }` : `User:${ item.data.user }` )
		const user = hyperlink( item.data.user, userUrl )

		const pageUrl = this.getUrl( item.data.title )
		const page = hyperlink( item.data.title, pageUrl )

		const sizediff = item.sizediff < 0 ? `- ${ Math.abs( item.sizediff ) }` : `+ ${ item.sizediff }`
		const diffUrl = this.wiki.getUrl( '' )
		diffUrl.searchParams.set( 'diff', `${ item.data.revid }` )
		const diff = hyperlink( sizediff, diffUrl )

		const i18nKey = item.data.type === 'edit' ? 'edited' : 'created'
		const description = t( `general:rc-${ i18nKey }`, {
			replace: {
				diff,
				page,
				user
			}
		} )
		embed.setDescription( description )

		const { comment } = item.data as unknown as { comment?: string }
		if ( comment ) {
			embed.addFields( {
				name: t( 'general:rc-summary' ),
				value: comment
			} )
		}

		embed.setFooter( {
			text: ` • ${ item.data.revid }`
		} )
		embed.setTimestamp( item.date )
		return embed
	}
}
