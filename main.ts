/**
 * DFRobot DFR1216 Multi-Function Expansion Board (Power & Motion).
 * The board has its own co-processor, reached over I2C (P19/P20) at 0x33.
 * Register map from https://github.com/dfrobot/DFRobot_UnihikerExpansion
 */

enum DFR1216Led {
    //% block="LED0"
    Led0 = 0,
    //% block="LED1"
    Led1 = 1,
    //% block="all"
    All = 2
}

enum DFR1216Servo {
    //% block="S0"
    S0 = 0,
    //% block="S1"
    S1 = 1,
    //% block="S2"
    S2 = 2,
    //% block="S3"
    S3 = 3,
    //% block="S4"
    S4 = 4,
    //% block="S5"
    S5 = 5
}

enum DFR1216ServoDir {
    //% block="forward"
    Forward = 0,
    //% block="backward"
    Backward = 1
}

enum DFR1216Motor {
    //% block="M1"
    M1 = 0,
    //% block="M2"
    M2 = 1,
    //% block="M3"
    M3 = 2,
    //% block="M4"
    M4 = 3,
    //% block="all"
    All = 4
}

enum DFR1216MotorDir {
    //% block="forward"
    Forward = 0,
    //% block="backward"
    Backward = 1
}

enum DFR1216Pin {
    //% block="C0"
    C0 = 0,
    //% block="C1"
    C1 = 1,
    //% block="C2"
    C2 = 2,
    //% block="C3"
    C3 = 3,
    //% block="C4"
    C4 = 4,
    //% block="C5"
    C5 = 5
}

enum DFR1216Dht {
    //% block="DHT11"
    DHT11 = 1,
    //% block="DHT22"
    DHT22 = 2
}

enum DFR1216DhtValue {
    //% block="temperature (°C)"
    Temperature = 0,
    //% block="humidity (%)"
    Humidity = 1
}

//% color="#e5532d" weight=90 icon="" block="DFR1216"
//% groups='["RGB LED", "Servo", "Motor", "Board", "Sensors", "IR", "GPIO"]'
namespace dfr1216 {
    const ADDR = 0x33

    const REG_MOTOR12_PERIOD = 0x00
    const REG_MOTOR34_PERIOD = 0x02
    const REG_MOTOR1_A_DUTY = 0x04
    const REG_SERVO01_PERIOD = 0x14
    const REG_SERVO25_PERIOD = 0x16
    const REG_SERVO0_DUTY = 0x18
    const REG_IR_SEND = 0x24
    const REG_SR04 = 0x29
    const REG_IO_MODE_C0 = 0x2c
    const REG_IO_WRITE_C0 = 0x39
    const REG_IO_READ_C0 = 0x3f
    const REG_ADC_C0 = 0x45
    const REG_DHT_C0 = 0x57
    const REG_DS18B20_C0 = 0x75
    const REG_BATTERY = 0x87
    const REG_IR_RECEIVE = 0x88
    const REG_WS2812 = 0x90
    const REG_RESET = 0xa0

    const DATA_ENABLE = 0x01
    const MODE_ERROR = 0x02
    const SR04_COLLECT = 0x01
    const SR04_COMPLETE = 0x02
    const RETRY_COUNT = 10

    // IO modes understood by the co-processor
    const IO_ADC = 0
    const IO_DHT11 = 1
    const IO_DHT22 = 2
    const IO_DS18B20 = 3
    const IO_WRITE = 4
    const IO_READ = 5

    const MOTOR_PERIOD = 255

    // State is set up in init(), not by initializers: namespace initializers
    // are not guaranteed to run before the user's top-level code.
    let initialized: boolean
    let connected: boolean
    let ledColors: number[]
    let ledBrightness: number
    let ioModes: number[]
    let irHandlerStarted: boolean

    // single byte write, used to probe the board and to set the read pointer
    function writeByte(value: number): boolean {
        const buf = pins.createBuffer(1)
        buf[0] = value
        return pins.i2cWriteBuffer(ADDR, buf, false) == 0
    }

    function writeReg(reg: number, data: number[]): boolean {
        const buf = pins.createBuffer(data.length + 1)
        buf[0] = reg
        for (let i = 0; i < data.length; i++) buf[i + 1] = data[i] & 0xff
        for (let i = 0; i < RETRY_COUNT; i++) {
            if (pins.i2cWriteBuffer(ADDR, buf, false) == 0) return true
            basic.pause(20)
        }
        return false
    }

    function readReg(reg: number, len: number): Buffer {
        for (let i = 0; i < RETRY_COUNT; i++) {
            if (writeByte(reg)) {
                const buf = pins.i2cReadBuffer(ADDR, len, false)
                if (buf && buf.length == len) return buf
            }
            basic.pause(20)
        }
        return null
    }

