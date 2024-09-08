const RPC = require("./RPC");

const rpc = new RPC({ clientId: "1021392767403966464" });

rpc.connectIPC();

rpc.on("READY", () => {
    console.log("RPC ready! Let's get skibidi!");

    rpc.setActivity({
        name: "Skibidi Toilet Simulator 2024",
        type: 5,
        url: "https://www.youtube.com/watch?v=x1HMTr0mp8U",
        assets: {
            large_image: "skibidi2",
            large_text: "SKIBIDI"
        },
        flags: 1 << 1
    });
});

// rpc.on("ipc-message", console.log);