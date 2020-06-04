interface AudioWorkletAudioParamDescriptor<P extends string = string> extends AudioParamDescriptor {
    automationRate?: AutomationRate;
    defaultValue?: number;
    maxValue?: number;
    minValue?: number;
    name: P;
}
declare interface AudioWorkletProcessor<T extends Record<string, any> = Record<string, any>, F extends Record<string, any> = Record<string, any>, P extends string = string, O extends any = any> {
    port: AudioWorkletMessagePort<T, F>;
    process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: { [key in P]: Float32Array }): boolean;
}
declare const AudioWorkletProcessor: {
    parameterDescriptors(): AudioWorkletAudioParamDescriptor[];
    new <T extends Record<string, any> = Record<string, any>, F extends Record<string, any> = Record<string, any>, P extends string = string, O extends any = any>(options: TypedAudioWorkletNodeOptions<O>): AudioWorkletProcessor<T, F, P, O>;
}

interface TypedAudioWorkletNodeOptions<T extends any = any> extends AudioWorkletNodeOptions {
    processorOptions?: T;
}
interface AudioWorkletMessageEvent<T extends any = any> extends MessageEvent {
    data: T;
}
interface AudioWorkletMessagePort<I extends { [key: string]: any } = { [key: string]: any }, O extends { [key: string]: any } = { [key: string]: any }> extends MessagePort {
    onmessage: ((this: MessagePort, ev: AudioWorkletMessageEvent<I>) => any) | null;
    onmessageerror: ((this: MessagePort, ev: AudioWorkletMessageEvent<I>) => any) | null;
    postMessage(message: O, transfer: Transferable[]): void
    postMessage(message: O, options?: PostMessageOptions): void
}
interface DataToProcessor {
    destroy: true;
}
type DisposableAudioParamMap<P extends string = string> = ReadonlyMap<P, AudioParam>;
declare interface DisposableAudioWorkletNode<
        F extends Record<string, any> = Record<string, any>,
        T extends Partial<DataToProcessor> & Record<string, any> = DataToProcessor,
        P extends string = string,
        O extends any = any
> extends AudioWorkletNode {
    port: AudioWorkletMessagePort<F, T & DataToProcessor>;
    parameters: DisposableAudioParamMap<P>;
    readonly options: TypedAudioWorkletNodeOptions<O>;
    destroyed: boolean;
    destroy(): void;
}
declare const DisposableAudioWorkletNode: {
    new <
        F extends Record<string, any> = Record<string, any>,
        T extends Partial<DataToProcessor> & Record<string, any> = DataToProcessor,
        P extends string = string,
        O extends any = any
    >(context: BaseAudioContext, name: string, options?: TypedAudioWorkletNodeOptions<O>): DisposableAudioWorkletNode<F, T, P, O>;
}
declare class AudioWorkletRegister {
    /**
	 * Register a AudioWorklet processor in a closure,
     * sending to AudioWorkletProcessor with an unique identifier
     * avoiding double registration
     *
     * @param {string} processorId if duplicated, the processor will not be readded.
     * @param {(id: string, ...injections: any[]) => void} processor a serializable function that contains an AudioWorkletProcessor
     * with its registration in the AudioWorkletGlobalScope
     * @param {AudioWorklet} audioWorklet AudioWorklet instance
     * @param {...any[]} injection this will be serialized and injected to the `processor` function
     * @returns {Promise<void>} a Promise<void>
     */
    static register(processorId: string, processor: (id: string, ...injections: any[]) => void, audioWorklet: AudioWorklet, ...injection: any[]): Promise<void>
}
interface AudioWorkletGlobalScope {
    registerProcessor: <T extends AudioWorkletProcessor>(name: string, constructor: AudioWorkletProcessorConstructor<T>) => void;
    currentFrame: number;
    currentTime: number;
    sampleRate: number;
    AudioWorkletProcessor: AudioWorkletProcessor;
    WebAudioPlugins: Record<string, AudioWorkletProcessor>;
    WebAudioPluginParams: Record<string, {
        internalParams: string[];
        lock: Int32Array;
        paramsBuffer: Float32Array;
        inputs: Float32Array[];
        outputs: Float32Array[];
        frame: number;
    }>
}
