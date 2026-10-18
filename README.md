# DFR1216 MakeCode extension

MakeCode (micro:bit) extension for the DFRobot
[DFR1216 Multi-Function Expansion Board (Power & Motion)](https://www.dfrobot.com/product-2974.html).

> **Community extension.** This is not an official DFRobot product and is not
> affiliated with or endorsed by DFRobot. "DFRobot" and "DFR1216" are used only to
> name the hardware this extension works with.

The board has a co-processor on I2C address `0x33` (P19/P20). This extension
ports the protocol of the official
[DFRobot_UnihikerExpansion](https://github.com/dfrobot/DFRobot_UnihikerExpansion) library.

The board needs its own power (18650 battery or USB-C IN, PWR switch on).

## Blocks

- **RGB LED**: set LED0/LED1/all to a colour, brightness, off
- **Servo**: S0–S5 angle (0–180°), 360° servo speed/direction, raw pulse, period
- **Motor**: M1–M4 / all forward/backward with speed 0–255, stop
- **Board**: init, connected, battery level (%)
- **Sensors**: ultrasonic distance, DHT11/DHT22, DS18B20 on C0–C5
- **IR**: send 32-bit code, read received code, on IR received
- **GPIO**: digital write/read, analog read on C0–C5

Languages: English (default) and German (`_locales/de`). When adding or renaming a
block, update both `_locales/de/dfr1216-strings.json` (block text, keep every `%param`)
and `_locales/de/dfr1216-jsdoc-strings.json` (tooltips).

## Example

```blocks
dfr1216.setLed(DFR1216Led.All, 0x00ff00)
dfr1216.servoAngle(DFR1216Servo.S0, 90)
dfr1216.motorRun(DFR1216Motor.M1, DFR1216MotorDir.Forward, 200)
```

## Use as extension

In https://makecode.microbit.org/ open **Extensions** and paste the GitHub URL of this repository.

## Development

`test.ts` is a hardware smoke test that logs to USB serial (115200 baud).

```sh
npx makecode build          # compile to built/binary.hex
npx makecode build -d       # compile and copy to the MICROBIT drive
tools/flash_and_watch.py 20 # build, flash, print serial for 20 s (needs pyserial)
```

If npm or mkc hang on downloads, prefer IPv4: `NODE_OPTIONS=--dns-result-order=ipv4first`.

## License

MIT, see [LICENSE](LICENSE). The I2C protocol is ported from DFRobot's
MIT-licensed [DFRobot_UnihikerExpansion](https://github.com/dfrobot/DFRobot_UnihikerExpansion)
library; its copyright notice is included in the LICENSE file.

#### Metadata (used for search, rendering)

* for PXT/microbit
