import { queue, redis } from './lib'
import { Time } from '@sapphire/duration'
import { type Job, Worker } from 'bullmq'
import { ActivityTask, ScheduleTask } from './tasks'

void ( async () => {
	await queue.add( 'schedule', null, {
		repeat: {
			every: Time.Minute
		}
	} )

	new Worker( queue.name, async ( job: Job ) => {
		if ( job.name === 'schedule' ) {
			await new ScheduleTask( job ).run()
		} else {
			await new ActivityTask( job ).run()
		}
	}, { concurrency: 1, connection: redis } )
} )()
