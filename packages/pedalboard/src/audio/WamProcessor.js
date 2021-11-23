/**
 * @typedef {import('@webaudiomodules/api').WamProcessor} IWamProcessor
 * @typedef {import('@webaudiomodules/api').WamNodeOptions} WamNodeOptions
 * @typedef {import('@webaudiomodules/api').WamParameterInfoMap} WamParameterInfoMap
 * @typedef {import('@webaudiomodules/api').WamEvent} WamEvent
 * @typedef {import('@webaudiomodules/api').WamInfoData} WamInfoData
 * @typedef {import('@webaudiomodules/sdk-parammgr/src/TypedAudioWorklet').AudioWorkletGlobalScope} AudioWorkletGlobalScope
 */
//@ts-check

/**
 * @param {string} processorId
 */
const processor = (processorId) => {
	/** @type {AudioWorkletGlobalScope} */
	// @ts-ignore
	// eslint-disable-next-line no-undef
	const audioWorkletGlobalScope = globalThis;
	const { AudioWorkletProcessor, registerProcessor, webAudioModules } = audioWorkletGlobalScope;

	/**
	 * @implements {IWamProcessor}
	 */
	class WamProcessor extends AudioWorkletProcessor {
		/**
		 * @param {Omit<AudioWorkletNodeOptions, 'processorOptions'>
		 * & { processorOptions: WamNodeOptions & { pluginList: string[] } }} options
		 */
		constructor(options) {
			super(options);
			this.destroyed = false;
			const { instanceId, pluginList } = options.processorOptions;
			this.moduleId = processorId;
			this.instanceId = instanceId;
			/** @type {WamEvent[]} */
			this.eventQueue = [];
			/** @type {string[]} */
			this.pluginList = [];
			/** @type {Map<IWamProcessor, Set<IWamProcessor>[]>} */
			this._eventGraph = new Map();
			/** @type {Record<string, IWamProcessor>} */
			this._processors = {};

			audioWorkletGlobalScope.webAudioModules.create(this);

			this.updatePluginList(pluginList);

			this._messagePortRequestId = -1;
			/** @type {Record<number, ((...args: any[]) => any)>} */
			const resolves = {};
			/** @type {Record<number, ((...args: any[]) => any)>} */
			const rejects = {};
			/**
			 * @param {string} call
			 * @param {any} args
			 */
			this.call = (call, ...args) => new Promise((resolve, reject) => {
				const id = this._messagePortRequestId;
				this._messagePortRequestId -= 1;
				resolves[id] = resolve;
				rejects[id] = reject;
				this.port.postMessage({ id, call, args });
			});
			this.handleMessage = ({ data }) => {
				// eslint-disable-next-line object-curly-newline
				const { id, call, args, value, error } = data;
				if (call) {
					/** @type {any} */
					const r = { id };
					try {
						r.value = this[call](...args);
					} catch (e) {
						r.error = e;
					}
					this.port.postMessage(r);
				} else {
					if (error) {
						if (rejects[id]) rejects[id](error);
						delete rejects[id];
						return;
					}
					if (resolves[id]) {
						resolves[id](value);
						delete resolves[id];
					}
				}
			};
			this.port.start();
			this.port.addEventListener('message', this.handleMessage);
		}

		/**
		 * @param {string[]} pluginListIn
		 */
		updatePluginList(pluginListIn) {
			this.pluginList = pluginListIn;
		}

		/**
		 * @param {WamInfoData} data
		 */
		updateParameterInfo(data) {
			const { currentTime } = audioWorkletGlobalScope;
			this.emitEvents({ type: 'wam-info', data, time: currentTime });
		}

		/**
		 * @param {number} delay
		 */
		setCompensationDelay(delay) {
			this._compensationDelay = delay;
		}
		getCompensationDelay() {
			return this._compensationDelay;
		}

		/**
		 * @param {WamEvent[]} events
		 */
		scheduleEvents(...events) {
			this.eventQueue.push(...events);
		}

		/**
		 * @param {WamEvent[]} events
		 */
		emitEvents(...events) {
			this.call("eventEmitted", ...events);
			if (!this.pluginList.length) return;
			webAudioModules.emitEvents(this, ...events.filter((e) => e.type !== "wam-info"));
		}

		clearEvents() {
			this.eventQueue = [];
		}

		/**
		 * @param {string} toId
		 * @param {number} [output]
		 */
		connectEvents(toId, output) {
			webAudioModules.connectEvents(this.instanceId, toId, output);
		}

		/**
		 * @param {string} toId
		 * @param {number} [output]
		 */
		disconnectEvents(toId, output) {
			webAudioModules.disconnectEvents(this.instanceId, toId, output);
		}
		
		/**
		 * Main process
		 *
		 * @param {Float32Array[][]} inputs
		 * @param {Float32Array[][]} outputs
		 * @param {Record<string, Float32Array>} parameters
		 */
		// eslint-disable-next-line no-unused-vars
		process(inputs, outputs, parameters) {
			if (this.destroyed) return false;
			const { currentTime, sampleRate } = audioWorkletGlobalScope;
			let i = 0;
			/** @type {WamEvent[]} */
			const newEventQueue = [];
			/** @type {WamEvent[]} */
			const eventToEmit = [];
			while (i < this.eventQueue.length) {
				const event = this.eventQueue[i];
				const offsetSec = event.time - currentTime;
				const sampleIndex = offsetSec > 0 ? Math.round(offsetSec * sampleRate) : 0;
				if (sampleIndex < outputs[0][0].length) {
					eventToEmit.push(event);
					this.eventQueue.splice(i, 1);
					i = -1;
				} else {
					newEventQueue.push(event);
				}
				i++;
			}
			if (eventToEmit.length) this.emitEvents(...eventToEmit);
			this.eventQueue = newEventQueue;
			return true;
		}

		destroy() {
			audioWorkletGlobalScope.webAudioModules.destroy(this);
			this.destroyed = true;
			this.port.close();
		}
	}
	try {
		registerProcessor(processorId, WamProcessor);
	} catch (error) {
		// eslint-disable-next-line no-console
		console.warn(error);
	}
};

export default processor;
