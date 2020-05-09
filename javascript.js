/// <reference path="web-bluetooth-typings/web-bluetooth.d.ts" />

(() => {
  'use strict';

  // VORZE SA Series
  const SA_SERVICE_UUID = '40ee1111-63ec-4b7f-8ce7-712efd55b90e';
  const SA_CHARACTERISTIC_UUID = '40ee2222-63ec-4b7f-8ce7-712efd55b90e';
  const SA_DEVICE_ID_BYTE = {
    CycSA: 0x01,
    UFOSA: 0x02,
  };

  async function selectSa() {
    const device = await navigator.bluetooth.requestDevice({
      filters: [
        { services: [SA_SERVICE_UUID] }
      ]
    });
    return device;
  }

  /**
   * @param {BluetoothDevice} device
   */
  async function connectSa(device) {
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(SA_SERVICE_UUID);
    const characteristic = await service.getCharacteristic(SA_CHARACTERISTIC_UUID);
    return characteristic;
  }

  /** @type {Object<string, Promise<void>} */
  const lastPromise = {};
  /**
   * @param {BluetoothRemoteGATTCharacteristic} characteristic
   * @param {0|1} direction 0:clockwise, 1:counterclockwise
   * @param {Number} speed 0~100
   */
  async function setSpeedSa(characteristic, direction, speed) {
    const device = characteristic.service.device;
    const idByte = SA_DEVICE_ID_BYTE[device.name];
    const directionAndSpeed = (direction << 7) | speed;
    const value = new Uint8Array([idByte, 0x01, directionAndSpeed]);

    const prevPromise = lastPromise[device.id] || Promise.resolve();
    const currentPromise = (async () => {
      // await previous promise (ignore error)
      // because can't writeValue if already in progress
      await prevPromise.catch(() => { });

      if (lastPromise[device.id] !== currentPromise) {
        // skip to next promise
        return;
      }

      // write latest value
      await characteristic.writeValue(value);
    })();
    lastPromise[device.id] = currentPromise;
    await currentPromise;
  }

  /** @type {BluetoothRemoteGATTCharacteristic} */
  let characteristic;

  const deviceName = document.querySelector('#deviceName');
  const progress = document.querySelector('progress');
  /** @type {HTMLDivElement} */
  const controller = document.querySelector('#controller');

  /** @type {HTMLButtonElement} */
  const connectButton = document.querySelector('#connect');
  connectButton.addEventListener('click', async () => {
    try {
      const device = await selectSa();

      connectButton.style.display = 'none';
      deviceName.textContent = device.name;

      progress.hidden = false;
      characteristic = await connectSa(device);

      controller.hidden = false;

      device.addEventListener('gattserverdisconnected', onDisconnect);
    } catch (error) {
      console.error(error);
      alert(error.message);
      connectButton.style.display = 'block';
      deviceName.textContent = '';
    } finally {
      progress.hidden = true;
    }
  });
  function onDisconnect() {
    alert('disconnected');
    connectButton.style.display = 'block';
    deviceName.textContent = '';
    controller.hidden = true;
  }

  /** @type {HTMLInputElement} */
  const inputDirection = document.querySelector('#direction');
  inputDirection.addEventListener('input', onInputSpeed);

  /** @type {HTMLInputElement} */
  const inputSpeed = document.querySelector('#speed');
  inputSpeed.addEventListener('input', onInputSpeed);

  async function onInputSpeed() {
    const direction = inputDirection.checked ? 1 : 0;
    const speed = inputSpeed.valueAsNumber;
    await setSpeedSa(characteristic, direction, speed);
  }

})();

/* This program is free software. It comes without any warranty, to
 * the extent permitted by applicable law. You can redistribute it
 * and/or modify it under the terms of the Do What The Fuck You Want
 * To Public License, Version 2, as published by Sam Hocevar. See
 * http://www.wtfpl.net/ for more details. */
