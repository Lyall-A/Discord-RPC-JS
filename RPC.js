const net = require("net");
const crypto = require("crypto");

class RPC {
    constructor(options = { }) {
        this._listeners = [];
        this._options = options;
    }

    // TODO: make decent
    async connectIPC() {
        return new Promise((resolve, reject) => {
            this._connection = net.createConnection({ path: this.ipcPath });
            this._connection.on("connect", () => {
                this.call("ipc-connect");
                this.sendHandshake();
                resolve();
            });
            this._connection.on("data", data => {
                const decoded = this.decode(data);
                this.call("ipc-message", decoded);
                if (decoded.json?.cmd) this.call(decoded.json.cmd, decoded);
                if (decoded.json?.evt) this.call(decoded.json.evt, decoded);
            });
        });
    }

    on(event, callback) {
        this._listeners.push({ event, callback });
    }

    once(event, callback) {
        this._listeners.push({ event, callback, once: true });
    }

    call(event, ...args) {
        this._listeners.filter(i => i.event === event).forEach((listener, index) => {
            listener.callback(...args);
            if (listener.once) this._listeners.splice(index, 1);
        });
    }

    encode(op, data) {
        const dataString = JSON.stringify(data);
        const packet = Buffer.alloc(Buffer.byteLength(dataString) + 8);
        packet.writeInt32LE(op, 0);
        packet.writeInt32LE(Buffer.byteLength(dataString), 4);
        packet.write(dataString, 8);
        return packet;
    }

    decode(data) {
        const raw = data.slice(8);
        const string = raw.toString();
        let json = null;
        try { json = JSON.parse(string) } catch (err) {  }
        return {
            op: data.readInt32LE(0),
            length: data.readInt32LE(4),
            raw,
            string,
            json
        }
    }

    generateNonce() {
        return crypto.randomUUID();
    }

    sendHandshake() {
        this._connection.write(this.encode(this.opCodes.HANDSHAKE, {
            v: 1,
            client_id: this._options.clientId
        }));
    }

    sendCommand(cmd, args) {
        this._connection.write(this.encode(this.opCodes.FRAME, {
            cmd,
            args,
            nonce: this.generateNonce()
        }));
    }

    opCodes = {
        HANDSHAKE: 0,
        FRAME: 1,
        CLOSE: 2,
        PING: 3,
        PONG: 4,
    }
    ipcPath = this._options?.ipcPath || process.platform === "win32" ? "\\\\?\\pipe\\discord-ipc-0" : `/run/user/${process.getuid ? process.getuid() : 1000}/discord-ipc-0`;

    // RPC stuff
    setActivity(activity) {
        this.sendCommand("SET_ACTIVITY", {
            pid: process.pid,
            activity
        });
    }
}

module.exports = RPC;