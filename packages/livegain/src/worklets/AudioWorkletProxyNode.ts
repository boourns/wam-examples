import { TypedMessageEvent, MessagePortResponse, MessagePortRequest } from "@webaudiomodules/sdk-parammgr";
import { AudioWorkletProxyNode } from "./AudioWorkletProxyNode.types";

const Node = class extends AudioWorkletNode {
    static fnNames: string[] = [];
    _disposed = false;
    constructor(context: AudioContext, name: string, options?: AudioWorkletNodeOptions) {
        super(context, name, options);
        const resolves: Record<number, ((...args: any[]) => any)> = {};
        const rejects: Record<number, ((...args: any[]) => any)> = {};
        const handleDisposed = () => {
            this.port.removeEventListener("message", handleMessage);
            this.port.close();
        };
        const handleMessage = async (e: TypedMessageEvent<MessagePortResponse & MessagePortRequest>) => {
            const { id, call, args, value, error } = e.data;
            if (call) {
                const r: MessagePortResponse = { id };
                try {
                    r.value = await (this as any)[call](...args);
                } catch (e) {
                    r.error = e;
                }
                this.port.postMessage(r);
                if (this._disposed) handleDisposed();
            } else {
                if (error) rejects[id]?.(error);
                else if (resolves[id]) resolves[id]?.(value);
                delete resolves[id];
                delete rejects[id];
            }
        };
        // eslint-disable-next-line
        const call = (call: string, ...args: any[]) => {
            return new Promise<any>((resolve, reject) => {
                const id = performance.now();
                resolves[id] = resolve;
                rejects[id] = reject;
                this.port.postMessage({ id, call, args });
            });
        };
        const Ctor = (this.constructor as typeof AudioWorkletProxyNode);
        Ctor.fnNames.forEach(name => (this as any)[name] = (...args: any[]) => call(name, ...args));
        this.port.start();
        this.port.addEventListener("message", handleMessage);
    }
} as typeof AudioWorkletProxyNode;

export default Node;
