const EventEmitter = require('events');
const Client = require('@hkube/etcd');
const dbConnect = require('@hkube/db');
const Logger = require('@hkube/logger');
const { pipelineStatuses, pipelineTypes } = require('@hkube/consts');
const component = require('../consts/component-name').DB;

class DataStore extends EventEmitter {
    async init(options) {
        const log = Logger.GetLogFromContainer();
        const { etcd, serviceName } = options;
        this._etcd = new Client({ ...etcd, serviceName });
        const { provider, ...config } = options.db;
        this._db = dbConnect(config, provider);
        await this._db.init();
        await this._watchJobStatus();
        log.info(`initialized mongo with options: ${JSON.stringify(this._db.config)}`, { component });
    }

    getJob({ jobId }) {
        return this._db.jobs.fetch({ jobId, fields: { status: true, pipeline: true } });
    }

    createJob({ jobId, pipeline, status }) {
        return this._db.jobs.create({ jobId, pipeline, status });
    }

    getJobs({ status }) {
        return this._db.jobs.search({ pipelineStatus: status, fields: { jobId: true, pipeline: true } });
    }

    getConcurrentActiveJobs() {
        return this._db.jobs.search({
            types: pipelineTypes.STORED,
            exists: { 'options.concurrentPipelines.rejectOnFailure': false },
            hasResult: false,
            fields: {
                amount: 'pipeline.options.concurrentPipelines.amount',
                name: 'pipeline.name',
            }
        });
    }

    async getStoredPipelines({ pipelinesNames } = {}) {
        return this._db.pipelines.search({ pipelinesNames });
    }

    storeQueue(options) {
        return this._etcd.pipelineDrivers.queue.set(options);
    }

    async _watchJobStatus() {
        await this._db.jobs.watchStatus({}, (job) => {
            this.emit(`job-${job.status}`, job);
        });
    }

    setJobStatus(options) {
        return this._db.jobs.updateStatus(options);
    }

    setJobResults(options) {
        return this._db.jobs.updateResult(options);
    }
}

module.exports = new DataStore();
