class Creature {
    maxSpeed = 10;
    wanderSpeed = 10;

    coord = [ 100, 100 ];
    wallRadius = 50;
    flockRadius = 20;
    alertRadius = 50;
    view;
    type;
    game;

    velocity = new Pos(0, 10);
    target;
    alpha = 0.2;
    wanderAngle = 0.4;

    constructor(type, view, coord, game) {
        this.type = type;
        this.view = view;
        this.coord = coord;
        this.view.updateCoordinate(this.coord);
        this.game = game;
    }

    die() {
        this.view.elem.remove();
        console.log("I died");
        this.game.remove(this);
    }

    updateCoordinate(newCoord) {
        if (newCoord.x < 0 || newCoord.x > LAND.width || newCoord.y < 0 || newCoord.y > LAND.height) {
            console.log("out");
            this.die();
            return false;
        }

        this.coord = newCoord;
        this.view.updateCoordinate(this.coord);
        return true;
    }

    updateCoordinateRegular() {
        this.getVelocity();
        this.updateCoordinate(this.coord.add(this.velocity));
    }

    avoidCreatures(creaturesNear) {
        let near = creaturesNear.map(c => this.coord.sub(c.coord));

        const res = near.reduce((acc, val) => acc = acc.add(val)).mt(1 / creaturesNear.length);
        return res.cut(this.maxSpeed);
    }

    avoidCliff() {
        let avoidVectors = [];
        // console.log(this.coord, this.wallRadius)

        if (this.coord[ 0 ] <= this.wallRadius) {
            avoidVectors.push([ 1, 0 ]);
        } else if (LAND.width - this.coord[ 0 ] <= this.wallRadius) {
            avoidVectors.push([ -1, 0 ]);
        }

        if (this.coord[ 1 ] <= this.wallRadius) {
            avoidVectors.push([ 0, 1 ]);
        } else if (LAND.height - this.coord[ 1 ] <= this.wallRadius) {
            avoidVectors.push([ 0, -1 ]);
        }

        if (avoidVectors.length === 0) {
            return [ 0, 0 ];
        }

        const sum = avoidVectors.reduce((a, b) => [ a[ 0 ] + b[ 0 ], a[ 1 ] + b[ 1 ] ]);
        return sum;
    }

    wander() {
        const change = 0.2;
        const center = this.velocity.clone().cut(1).mt(16);
        const displacement = new Pos(0, -1).mt(5); // todo

        Creature.setAngle(displacement, this.wanderAngle);
        this.wanderAngle += Math.random() * change - change / 2;
        return center.add(displacement);
    }

    static setAngle(vector, value) {
        const len = vector.innerDist();
        vector.x = Math.cos(value) * len;
        vector.y = Math.sin(value) * len;
    }

    getVelocity() {
        const steering = this.wander();
        this.velocity = this.velocity.mt(1 - this.alpha).add(steering.mt(this.alpha));
    }

    seek(target) {
        const vec = target.sub(this.coord);
        const desired = vec.cut(this.maxSpeed);

        return desired.sub(this.velocity);
    }

    pursuit(c) {
        const T = 3;
        const coord = c.coord.add(c.velocity.mt(T));
        return this.seek(coord);
    }

    align(creaturesNear) {
        let near = creaturesNear.map(c => c.velocity)
            .reduce((acc, val) => acc.add(val))
            .mt(1 / creaturesNear.length);

        return near.cut(this.maxSpeed).sub(this.velocity).cut(this.maxSpeed);
    }

    cohesion(creaturesNear) {
        let near = creaturesNear.map(c => c.coord)
            .reduce((acc, val) => acc.add(val))
            .mt(1 / creaturesNear.length);

        return this.seek(near);
    }

    flock() {
        let near = this.game.inRadius(this, this.flockRadius);
        if (near.length === 0) return new Pos(0, 0);

        const s = this.avoidCreatures(near).mt(1.5);
        const al = this.align(near);
        const c = this.cohesion(near);

        return s.add(al).add(c);
    }
}


class MoverView {
    constructor(query) {
        this.elem = document.querySelector(query);
    }

    elem;

    updateCoordinate(coord) {
        this.elem.style.left = coord.x + "px";
        this.elem.style.bottom = coord.y + "px";
    }
}
