// based on https://github.com/bcrowe306/MPC-Studio-Mk2-Midi-Sysex-Charts

const MONO_LED_OFF = 0;
const MONO_LED_DIM = 1;
const MONO_LED_ON = 2;

const midi = require("midi");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const PAD_NOTES = [
  37, 36, 42, 82, 40, 38, 46, 44, 48, 47, 45, 43, 49, 55, 51, 53,
];
const NOTE_TO_PAD = new Map(PAD_NOTES.map((note, index) => [note, index]));

class AkaiMPCStudio {
  constructor(midiName) {
    this.input = new midi.Input();
    this.output = new midi.Output();

    this.virtual = new midi.Output();

    const inputPorts = [];
    const outputPorts = [];

    for (let i = 0; i < this.input.getPortCount(); i++) {
      inputPorts.push(this.input.getPortName(i));
    }

    for (let i = 0; i < this.output.getPortCount(); i++) {
      outputPorts.push(this.output.getPortName(i));
    }

    const AKAI_INPUT_PORT = inputPorts.indexOf(midiName);
    const AKAI_OUTPUT_PORT = outputPorts.indexOf(midiName);

    if (AKAI_INPUT_PORT === -1 || AKAI_OUTPUT_PORT === -1) {
      console.log(`Could not find ${midiName} port`);
      process.exit(1);
    }

    console.log(` -- found ${midiName} port at index ${AKAI_INPUT_PORT}`);

    this.input.openPort(AKAI_INPUT_PORT);
    this.output.openPort(AKAI_OUTPUT_PORT);

    this.messageHandler = this.messageHandler.bind(this);
    this.shutdown = this.shutdown.bind(this);

    process.on("SIGINT", this.shutdown);

    this.input.on("message", this.messageHandler);

    this.reset();

    this.virtual.openVirtualPort("My Studio");
  }

  shutdown() {
    this.reset();
    this.input.closePort();
    this.output.closePort();
    this.virtual.closePort();
  }

  messageHandler(deltaTime, message) {
    this.virtual.sendMessage(message);
    if (message[0] === 153) {
      // pad pressed
      const pad = NOTE_TO_PAD.get(message[1]);
      this.setPadColor(pad, 127, 127, 127);
    } else if ((message[0] = 137 && message[2] === 0)) {
      // pad released
      const pad = NOTE_TO_PAD.get(message[1]);
      this.setPadColor(pad, 31, 0, 63);
    }
    console.log(`m: ${message} d: ${deltaTime}`);
  }

  sendMessage(message) {
    this.output.sendMessage(message);
  }

  setButtonColor(button, color) {
    this.sendMessage([0xb0, button, color]);
  }

  setPadColor(pad, r, g, b) {
    this.sendMessage([
      0xf0,
      0x47,
      0x47,
      0x4a,
      0x65,
      0x00,
      0x04,
      pad,
      r,
      g,
      b,
      0xf7,
    ]);
  }

  reset() {
    for (let pad = 0; pad < 16; pad++) {
      this.setPadColor(pad, 0, 0, 0);
    }
  }

  async initPads() {
    for (let pad = 0; pad < 16; pad++) {
      for (let c = 0; c < 64; c += 4) {
        this.setPadColor(pad, c / 2, 0, c);
        await delay(3);
      }
      this.setPadColor(pad, 31, 0, 63);
    }
  }
}
const AKAI_PORT_NAME = "MPC Studio MPC Public";

const start = async () => {
  const akai = new AkaiMPCStudio(AKAI_PORT_NAME);

  await akai.initPads();
};
start();
