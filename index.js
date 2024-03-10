// based on https://github.com/bcrowe306/MPC-Studio-Mk2-Midi-Sysex-Charts

const fs = require("fs");

const config = JSON.parse(fs.readFileSync("settings.json", "utf8"));

config.colors = config.colors.map((color) => ({
  r: parseInt(color.substr(0, 2), 16),
  g: parseInt(color.substr(2, 2), 16),
  b: parseInt(color.substr(4, 2), 16),
}));

const MONO_LED_OFF = 0;
const MONO_LED_DIM = 1;
const MONO_LED_ON = 2;

const COLOR_LED_OFF = 0;
const COLOR_1_DIM = 1;
const COLOR_2_DIM = 2;
const COLOR_1_ON = 3;
const COLOR_2_ON = 4;

const EVENT_PAD_PRESSED = 153;
const EVENT_PAD_RELEASED = 137;

const midi = require("midi");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const PAD_NOTES = [
  37, 36, 42, 82, 40, 38, 46, 44, 48, 47, 45, 43, 49, 55, 51, 53,
];
const NOTE_TO_PAD = new Map(PAD_NOTES.map((note, index) => [note, index]));

const BUTTON_FULL_LEVEL = 39;

class AkaiMPCStudio {
  constructor(midiName) {
    this.state = {
      fullLevel: false,
    };
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
    let forwardMessage = [message[0], message[1], message[2]];
    if (message[0] === EVENT_PAD_PRESSED) {
      const pad = NOTE_TO_PAD.get(message[1]);
      this.setPadColor(pad, 127, 127, 127);
      if (this.state.fullLevel) {
        forwardMessage[2] = 127;
        console.log(forwardMessage);
      }
    } else if (message[0] === EVENT_PAD_RELEASED) {
      if (message[2] === 0) {
        const pad = NOTE_TO_PAD.get(message[1]);
        this.setPadColorFromConfig(pad);
      } else {
        if (this.state.fullLevel) {
          console.log("why");
          forwardMessage = null;
        }
      }
    } else if (message[0] === 169) {
      if (this.state.fullLevel) {
        forwardMessage = null;
      }
    } else if (message[0] === 144) {
      if (this.buttonPressed(message[1])) {
        forwardMessage = null;
      }
    } else if (message[0] === 128) {
      if (this.buttonReleased(message[1])) {
        forwardMessage = null;
      }
    }
    if (forwardMessage) {
      this.virtual.sendMessage(forwardMessage);
      console.log(`m: ${forwardMessage} d: ${deltaTime}`);
    } else {
      console.log(" -- skipped");
    }
  }

  buttonReleased(button) {
    if (button === BUTTON_FULL_LEVEL) {
      this.state.fullLevel = !this.state.fullLevel;
      this.setButtonColor(
        BUTTON_FULL_LEVEL,
        this.state.fullLevel ? COLOR_2_ON : COLOR_1_DIM
      );
      return true;
    }
    return false;
  }

  buttonPressed(button) {
    if (button === BUTTON_FULL_LEVEL) {
      return true;
    }
    return false;
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

  setPadColorFromConfig(pad) {
    const color = config.colors[pad];
    this.setPadColor(pad, color.r, color.g, color.b);
  }

  reset() {
    for (let pad = 0; pad < 16; pad++) {
      this.setPadColor(pad, 0, 0, 0);
    }

    this.setButtonColor(BUTTON_FULL_LEVEL, MONO_LED_OFF);
  }

  async initPads() {
    for (let pad = 0; pad < 16; pad++) {
      this.setPadColorFromConfig(pad);
      await delay(50);
    }
    this.setButtonColor(BUTTON_FULL_LEVEL, MONO_LED_DIM);
  }
}
const AKAI_PORT_NAME = "MPC Studio MPC Public";

const start = async () => {
  const akai = new AkaiMPCStudio(AKAI_PORT_NAME);

  await akai.initPads();
};
start();
