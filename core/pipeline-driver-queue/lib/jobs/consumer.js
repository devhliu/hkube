const { Consumer } = require('@hkube/producer-consumer');
const { tracer } = require('@hkube/metrics');
const { pipelineStatuses } = require('@hkube/consts');
const log = require('@hkube/logger').GetLogFromContainer();
const dataStore = require('../persistency/data-store');
const queueRunner = require('../queue-runner');
const { componentName } = require('../consts');
const component = componentName.JOBS_CONSUMER;

class JobConsumer {
    constructor() {
        this._consumer = null;
    }

    async init(options) {
        this._jobType = options.consumer.jobType;
        this._consumer = new Consumer({
            setting: {
                redis: options.redis,
                tracer,
                prefix: options.consumer.prefix
            }
        });
        this._consumer.register({
            job: {
                type: options.consumer.jobType,
                concurrency: options.consumer.concurrency
            }
        });
        this._consumer.on('job', (job) => {
            this._handleJob(job);
        });
        dataStore.on(`job-${pipelineStatuses.STOPPED}`, (job) => {
            const { jobId, status } = job;
            this._stopJob(jobId, status);
        });
        dataStore.on(`job-${pipelineStatuses.PAUSED}`, (job) => {
            const { jobId, status } = job;
            this._stopJob(jobId, status);
        });
    }

    async shutdown() {
        if (!this._isPaused && this._consumer) {
            this._isPaused = true;
            await this._consumer.pause({ type: this._jobType });
        }
    }

    async _handleJob(job) {
        try {
            const { jobId } = job.data;
            const jobData = await dataStore.getJob({ jobId });
            const { status, pipeline } = jobData || {};
            if (!pipeline) {
                throw new Error(`unable to find pipeline for job ${jobId}`);
            }
            if (status.status === pipelineStatuses.STOPPED || status.status === pipelineStatuses.PAUSED) {
                log.warning(`job arrived with state stop therefore will not added to queue ${jobId}`, { component });
                this._stopJob(jobId, status.status);
            }
            else {
                if (pipeline.maxExceeded) {
                    log.warning(`job "${jobId}" arrived with maxExceeded flag`, { component });
                }
                this._queueJob({ jobId, pipeline });
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

    _stopJob(jobId, status) {
        log.info(`job ${status} ${jobId}`, { component });
        queueRunner.preferredQueue.remove(jobId);
        queueRunner.queue.remove(jobId);
    }

    _queueJob({ jobId, pipeline }) {
        const job = this._pipelineToQueueAdapter({ jobId, pipeline });
        queueRunner.queue.enqueue(job);
    }

    _pipelineToQueueAdapter({ jobId, pipeline }) {
        return {
            jobId,
            experimentName: pipeline.experimentName,
            pipelineName: pipeline.name,
            priority: pipeline.priority,
            maxExceeded: pipeline.maxExceeded,
            entranceTime: Date.now(),
            tags: pipeline.tags || [],
            calculated: {
                latestScores: {}
            }
        };
    }
}

module.exports = new JobConsumer();
