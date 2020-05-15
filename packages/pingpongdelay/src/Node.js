/* eslint-disable no-underscore-dangle */
import { CompositeAudioNode } from 'sdk';

// name is not so important here, the file Node.js is imported
// Normally the class does no need to be exported as
// an async mehod createNode is expored at the end of this
// file.
export default class PingPongDelayNode extends CompositeAudioNode {
	// plugin is an instance of he class that exends WebAudioPlugin
	// this instance is he plugin as an Observable
	// options is an extra container that could be ussed to indicate
	// the number of inputs and outputs...
	constructor(audioContext, options) {
		super(audioContext, options);
		super.setup();
	}

	/*  #########  Personnal code for the web audio graph  #########   */
	createNodes() {
		super.createNodes();
		this.delayNodeLeft = this.context.createDelay();
		this.delayNodeRight = this.context.createDelay();
		this.dryGainNode = this.context.createGain();
		this.wetGainNode = this.context.createGain();
		this.feedbackGainNode = this.context.createGain();
		this.channelMerger = this.context.createChannelMerger(2);
	}

	connectNodes() {
		super.connectNodes();
		// dry mix
		this._input.connect(this.dryGainNode);
		// dry mix out
		this.dryGainNode.connect(this._output);

		// the feedback loop
		this.delayNodeLeft.connect(this.channelMerger, 0, 0);
		this.delayNodeRight.connect(this.channelMerger, 0, 1);

		this.feedbackGainNode.connect(this.delayNodeLeft);
		this.delayNodeRight.connect(this.feedbackGainNode);

		this.delayNodeLeft.connect(this.delayNodeRight);

		// wet mix
		this._input.connect(this.feedbackGainNode);

		// wet out
		this.channelMerger.connect(this.wetGainNode);
		this.wetGainNode.connect(this._output);
	}

	isEnabled = true;

	set status(_sig) {
		if (this.isEnabled === _sig) return;
		this.isEnabled = _sig;
		if (_sig) {
			this._input.disconnect(this._output);
			this._input.connect(this.feedbackGainNode);
			this._input.connect(this.dryGainNode);
		} else {
			this._input.disconnect(this.feedbackGainNode);
			this._input.disconnect(this.dryGainNode);
			this._input.connect(this._output);
		}
	}
}
