const { pipelineTypes } = require('@hkube/consts');
const { InvalidDataError } = require('../errors');
const stateManager = require('../state/state-manager');

class ApiValidator {
    constructor(validator) {
        this._validator = validator;
    }

    validateRunRawPipeline(pipeline) {
        this._validator.validate(this._validator.definitions.pipeline, pipeline, false, { validateNodes: false, checkFlowInput: true });
    }

    validateRunStoredPipeline(pipeline) {
        this._validator.validate(this._validator.definitions.pipeline, pipeline, false);
    }

    validateCaching(request) {
        this._validator.validate(this._validator.definitions.caching, request, false);
    }

    validateRerun(request) {
        this._validator.validate(this._validator.definitions.rerun, request, false);
    }

    validateSearch(request) {
        this._validator.validate(this._validator.definitions.searchJobs, request, true);
    }

    validateExecAlgorithmRequest(request) {
        this._validator.validate(this._validator.definitions.execAlgorithmRequest, request, false);
    }

    addPipelineDefaults(pipeline) {
        this._validator.addDefaults(this._validator.definitions.pipeline, pipeline);
    }

    validatePipeline(pipeline, options = {}) {
        this._validator.validate(this._validator.definitions.pipeline, pipeline, false, { checkFlowInput: true, ...options });
    }

    async validateConcurrentPipelines(pipeline, types) {
        let current;
        let max;
        let maxExceeded;
        if (types.includes(pipelineTypes.STORED) && pipeline.options?.concurrentPipelines) {
            const { experimentName, name: pipelineName } = pipeline;
            const { amount, rejectOnFailure } = pipeline.options.concurrentPipelines;
            const result = await stateManager.searchJobs({
                experimentName,
                pipelineName,
                pipelineType: pipelineTypes.STORED,
                hasResult: false,
                fields: { jobId: true },
                exists: { 'pipeline.options.concurrentPipelines': true },
            });
            if (result.length >= amount) {
                if (rejectOnFailure) {
                    throw new InvalidDataError(`maximum number [${amount}] of concurrent pipelines has been reached`);
                }
                maxExceeded = true;
            }
            else {
                maxExceeded = false;
            }
            current = result.length;
            max = amount;
        }
        return { current, max, maxExceeded };
    }

    validateStopPipeline(pipeline) {
        this._validator.validate(this._validator.definitions.stopRequest, pipeline, true);
    }
}

module.exports = ApiValidator;
