// Hardware smoke test: flash, then watch USB serial (115200).
// Runs 2 s after start (so the serial watcher can attach) and again on button A.
function runTest() {
    serial.writeLine("DFR1216 test start")
    dfr1216.init()
    serial.writeLine("connected: " + dfr1216.isConnected())
    if (!dfr1216.isConnected()) {
        basic.showIcon(IconNames.No)
        let found = ""
        const probe = pins.createBuffer(1)
        for (let a = 0x08; a < 0x78; a++) {
            if (pins.i2cWriteBuffer(a, probe, false) == 0) found += " " + a
        }
        serial.writeLine("i2c scan (decimal):" + (found || " nothing"))
        return
    }
    basic.showIcon(IconNames.Yes)
    serial.writeLine("battery: " + dfr1216.batteryLevel() + "%")

    const colors = [0xff0000, 0x00ff00, 0x0000ff]
    for (const c of colors) {
        serial.writeLine("LED all " + c)
        dfr1216.setLed(DFR1216Led.All, c)
        basic.pause(700)
    }
    serial.writeLine("LED0 red, LED1 blue")
    dfr1216.setLed(DFR1216Led.Led0, 0xff0000)
    dfr1216.setLed(DFR1216Led.Led1, 0x0000ff)
    basic.pause(1000)
    for (const b of [20, 255, 125]) {
        serial.writeLine("brightness " + b)
        dfr1216.setBrightness(b)
        basic.pause(700)
    }

    for (const a of [0, 90, 180, 90]) {
        serial.writeLine("S0 angle " + a)
        dfr1216.servoAngle(DFR1216Servo.S0, a)
        basic.pause(1000)
    }
    dfr1216.ledsOff()
    serial.writeLine("DFR1216 test done")
}

input.onButtonPressed(Button.A, runTest)
basic.pause(2000)
runTest()
