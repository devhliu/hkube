const isEqual = require('lodash.isequal');
const { Events, Producer } = require('@hkube/producer-consumer');
const { tracer } = require('@hkube/metrics');
const log = require('@hkube/logger').GetLogFromContainer();
const { componentName, jobState } = require('../consts');
const component = componentName.JOBS_PRODUCER;
const persistence = require('../persistency/persistence');
const queueRunner = require('../queue-runner');

class JobProducer {
    constructor() {
        this._lastData = null;
        this._pendingAmount = 0;
        this._checkQueue = this._checkQueue.bind(this);
        this._updateState = this._updateState.bind(this);
    }

    async init(options) {
        this._jobType = options.producer.jobType;
        this._producer = new Producer({ setting: { redis: options.redis, prefix: options.producer.prefix, tracer } });
        this._producer._createQueue(this._jobType);
        this._checkQueueInterval = options.checkQueueInterval;
        this._updateStateInterval = options.updateStateInterval;

        this._producerEventRegistry();
        this._checkQueue();
        this._updateState();
    }

    async _checkQueue() {
        try {
            if (this._pendingAmount === 0 && queueRunner.queue.get.length > 0) {
                await this.createJob();
            }
        }
        catch (error) {
            log.error(error.message, { component });
        }
        finally {
            setTimeout(this._checkQueue, this._checkQueueInterval);
        }
    }

    async _updateState() {
        try {
            const queue = [...queueRunner.queue.get];
            if (!isEqual(queue, this._lastData)) {
                await queueRunner.queue.persistenceStore(queue);
                this._lastData = queue;
            }
        }
        catch (error) {
            log.error(error.message, { component });
        }
        finally {
            setTimeout(this._updateState, this._updateStateInterval);
        }
    }

    _producerEventRegistry() {
        this._producer.on(Events.WAITING, (data) => {
            this._pendingAmount++;
            log.info(`${Events.WAITING} ${data.jobID}`, { component, jobId: data.jobID, status: jobState.WAITING });
        }).on(Events.ACTIVE, (data) => {
            this._pendingAmount--;
            queueRunner.queue.dequeue();
            log.info(`${Events.ACTIVE} ${data.jobID}`, { component, jobId: data.jobID, status: jobState.ACTIVE });
        }).on(Events.COMPLETED, (data) => {
            log.info(`${Events.COMPLETED} ${data.jobID}`, { component, jobId: data.jobID, status: jobState.COMPLETED });
        }).on(Events.FAILED, (data) => {
            log.error(`${Events.FAILED} ${data.jobID}, ${data.error}`, { component, jobId: data.jobId, status: jobState.FAILED });
        }).on(Events.STALLED, (data) => {
            this._pendingAmount++;
            log.error(`${Events.STALLED} ${data.jobID}`, { component, jobId: data.jobId, status: jobState.STALLED });
        }).on(Events.CRASHED, (data) => {
            const { jobId, pipeline, error } = data.options;
            const status = jobState.FAILED;
            log.error(`${Events.CRASHED} ${jobId}`, { component, jobId, status });
            persistence.setJobStatus({ jobId, pipeline, status, error, level: 'error' });
            persistence.setJobResults({ jobId, pipeline, status, error });
        });
    }

    _pipelineToJob(pipeline) {
        return {
            job: {
                id: pipeline.jobId,
                type: this._jobType,
                data: {
                    jobId: pipeline.jobId,
                    pipeline: pipeline.pipelineName
                }
            },
            tracing: {
                parent: pipeline.spanId,
                tags: {
                    jobID: pipeline.jobId,
                }
            }
        };
    }

    async createJob() {
        const pipeline = queueRunner.queue.peek();
        log.debug(`creating new job ${pipeline.jobId}, calculated score: ${pipeline.score}`, { component });
        const job = this._pipelineToJob(pipeline);
        await this._producer.createJob(job);
    }
}

module.exports = new JobProducer();
