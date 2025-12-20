import { rutePagi, ruteSore } from './data.js';

class DummyBus {
    constructor(id, route, startIdx) {
        this.id = id;
        this.route = route;
        this.idx = startIdx;
        this.speed = 10 + Math.random() * 15;
        this.gas = 100;
    }

    update() {
        this.idx = (this.idx + 1) % this.route.length;
        const pos = this.route[this.idx];

        this.gas -= 0.05;
        if (this.gas < 10) this.gas = 100;

        let currentSpeed = this.speed + (Math.random() * 5 - 2.5);
        if (currentSpeed < 5) currentSpeed = 5;

        return {
            bus_id: this.id,
            latitude: pos[1],
            longitude: pos[0],
            speed: Math.floor(currentSpeed),
            gas_level: Math.floor(this.gas)
        };
    }
}

export function startDummyBuses(callback) {
    const buses = [
        new DummyBus("Dummy-01", rutePagi, 0),
        new DummyBus("Dummy-02", ruteSore, 50),
    ];

    setInterval(() => {
        buses.forEach(b => {
            callback(b.update());
        });
    }, 2500);
}
