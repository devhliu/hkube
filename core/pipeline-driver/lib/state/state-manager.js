const EventEmitter = require('events');
const Etcd = require('etcd.hkube');

class StateManager extends EventEmitter {

    constructor() {
        super();
    }

    init({ serviceName, etcd }) {
        this._etcd = new Etcd();
        this._etcd.init({ etcd, serviceName });
        this._etcd.discovery.register({ serviceName });
        this._watch();
    }

    setCurrentJob(job) {
        this._job = job;
    }

    _watch() {
        this._etcd.tasks.on('change', (res) => {
            this.emit('task-change', res);
        });

        this._etcd.jobs.on('change', (res) => {
            this.emit('job-change', res);
        });
    }

    async getTaskState(options) {
        return await this._etcd.services.pipelineDriver.getTaskState(options);
    }

    async setTaskState(options) {
        return await this._etcd.services.pipelineDriver.setTaskState({ jobId: this._job.id, taskId: options.taskId, data: options.data });
    }

    async setJobResults(options) {
        return await this._etcd.jobResults.setResults({ jobId: this._job.id, data: { result: options.result } });
    }

    async setJobStatus(options) {
        return await this._etcd.jobResults.setStatus({ jobId: this._job.id, data: options });
    }

    async getState() {
        const options = { jobId: this._job.id };
        const driver = await this._etcd.services.pipelineDriver.getState(options);
        if (driver) {
            const driverTasks = await this._etcd.services.pipelineDriver.getDriverTasks(options);
            const jobTasks = await this._etcd.tasks.list(options);
            const result = Object.assign({}, driver);
            result.driverTasks = driverTasks || [];
            result.jobTasks = jobTasks || new Map();
            return result;
        }
        return null;
    }

    async setState(options) {
        await this._etcd.services.pipelineDriver.setState({ jobId: this._job.id, data: options.data });
    }

    async deleteState(options) {
        return await this._etcd.services.pipelineDriver.deleteState(options);
    }

    async getExecution(options) {
        return await this._etcd.execution.getExecution(options);
    }

    async watchTask(options) {
        return await this._etcd.tasks.watch({ jobId: this._job.id, taskId: options.taskId });
    }

    async unWatchTask(options) {
        return await this._etcd.tasks.unwatch({ jobId: this._job.id, taskId: options.taskId });
    }

    async watchJobState() {
        return await this._etcd.jobs.watch({ jobId: this._job.id });
    }

    async unWatchJobState() {
        return await this._etcd.jobs.unwatch({ jobId: this._job.id });
    }
}

module.exports = new StateManager();