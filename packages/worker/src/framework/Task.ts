import type { Job } from 'bullmq'
import Logger from '@bitomic/logger'

export abstract class Task {
	protected job: Job
	protected logger: typeof Logger
	public readonly name: string

	public constructor( name: string, job: Job ) {
		this.job = job
		this.name = name
		this.logger = Logger.child( { label: this.name } )
	}

	public abstract run( job: Job ): Promise<void>
}