    function write16(reg: number, value: number) {
        writeReg(reg, [(value >> 8) & 0xff, value & 0xff])
    }

    function ensureInit() {
        if (!initialized) init()
    }

    function ensureMode(pin: DFR1216Pin, mode: number) {
        ensureInit()
        if (ioModes[pin] == mode) return
        writeReg(REG_IO_MODE_C0 + pin, [mode])
        basic.pause(10)
        ioModes[pin] = mode
    }

    /**
     * Initialise the expansion board. Called automatically by the other blocks;
     * use it at start to check the board is there.
     */
    //% blockId=dfr1216_init block="initialise DFR1216"
    //% group="Board" weight=100
    export function init(): void {
        initialized = true
        ledColors = [0, 0]
        ledBrightness = 125
        ioModes = [-1, -1, -1, -1, -1, -1]
        connected = writeByte(REG_RESET)
        if (!connected) return
        writeReg(REG_RESET, [DATA_ENABLE])
        basic.pause(20)
        // wait for the co-processor to come back after reset
        for (let i = 0; i < 100; i++) {
            if (writeByte(REG_WS2812)) break
            basic.pause(10)
        }
        write16(REG_MOTOR12_PERIOD, MOTOR_PERIOD)
        write16(REG_MOTOR34_PERIOD, MOTOR_PERIOD)
    }

    /**
     * True if the board answered on I2C address 0x33.
     */
    //% blockId=dfr1216_connected block="DFR1216 connected"
    //% group="Board" weight=90
    export function isConnected(): boolean {
        ensureInit()
        return connected
    }

    /**
     * Battery level in percent (0-100) of the 18650 cell.
     */
    //% blockId=dfr1216_battery block="battery level (\\%)"
    //% group="Board" weight=80
    export function batteryLevel(): number {
        ensureInit()
        const buf = readReg(REG_BATTERY, 1)
        return buf ? buf[0] : -1
    }

    // ---------------- RGB LED ----------------

    function sendLeds() {
        ensureInit()
        const a = ledColors[0]
        const b = ledColors[1]
        writeReg(REG_WS2812, [DATA_ENABLE, ledBrightness,
            (a >> 16) & 0xff, (a >> 8) & 0xff, a & 0xff,
            (b >> 16) & 0xff, (b >> 8) & 0xff, b & 0xff])
    }

    /**
     * Set the colour of an on-board RGB LED.
     */
    //% blockId=dfr1216_set_led block="set RGB %led to %color"
    //% color.shadow="colorNumberPicker"
    //% group="RGB LED" weight=100
    export function setLed(led: DFR1216Led, color: number): void {
        ensureInit()
        if (led == DFR1216Led.Led0 || led == DFR1216Led.All) ledColors[0] = color
        if (led == DFR1216Led.Led1 || led == DFR1216Led.All) ledColors[1] = color
        sendLeds()
    }

    /**
     * Set the colour of an RGB LED from red, green and blue values.
     */
    //% blockId=dfr1216_set_led_rgb block="set RGB %led to red %r green %g blue %b"
    //% r.min=0 r.max=255 g.min=0 g.max=255 b.min=0 b.max=255
    //% inlineInputMode=inline
    //% group="RGB LED" weight=90
    export function setLedRgb(led: DFR1216Led, r: number, g: number, b: number): void {
        setLed(led, rgb(r, g, b))
    }

    /**
     * Brightness of both RGB LEDs (0-255).
     */
    //% blockId=dfr1216_set_brightness block="set RGB brightness %brightness"
    //% brightness.min=0 brightness.max=255 brightness.defl=125
    //% group="RGB LED" weight=80
    export function setBrightness(brightness: number): void {
        ensureInit()
        ledBrightness = Math.max(0, Math.min(255, brightness | 0))
        sendLeds()
    }

    /**
     * Turn both RGB LEDs off.
     */
    //% blockId=dfr1216_leds_off block="turn RGB LEDs off"
    //% group="RGB LED" weight=70
    export function ledsOff(): void {
        ensureInit()
        ledColors = [0, 0]
        sendLeds()
    }

