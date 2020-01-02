const { Consumer } = require('@hkube/producer-consumer');
const { tracer } = require('@hkube/metrics');
const log = require('@hkube/logger').GetLogFromContainer();
const persistence = require('../persistency/persistence');
const queueRunner = require('../queue-runner');
const { jobState } = require('../consts');
const { componentName } = require('../consts');
const component = componentName.JOBS_CONSUMER;

class JobConsumer {
    constructor() {
        this._consumer = null;
    }

    async init(options) {
        this._consumer = new Consumer({
            setting: {
                redis: options.redis,
                tracer,
                prefix: options.consumer.prefix
            }
        });
        this._consumer.register({ job: { type: options.consumer.jobType, concurrency: options.consumer.concurrency } });
        this._consumer.on('job', (job) => {
            this._handleJob(job);
        });
        persistence.on(`job-${jobState.STOPPED}`, async (job) => {
            const { jobId, status } = job;
            await this._stopJob(jobId, status);
        });
        persistence.on(`job-${jobState.PAUSED}`, async (job) => {
            const { jobId, status } = job;
            await this._stopJob(jobId, status);
        });
    }

    async _handleJob(job) {
        try {
            const { jobId, spanId } = job.data;
            const pipeline = await persistence.getExecution({ jobId });
            if (!pipeline) {
                throw new Error(`unable to find pipeline for job ${jobId}`);
            }
            const jobStatus = await persistence.getJobStatus({ jobId });
            if (jobStatus.status === jobState.STOPPED || jobStatus.status === jobState.PAUSED) {
                log.warning(`job arrived with state stop therefore will not added to queue ${jobId}`, { component });
                await this._stopJob(jobId, jobStatus.status);
            }
            else {
                await this._queueJob(pipeline, jobId, spanId);
            }
        }
        catch (error) {
            log.error(error.message, { component }, error);
            job.done(error);
        }
        finally {
            job.done();
        }
    }

    async _stopJob(jobId, status) {
        log.info(`job ${status} ${jobId}`, { component });
        queueRunner.queue.remove(jobId);
    }

    async _queueJob(pipeline, jobId, spanId) {
        const job = this._pipelineToQueueAdapter(pipeline, jobId, spanId);
        queueRunner.queue.enqueue(job);
    }

    _pipelineToQueueAdapter(pipeline, jobId, spanId) {
        return {
            jobId,
            spanId,
            pipelineName: pipeline.name,
            priority: pipeline.priority,
            entranceTime: Date.now(),
            calculated: {
                latestScores: {}
            }
        };
    }
}

module.exports = new JobConsumer();
