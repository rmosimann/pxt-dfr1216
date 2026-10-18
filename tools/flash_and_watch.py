#!/usr/bin/env python3
"""Fast test loop: build with mkc, copy hex to the MICROBIT drive, print USB serial.

usage: tools/flash_and_watch.py [seconds] [--no-build]
Needs `makecode` (mkc) on PATH or MKC env var, and pyserial.
"""
import glob
import os
import shutil
import subprocess
import sys
import time

import serial

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HEX = os.path.join(ROOT, "built", "binary.hex")


def find_drive():
    for d in glob.glob("/media/*/MICROBIT") + glob.glob("/run/media/*/MICROBIT") + ["/Volumes/MICROBIT"]:
        if os.path.isdir(d):
            return d
    sys.exit("MICROBIT drive not found")


def find_port():
    ports = sorted(glob.glob("/dev/ttyACM*")) + sorted(glob.glob("/dev/cu.usbmodem*"))
    if not ports:
        sys.exit("micro:bit serial port not found")
    return ports[0]


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    seconds = float(args[0]) if args else 20

    if "--no-build" not in sys.argv:
        mkc = os.environ.get("MKC", "mkc")
        env = dict(os.environ, NODE_OPTIONS="--dns-result-order=ipv4first")
        subprocess.run([mkc, "build"], cwd=ROOT, env=env, check=True)

    drive = find_drive()
    print(f"flashing {HEX} -> {drive}", flush=True)
    shutil.copy(HEX, drive)
    # the drive unmounts/remounts while the interface chip flashes and the
    # serial port re-enumerates; keep (re)opening it so no output is lost
    time.sleep(2)
    print(f"--- serial for {seconds:.0f}s ---", flush=True)
    end = time.time() + seconds
    while time.time() < end:
        try:
            with serial.Serial(find_port(), 115200, timeout=0.5) as s:
                while time.time() < end:
                    line = s.readline()
                    if line:
                        print(line.decode(errors="replace").rstrip(), flush=True)
        except (serial.SerialException, OSError, SystemExit):
            time.sleep(0.2)

if __name__ == "__main__":
    main()
