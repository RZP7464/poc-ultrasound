class GGWaveProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.buffer = [];
        this.bufferSize = 4096;
    }

    process(inputs) {
        const input = inputs[0];
        if (input && input[0]) {
            const samples = input[0];
            this.buffer.push(...samples);

            if (this.buffer.length >= this.bufferSize) {
                const chunk = this.buffer.slice(0, this.bufferSize);
                this.buffer = this.buffer.slice(this.bufferSize);
                this.port.postMessage(chunk);
            }
        }
        return true;
    }
}

registerProcessor('ggwave-processor', GGWaveProcessor);
