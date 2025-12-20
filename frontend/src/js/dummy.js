import { rutePagi, ruteSore } from './data.js';

class DummyBus {
    constructor(id, route, startIdx) {
        this.id = id;
        this.route = route;
        this.idx = startIdx;
        this.speed = 20 + Math.random() * 15;
        this.gas = 100;
    }

    update() {
        this.idx = (this.idx + 1) % this.route.length;
        const pos = this.route[this.idx];

        this.gas -= 0.1;
        if (this.gas < 10) this.gas = 100;

        return {
            bus_id: this.id,
            latitude: pos[1],
            longitude: pos[0],
            speed: Math.floor(this.speed),
            gas_level: Math.floor(this.gas)
        };
    }
}

export function startDummyBuses(callback) {
    const buses = [
        new DummyBus("DUMMY-01", rutePagi, 0),
        new DummyBus("DUMMY-02", rutePagi, Math.floor(rutePagi.length / 2)),
        new DummyBus("DUMMY-03", ruteSore, 0),
        new DummyBus("DUMMY-04", ruteSore, Math.floor(ruteSore.length / 2)),
    ];

    setInterval(() => {
        buses.forEach(b => {
            callback(b.update());
        });
    }, 1000);
}
