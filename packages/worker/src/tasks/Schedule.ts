import type { Job } from 'bullmq'
import { Task } from '../framework'
import { prisma, queue } from '../lib'
import { Time } from '@sapphire/duration'

export class ScheduleTask extends Task {
	public constructor( job: Job ) {
		super( 'scheduler', job )
	}

	public async run(): Promise<void> {
		const wikis = ( await prisma.configuration.groupBy( {
			by: [ 'wiki' ]
		} ) ).map( i => i.wiki )

		for ( const wiki of wikis ) {
			const normalized = wiki.replace( /[^a-z0-9]/g, '' )
			await queue.add( normalized, wiki, {
				repeat: {
					every: Time.Second * 20
				}
			} )
		}
	}
}
