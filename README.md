# AKAI MPC Studio 2

This is a script that will make the unit light up and give touch feedback using white color, while forwarding MIDI messages to virtual MIDI device.

## Demo

<video height="480" src="https://github.com/jfedyczak/akai-mpc-studio/assets/923346/61a9dd49-fe0e-429c-8735-e213d0c1e381"></video>

## How it works

1. Script looks for MIDI device named `MPC Studio MPC Public`
2. Script lights up pads
3. Script creates virtual MIDI device named `My Studio`
4. Script will listen for MIDI events from MPC Studio mk2, forward them to the virtual device and also issue CC/Sysex messages to change pads' color to white when pressed.

## How to use

You will need some recent [node.js](https://nodejs.org/en) version installed. Please install dependecies using (required only once):

```
npm install
```

Please run the script using:

```
node index.js
```

Please run your favourite software and select `My Studio` as MIDI device. You should see pads lit up and responding visually to touch events.

## Remarks

This is work in progress and experimental, so use at your own risk. I've tested it with [Addictive Drums 2](https://www.xlnaudio.com/products/addictive_drums_2) and it works ok.

## Credits

This would not be possible without:

- [MPC Studio MIDI Specs](https://github.com/bcrowe306/MPC-Studio-Mk2-Midi-Sysex-Charts)
