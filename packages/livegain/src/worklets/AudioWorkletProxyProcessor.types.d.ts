import { PromisifiedFunctionMap, TypedAudioWorkletProcessor, MessagePortRequest, MessagePortResponse, TypedAudioWorkletNodeOptions } from "@webaudiomodules/sdk-parammgr";

export type AudioWorkletProxyProcessor<IProcessor extends {} = {}, INode extends {} = {}, Par extends string = string> = PromisifiedFunctionMap<INode> & TypedAudioWorkletProcessor<MessagePortRequest<IProcessor> & MessagePortResponse<INode>, MessagePortResponse<IProcessor> & MessagePortRequest<INode>, Par> & { _disposed: boolean };
export const AudioWorkletProxyProcessor: {
    fnNames: string[];
    prototype: AudioWorkletProxyProcessor;
    new <IProcessor extends {} = {}, INode extends {} = {}, Par extends string = string, Opt = any>(options?: TypedAudioWorkletNodeOptions<Opt>): AudioWorkletProxyProcessor<IProcessor, INode, Par>;
};