    /**
     * Convert red, green and blue (0-255) to a colour number.
     */
    //% blockId=dfr1216_rgb block="red %r green %g blue %b"
    //% r.min=0 r.max=255 g.min=0 g.max=255 b.min=0 b.max=255
    //% group="RGB LED" weight=60
    export function rgb(r: number, g: number, b: number): number {
        return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff)
    }

    // ---------------- Servo ----------------

    /**
     * Turn a 180° servo to an angle.
     */
    //% blockId=dfr1216_servo_angle block="servo %servo angle %angle °"
    //% angle.min=0 angle.max=180 angle.defl=90
    //% group="Servo" weight=100
    export function servoAngle(servo: DFR1216Servo, angle: number): void {
        angle = Math.max(0, Math.min(180, angle | 0))
        servoPulse(servo, 500 + angle * 11)
    }

    /**
     * Run a 360° (continuous) servo at a speed in percent.
     */
    //% blockId=dfr1216_servo360 block="360° servo %servo %dir speed %speed \\%"
    //% speed.min=0 speed.max=100 speed.defl=50
    //% group="Servo" weight=90
    export function servo360(servo: DFR1216Servo, dir: DFR1216ServoDir, speed: number): void {
        speed = Math.max(0, Math.min(100, speed | 0))
        let pulse = 1500
        if (speed > 0) {
            pulse = dir == DFR1216ServoDir.Backward
                ? 1550 + Math.idiv(speed * 9, 2)
                : 1450 - Math.idiv(speed * 9, 2)
        }
        servoPulse(servo, pulse)
    }

    /**
     * Stop a 360° servo.
     */
    //% blockId=dfr1216_servo360_stop block="stop 360° servo %servo"
    //% group="Servo" weight=80
    export function servo360Stop(servo: DFR1216Servo): void {
        servoPulse(servo, 1500)
    }

    /**
     * Send a raw pulse width (µs) to a servo.
     */
    //% blockId=dfr1216_servo_pulse block="servo %servo pulse %micros µs"
    //% micros.min=0 micros.max=3000 micros.defl=1500
    //% group="Servo" weight=70 advanced=true
    export function servoPulse(servo: DFR1216Servo, micros: number): void {
        ensureInit()
        write16(REG_SERVO0_DUTY + servo * 2, Math.max(0, Math.min(0xffff, micros | 0)))
    }

    /**
     * Set the PWM period (µs) of a servo group. S0/S1 and S2-S5 share a period.
     */
    //% blockId=dfr1216_servo_period block="servo group with %servo period %micros µs"
    //% micros.defl=20000
    //% group="Servo" weight=60 advanced=true
    export function servoPeriod(servo: DFR1216Servo, micros: number): void {
        ensureInit()
        write16(servo <= DFR1216Servo.S1 ? REG_SERVO01_PERIOD : REG_SERVO25_PERIOD, micros)
    }

    // ---------------- Motor ----------------

    function motorDuty(motor: number, a: number, b: number) {
        const reg = REG_MOTOR1_A_DUTY + motor * 4
        write16(reg, a)
        write16(reg + 2, b)
    }

    /**
     * Run a DC motor at a speed (0-255).
     */
    //% blockId=dfr1216_motor_run block="motor %motor %dir speed %speed"
    //% speed.min=0 speed.max=255 speed.defl=200
    //% group="Motor" weight=100
    export function motorRun(motor: DFR1216Motor, dir: DFR1216MotorDir, speed: number): void {
        ensureInit()
        speed = Math.max(0, Math.min(MOTOR_PERIOD, speed | 0))
        const a = dir == DFR1216MotorDir.Forward ? speed : 0
        const b = dir == DFR1216MotorDir.Forward ? 0 : speed
        if (motor == DFR1216Motor.All) {
            for (let m = 0; m < 4; m++) motorDuty(m, a, b)
        } else {
            motorDuty(motor, a, b)
        }
    }

    /**
     * Stop a DC motor.
     */
    //% blockId=dfr1216_motor_stop block="stop motor %motor"
    //% group="Motor" weight=90
    export function motorStop(motor: DFR1216Motor): void {
        motorRun(motor, DFR1216MotorDir.Forward, 0)
    }

    // ---------------- Sensors ----------------

    /**
     * Distance measured by an ultrasonic sensor (SR04) on the Trig/Echo port, in cm.
     * Returns -1 if no reading.
     */
    //% blockId=dfr1216_sr04 block="ultrasonic distance (cm)"
    //% group="Sensors" weight=100
    export function ultrasonicDistance(): number {
        ensureInit()
        writeReg(REG_SR04, [SR04_COLLECT])
        basic.pause(30)
        for (let i = 0; i < RETRY_COUNT; i++) {
            const buf = readReg(REG_SR04, 3)
            if (buf && buf[0] == SR04_COMPLETE) return buf.getNumber(NumberFormat.Int16BE, 1)
            basic.pause(30)
        }
        return -1
    }

    /**
     * Read a DHT11/DHT22 sensor on a C pin.
     */
    //% blockId=dfr1216_dht block="%type on %pin %value"
    //% group="Sensors" weight=90
    export function dhtRead(type: DFR1216Dht, pin: DFR1216Pin, value: DFR1216DhtValue): number {
        ensureMode(pin, type == DFR1216Dht.DHT11 ? IO_DHT11 : IO_DHT22)
        const reg = REG_DHT_C0 + pin * 5
        writeReg(reg, [DATA_ENABLE])
        basic.pause(30)
        for (let i = 0; i < RETRY_COUNT; i++) {
            const buf = readReg(reg, 5)
            if (buf && buf[0] == DATA_ENABLE) {
                if (value == DFR1216DhtValue.Humidity) return buf[3] + buf[4] / 100
                const t = (buf[1] & 0x7f) + buf[2] / 100
                return buf[1] & 0x80 ? -t : t
            }
            if (buf && buf[0] == MODE_ERROR) return NaN
            basic.pause(30)
        }
        return NaN
    }

    /**
     * Temperature (°C) from a DS18B20 sensor on a C pin.
     */
    //% blockId=dfr1216_ds18b20 block="DS18B20 temperature (°C) on %pin"
    //% group="Sensors" weight=80
    export function ds18b20Temperature(pin: DFR1216Pin): number {
        ensureMode(pin, IO_DS18B20)
        const reg = REG_DS18B20_C0 + pin * 3
        writeReg(reg, [DATA_ENABLE])
        basic.pause(50)
        for (let i = 0; i < RETRY_COUNT; i++) {
            const buf = readReg(reg, 3)
            if (buf && buf[0] == DATA_ENABLE) {
                if (buf[1] == 0xff && buf[2] == 0xff) return NaN
                const t = ((buf[1] & 0x7f) * 256 + buf[2]) / 16
                return buf[1] & 0x80 ? -t : t
            }
            if (buf && buf[0] == MODE_ERROR) return NaN
            basic.pause(30)
        }
        return NaN
    }

    // ---------------- IR ----------------

    /**
     * Send a 32-bit code with the on-board IR emitter.
     */
    //% blockId=dfr1216_ir_send block="IR send %code"
    //% group="IR" weight=100
    export function irSend(code: number): void {
        ensureInit()
        writeReg(REG_IR_SEND, [DATA_ENABLE, (code >> 24) & 0xff, (code >> 16) & 0xff, (code >> 8) & 0xff, code & 0xff])
    }

    /**
     * Last code received by the on-board IR receiver, or 0 if none.
     */
    //% blockId=dfr1216_ir_read block="IR received code"
    //% group="IR" weight=90
    export function irRead(): number {
        ensureInit()
        const buf = readReg(REG_IR_RECEIVE, 5)
        if (!buf || buf[0] != DATA_ENABLE) return 0
        // unsigned 32-bit, avoid sign issues of << 24
        return buf[1] * 16777216 + buf[2] * 65536 + buf[3] * 256 + buf[4]
    }

    /**
     * Run code when the IR receiver gets a code.
     */
    //% blockId=dfr1216_on_ir block="on IR received"
    //% draggableParameters="reporter"
    //% group="IR" weight=80
    export function onIrReceived(handler: (code: number) => void): void {
        if (irHandlerStarted) return
        irHandlerStarted = true
        control.inBackground(() => {
            while (true) {
                const code = irRead()
                if (code != 0) handler(code)
                basic.pause(50)
            }
        })
    }

    // ---------------- GPIO ----------------

    /**
     * Write a digital value to a C pin.
     */
    //% blockId=dfr1216_digital_write block="digital write %pin to %value"
    //% value.min=0 value.max=1
    //% group="GPIO" weight=100
    export function digitalWrite(pin: DFR1216Pin, value: number): void {
        ensureMode(pin, IO_WRITE)
        writeReg(REG_IO_WRITE_C0 + pin, [value ? 1 : 0])
        basic.pause(10)
    }

    /**
     * Read a digital value (0 or 1) from a C pin.
     */
    //% blockId=dfr1216_digital_read block="digital read %pin"
    //% group="GPIO" weight=90
    export function digitalRead(pin: DFR1216Pin): number {
        ensureMode(pin, IO_READ)
        const buf = readReg(REG_IO_READ_C0 + pin, 1)
        return buf ? buf[0] : -1
    }

    /**
     * Read an analog value (0-4095) from a C pin.
     */
    //% blockId=dfr1216_analog_read block="analog read %pin"
    //% group="GPIO" weight=80
    export function analogRead(pin: DFR1216Pin): number {
        ensureMode(pin, IO_ADC)
        for (let i = 0; i < RETRY_COUNT; i++) {
            const buf = readReg(REG_ADC_C0 + pin * 3, 3)
            if (buf && buf[0] == DATA_ENABLE) {
                const v = buf[1] * 256 + buf[2]
                if (v > 3900) return 4095
                if (v < 40) return 0
                return v
            }
            if (buf && buf[0] == MODE_ERROR) return -1
            basic.pause(20)
        }
        return -1
    }
}
